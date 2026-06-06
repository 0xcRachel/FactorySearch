import React, { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchBar } from '../components/search/SearchBar';
import { FilterPanel } from '../components/search/FilterPanel';
import { QuestionCard } from '../components/result/QuestionCard';
import { QuestionDetailModal } from '../components/result/QuestionDetailModal';
import { SkeletonList } from '../components/common/SkeletonCard';
import { useSearchStore, useSettingsStore } from '../store';
import { DriverFactory } from '../drivers/DriverFactory';
import type { Question } from '../types';
import { useOnboarding } from '../components/onboarding/useOnboarding';
import { SearchX, Loader2, BookOpenCheck, Zap } from 'lucide-react';

const PAGE_SIZE = 20;

export const SearchPage: React.FC = () => {
  const { searchQuery, filters } = useSearchStore();
  const { activeDriver } = useSettingsStore();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  useOnboarding();

  const driver = DriverFactory.getDriver(activeDriver);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['search', searchQuery, filters, activeDriver],
    queryFn: ({ pageParam = 1 }) =>
      driver.searchQuestions(searchQuery, filters, pageParam as number, PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.reduce((acc, p) => acc + p.questions.length, 0);
      return fetched < lastPage.total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
  });

  const allQuestions = data?.pages.flatMap(p => p.questions) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const searchTime = data?.pages[data.pages.length - 1]?.timeMs ?? 0;

  // Infinite scroll: load on scroll near bottom
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Hero Search Section */}
      <section className="bg-bg-page border-b border-border-line py-10 sm:py-14 px-4 transition-colors duration-300">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-text-main mb-3 leading-tight">
            Tra cứu đáp án
          </h1>
          <p className="text-text-muted text-base">
            Tìm kiếm tức thì từ cơ sở dữ liệu câu hỏi — hoạt động hoàn toàn offline.
          </p>
        </div>

        <SearchBar />
        <FilterPanel />
      </section>

      {/* Results Section */}
      <section className="max-w-3xl mx-auto px-4 py-6">

        {/* Stats Bar */}
        {!isLoading && !isError && (searchQuery || Object.values(filters).some(Boolean)) && (
          <div className="flex items-center justify-between mb-5 text-sm text-text-subtle">
            <div className="flex items-center gap-1.5">
              <BookOpenCheck size={15} className="text-brand" />
              <span>
                Tìm thấy <strong className="text-text-main">{total.toLocaleString()}</strong> kết quả
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-subtle">
              <Zap size={12} className="text-amber-500" />
              <span>{searchTime.toFixed(1)}ms</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <SkeletonList count={6} />}

        {/* Error State */}
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

        {/* Empty State */}
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
                : 'Nhập từ khóa vào ô tìm kiếm ở trên để tra cứu đáp án câu hỏi.'}
            </p>
          </div>
        )}

        {/* Question Cards */}
        <div className="space-y-3" id="results-list">
          {allQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              <QuestionCard
                question={q}
                searchQuery={searchQuery}
                onSelect={() => setSelectedQuestion(q)}
              />
            </div>
          ))}
        </div>

        {/* Load More Indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="text-brand animate-spin" />
          </div>
        )}

        {/* End of Results */}
        {!hasNextPage && allQuestions.length > 0 && !isFetchingNextPage && (
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
