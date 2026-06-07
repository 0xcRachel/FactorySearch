import React, { useRef, useState } from 'react';
import {
  Settings, Moon, Sun, Database, Upload, Download,
  Trash2, RotateCcw, HelpCircle, CheckCircle, ChevronRight,
  AlertTriangle, Server
} from 'lucide-react';
import { useSettingsStore, useSearchStore } from '../store';
import { DriverFactory } from '../drivers/DriverFactory';
import type { DriverType } from '../drivers/DriverFactory';
import { useToast } from '../components/common/Toast';
import { useOnboarding } from '../components/onboarding/useOnboarding';

const DRIVER_OPTIONS: { value: DriverType; label: string; description: string }[] = [
  { value: 'json', label: 'JSON (Bộ nhớ cục bộ)', description: 'Hoạt động offline 100%, siêu nhẹ, tối ưu mọi thiết bị' },
  { value: 'sqlite', label: 'SQLite (WebAssembly)', description: 'Tốc độ cao, FTS5, hoàn toàn offline' },
  { value: 'indexeddb', label: 'IndexedDB', description: 'Fallback thuần trình duyệt' },
  { value: 'mock', label: 'Mock Data', description: 'Dữ liệu mẫu tĩnh cho kiểm thử' },
  { value: 'api', label: 'REST API (Demo)', description: 'Giả lập kết nối API server' },
];

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, activeDriver, setActiveDriver, hasSeenOnboarding, setHasSeenOnboarding, dbSize, dbFileName, dbLastUpdated, setDbInfo } = useSettingsStore();
  const { clearSearchHistory } = useSearchStore();
  const { addToast } = useToast();
  const { startTour } = useOnboarding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);

  /* ---- IMPORT ---- */
  const handleImportDb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setProgress({ percent: 0, message: 'Đang bắt đầu import...' });
    try {
      const buffer = await file.arrayBuffer();
      const driver = DriverFactory.getDriver(activeDriver);
      driver.onProgress = (percent, message) => setProgress({ percent, message });

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        const questions = Array.isArray(data) ? data : data.questions;
        if (!Array.isArray(questions)) throw new Error('File JSON không hợp lệ. Phải là mảng câu hỏi.');
        await driver.importQuestionsFromJson?.(questions);
        setDbInfo(null, file.name, new Date().toISOString());
        addToast(`Đã nhập ${questions.length} câu hỏi từ JSON.`, 'success');
      } else if (file.name.endsWith('.db')) {
        await driver.importDatabase?.(buffer);
        setDbInfo(file.size, file.name, new Date().toISOString());
        addToast('Đã nhập database SQLite thành công!', 'success');
      } else {
        addToast('Chỉ hỗ trợ tệp .db hoặc .json', 'error');
      }
    } catch (err: any) {
      addToast(`Lỗi nhập: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ---- EXPORT ---- */
  const handleExportDb = async () => {
    setIsExporting(true);
    try {
      const driver = DriverFactory.getDriver(activeDriver);
      const buffer = await driver.exportDatabase?.();
      if (!buffer) throw new Error('Driver này không hỗ trợ xuất database.');

      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = activeDriver === 'json' ? 'json' : 'db';
      a.download = `factorysearch-backup-${new Date().toISOString().slice(0, 10)}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Đã xuất database thành công!', 'success');
    } catch (err: any) {
      addToast(`Lỗi xuất: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /* ---- CLEAR DB ---- */
  const handleClearDb = async () => {
    if (!window.confirm('Bạn chắc chắn muốn khôi phục dữ liệu gốc? Hành động này sẽ xóa toàn bộ thay đổi và nạp lại từ đầu.')) return;
    setIsClearing(true);
    setProgress({ percent: 0, message: 'Chuẩn bị khởi tạo...' });
    try {
      const driver = DriverFactory.getDriver(activeDriver);
      driver.onProgress = (percent, message) => setProgress({ percent, message });
      await driver.clearDatabase?.();
      setDbInfo(null, null, null);
      addToast('Đã khôi phục dữ liệu hệ thống!', 'success');
    } catch (err: any) {
      addToast(`Lỗi khôi phục: ${err.message}`, 'error');
    } finally {
      setIsClearing(false);
      setProgress(null);
    }
  };

  const handleRestartTour = () => {
    setHasSeenOnboarding(false);
    addToast('Đang khởi động lại hướng dẫn...', 'info');
    setTimeout(() => startTour(), 400);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <section className="bg-bg-page border-b border-border-line py-10 px-4 transition-colors">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-bg-interactive">
              <Settings size={22} className="text-text-main" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">Cài đặt</h1>
          </div>
          <p className="text-text-muted text-sm ml-1">Quản lý giao diện, dữ liệu và tùy chọn hệ thống.</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* --- Appearance --- */}
        <div className="bg-bg-card border border-border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border-line bg-bg-interactive/40">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest">Giao diện</h2>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-text-main text-sm">Chế độ {theme === 'light' ? 'Sáng' : 'Tối'}</p>
              <p className="text-xs text-text-subtle mt-0.5">Chuyển đổi giữa giao diện sáng và tối</p>
            </div>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`relative flex items-center w-12 h-6 rounded-full transition-colors duration-300 border ${
                theme === 'dark'
                  ? 'bg-brand border-brand'
                  : 'bg-bg-interactive border-border-strong'
              }`}
            >
              <span className={`absolute left-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}>
                {theme === 'dark' ? <Moon size={10} className="text-brand" /> : <Sun size={10} className="text-amber-500" />}
              </span>
            </button>
          </div>
        </div>

        {/* --- Driver Selection --- */}
        <div className="bg-bg-card border border-border-line rounded-xl overflow-hidden" id="driver-selector">
          <div className="px-5 py-3 border-b border-border-line bg-bg-interactive/40">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest">Nguồn dữ liệu</h2>
          </div>
          <div className="p-3 space-y-1">
            {DRIVER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveDriver(opt.value)}
                className={`w-full flex items-center justify-between p-3.5 rounded-lg text-left transition-colors ${
                  activeDriver === opt.value
                    ? 'bg-brand/5 border border-brand/20'
                    : 'hover:bg-bg-interactive/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Server size={16} className={activeDriver === opt.value ? 'text-brand' : 'text-text-subtle'} />
                  <div>
                    <p className={`text-sm font-semibold ${activeDriver === opt.value ? 'text-brand' : 'text-text-main'}`}>{opt.label}</p>
                    <p className="text-xs text-text-subtle">{opt.description}</p>
                  </div>
                </div>
                {activeDriver === opt.value && <CheckCircle size={16} className="text-brand shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* --- Database Management --- */}
        <div className="bg-bg-card border border-border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border-line bg-bg-interactive/40">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest">Quản lý Database</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* DB Info */}
            <div className="p-4 bg-bg-page/70 border border-border-line rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-brand" />
                <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">Thông tin database hiện tại</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-text-subtle">Tệp tin</p>
                  <p className="font-medium text-text-main truncate">{dbFileName || 'Database mặc định'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-subtle">Kích thước</p>
                  <p className="font-medium text-text-main">{formatBytes(dbSize)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-text-subtle">Cập nhật lần cuối</p>
                  <p className="font-medium text-text-main">
                    {dbLastUpdated ? new Date(dbLastUpdated).toLocaleString('vi-VN') : 'Tự động'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".db,.json"
              onChange={handleImportDb}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-interactive border border-border-strong text-text-main text-sm font-semibold rounded-xl hover:bg-border-strong transition-colors disabled:opacity-50"
              >
                <Upload size={16} className={isImporting ? 'animate-bounce' : ''} />
                {isImporting ? 'Đang nhập...' : 'Import (.db / .json)'}
              </button>

              <button
                onClick={handleExportDb}
                disabled={isExporting || (activeDriver !== 'sqlite' && activeDriver !== 'json')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-interactive border border-border-strong text-text-main text-sm font-semibold rounded-xl hover:bg-border-strong transition-colors disabled:opacity-50"
              >
                <Download size={16} className={isExporting ? 'animate-bounce' : ''} />
                {isExporting ? 'Đang xuất...' : 'Tải xuống / Backup'}
              </button>
            </div>

            <button
              onClick={handleClearDb}
              disabled={isClearing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-500/30 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isClearing ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu'}
            </button>
          </div>
        </div>

        {/* --- Search & History --- */}
        <div className="bg-bg-card border border-border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border-line bg-bg-interactive/40">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest">Lịch sử tìm kiếm</h2>
          </div>
          <div className="p-5">
            <button
              onClick={() => { clearSearchHistory(); addToast('Đã xóa lịch sử tìm kiếm.', 'success'); }}
              className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
            >
              <RotateCcw size={15} />
              Xóa lịch sử tìm kiếm
            </button>
          </div>
        </div>

        {/* --- Help --- */}
        <div className="bg-bg-card border border-border-line rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border-line bg-bg-interactive/40">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest">Trợ giúp</h2>
          </div>
          <div className="p-5">
            <button
              onClick={handleRestartTour}
              className="flex items-center justify-between w-full text-sm font-medium text-text-main hover:text-brand transition-colors group"
            >
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-text-muted group-hover:text-brand" />
                Chạy lại hướng dẫn sử dụng
              </div>
              <ChevronRight size={16} className="text-text-subtle group-hover:text-brand" />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">
            Dữ liệu được lưu trong IndexedDB của trình duyệt. Xóa cache trình duyệt sẽ làm mất database. 
            Hãy backup định kỳ bằng nút <strong className="text-text-main">Backup (.db)</strong>.
          </p>
        </div>
      </div>

      {/* Progress Modal Overlay */}
      {progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mb-4 relative">
              <svg className="animate-spin w-full h-full text-brand" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text-main mb-1">Hệ thống đang xử lý</h3>
            <p className="text-sm text-text-muted mb-5 min-h-[40px] flex items-center justify-center">
              {progress.message}
            </p>
            
            <div className="w-full bg-bg-interactive rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-brand h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs font-bold text-brand">
              {progress.percent}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsPage;
