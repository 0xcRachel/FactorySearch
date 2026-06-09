import React, { useState, useEffect } from 'react';
import { X, Heart, Copy, Check, BookOpen, Calendar, HelpCircle } from 'lucide-react';
import type { Question } from '../../types';
import { useSettingsStore } from '../../store';
import { DriverFactory } from '../../drivers/DriverFactory';

interface QuestionDetailModalProps {
  question: Question;
  onClose: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({ question, onClose }) => {
  const { activeDriver } = useSettingsStore();
  const [isFav, setIsFav] = useState(false);
  const [copied, setCopied] = useState(false);

  const driver = DriverFactory.getDriver(activeDriver);

  // Load favorite status
  useEffect(() => {
    let active = true;
    const checkFav = async () => {
      try {
        const result = await driver.isFavorite(question.id);
        if (active) setIsFav(result);
      } catch (err) {
        console.error(err);
      }
    };
    checkFav();
    return () => {
      active = false;
    };
  }, [question.id, driver]);

  const toggleFavorite = async () => {
    try {
      if (isFav) {
        await driver.removeFavorite(question.id);
        setIsFav(false);
      } else {
        await driver.addFavorite(question);
        setIsFav(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    const textToCopy = `Môn học: ${question.subject}\nDanh mục: ${question.chapter}\n\nCâu hỏi:\n${question.question}\n\nĐáp án:\n${question.answer}\n\nLời giải chi tiết:\n${question.explanation || 'Chưa có lời giải chi tiết.'}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-near-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in" id="question-detail-modal">
      {/* Modal Box */}
      <div className="w-full max-w-2xl bg-bg-card border border-border-strong rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden select-text">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-line">
          <div className="flex items-center gap-1.5 text-xs text-text-subtle font-semibold">
            <HelpCircle size={14} />
            <span>Chi tiết câu hỏi #{question.id}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFavorite}
              className={`p-2 rounded-lg hover:bg-bg-interactive transition-colors ${
                isFav ? 'text-brand' : 'text-text-subtle hover:text-text-main'
              }`}
              title={isFav ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>
            
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-bg-interactive text-text-subtle hover:text-text-main transition-colors"
              title="Sao chép nội dung"
            >
              {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-interactive text-text-subtle hover:text-text-main transition-colors"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand/5 px-2.5 py-1 rounded border border-brand/10 uppercase tracking-wider">
              <BookOpen size={12} />
              {question.subject}
            </span>
            <span className="text-xs text-text-muted bg-bg-interactive px-2.5 py-1 rounded border border-border-line font-medium">
              {question.chapter}
            </span>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Câu hỏi:</h4>
            <div className="font-serif text-lg font-medium leading-relaxed text-text-main">
              {question.question}
            </div>
          </div>

          {/* Answer Box */}
          <div className="p-4 bg-brand/5 border border-brand/15 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Đáp án chính xác:</h4>
            <div className="font-serif text-base font-semibold text-text-main">
              {question.answer}
            </div>
          </div>

          {/* Explanation */}
          {question.explanation && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Lời giải chi tiết:</h4>
              <div className="text-sm text-text-muted leading-relaxed whitespace-pre-line bg-bg-page/50 p-4 border border-border-line rounded-xl">
                {question.explanation}
              </div>
            </div>
          )}

          {/* Tags list */}
          {question.tags && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-line">
              {question.tags.split(',').map(tag => (
                <span key={tag} className="text-xs bg-bg-interactive/60 text-text-muted px-2.5 py-1 rounded-md font-medium">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-line bg-bg-page/40">
          <div className="flex items-center gap-1 text-3xs text-text-subtle">
            <Calendar size={10} />
            <span>Ngày tạo: {question.created_at ? new Date(question.created_at).toLocaleDateString('vi-VN') : 'Mới đây'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-bg-interactive text-text-main border border-ring-border hover:bg-border-strong rounded-lg transition-colors duration-150"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
export default QuestionDetailModal;
