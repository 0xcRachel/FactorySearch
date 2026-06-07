import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchBar } from '../components/search/SearchBar';
import { FilterPanel } from '../components/search/FilterPanel';
import { QuestionCard } from '../components/result/QuestionCard';
import { QuestionDetailModal } from '../components/result/QuestionDetailModal';
import { SkeletonList } from '../components/common/SkeletonCard';
import { useSearchStore, useSettingsStore } from '../store';
import { DriverFactory } from '../drivers/DriverFactory';
import type { Question } from '../types';
import { useOnboarding } from '../components/onboarding/useOnboarding';
import {
  SearchX, BookOpenCheck, Zap,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

const PAGE_SIZE = 5;

export const SearchPage: React.FC = () => {
  const { searchQuery, filters } = useSearchStore();
  const { activeDriver } = useSettingsStore();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useOnboarding();

  const driver = DriverFactory.getDriver(activeDriver);

  // Reset to page 1 whenever query or filters change
  const queryKey = JSON.stringify({ searchQuery, filters, activeDriver });
  const prevKeyRef = React.useRef(queryKey);
  if (prevKeyRef.current !== queryKey) {
    prevKeyRef.current = queryKey;
    if (currentPage !== 1) setCurrentPage(1);
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', searchQuery, filters, activeDriver, currentPage],
    queryFn: () => driver.searchQuestions(searchQuery, filters, currentPage, PAGE_SIZE),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev, // keep previous data while loading new page
  });

  const allQuestions = data?.questions ?? [];
  const total = data?.total ?? 0;
  const searchTime = data?.timeMs ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    // Scroll results into view smoothly
    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Build compact page number list: [1 ... 4 5 6 ... 20]
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Search Section */}
      <section className="bg-bg-page border-b border-border-line py-6 sm:py-12 px-4 transition-colors duration-300">
        <div className="max-w-2xl mx-auto text-center mb-6">
          <h1 className="font-serif text-2xl sm:text-4xl font-medium text-text-main mb-2 leading-tight">
            Tra cứu đáp án
          </h1>
          <p className="text-text-muted text-sm sm:text-base">
            Tìm kiếm tức thì — hoạt động hoàn toàn offline.
          </p>
        </div>

        <SearchBar />
        <FilterPanel />
      </section>

      {/* Results Section */}
      <section id="results-section" className="max-w-3xl mx-auto px-4 py-6">

        {/* Stats Bar */}
        {!isLoading && !isError && (searchQuery || Object.values(filters).some(Boolean)) && (
          <div className="flex items-center justify-between mb-5 text-sm text-text-subtle">
            <div className="flex items-center gap-1.5">
              <BookOpenCheck size={15} className="text-brand" />
              <span>
                Tìm thấy <strong className="text-text-main">{total.toLocaleString()}</strong> kết quả
                {totalPages > 1 && (
                  <span className="text-text-subtle font-normal">
                    {' '}— trang {currentPage}/{totalPages}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-subtle">
              <Zap size={12} className="text-amber-500" />
              <span>{searchTime.toFixed(1)}ms</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && <SkeletonList count={PAGE_SIZE} />}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-4">
              <SearchX size={28} className="text-red-400" />
            </div>
            <h3 className="font-serif text-lg font-medium text-text-main mb-2">Không thể tải dữ liệu</h3>
            <p className="text-sm text-text-muted max-w-sm">
              {(error as Error)?.message || 'Đã xảy ra lỗi khi tìm kiếm. Thử lại sau.'}
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && allQuestions.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="p-5 rounded-full bg-bg-interactive mb-5">
              <SearchX size={32} className="text-text-subtle" />
            </div>
            <h3 className="font-serif text-xl font-medium text-text-main mb-2">
              {searchQuery ? 'Không tìm thấy kết quả' : 'Bắt đầu tra cứu'}
            </h3>
            <p className="text-sm text-text-muted max-w-xs">
              {searchQuery
                ? `Không có câu hỏi nào khớp với "${searchQuery}". Thử từ khóa khác hoặc bỏ bộ lọc.`
                : 'Nhập từ khóa vào ô tìm kiếm ở trên để tra cứu đáp án.'}
            </p>
          </div>
        )}

        {/* Question Cards */}
        <div className="space-y-3" id="results-list">
          {allQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <QuestionCard
                question={q}
                searchQuery={searchQuery}
                onSelect={() => setSelectedQuestion(q)}
              />
            </div>
          ))}
        </div>

        {/* ── Pagination ──────────────────────────────────────── */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            {/* Page info */}
            <p className="text-xs text-text-subtle">
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} trong {total.toLocaleString()} câu hỏi
            </p>

            {/* Controls */}
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                onClick={() => goTo(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border-line text-text-muted hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ transition: 'all 0.15s' }}
                title="Trang đầu"
              >
                <ChevronsLeft size={15} />
              </button>

              {/* Prev */}
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border-line text-text-muted hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ transition: 'all 0.15s' }}
                title="Trang trước"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page numbers */}
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="w-9 text-center text-text-subtle text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p as number)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      currentPage === p
                        ? 'bg-brand text-parchment border-brand'
                        : 'border-border-line text-text-muted hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border-line text-text-muted hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ transition: 'all 0.15s' }}
                title="Trang sau"
              >
                <ChevronRight size={15} />
              </button>

              {/* Last */}
              <button
                onClick={() => goTo(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border-line text-text-muted hover:border-brand/40 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ transition: 'all 0.15s' }}
                title="Trang cuối"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* End message when only 1 page */}
        {!isLoading && !isError && totalPages <= 1 && allQuestions.length > 0 && (
          <div className="text-center text-xs text-text-subtle py-8 border-t border-border-line mt-6">
            Đã hiển thị tất cả {total.toLocaleString()} kết quả
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
};
export default SearchPage;
