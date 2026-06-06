import React, { useState, useEffect } from 'react';
import { Heart, Trash2, SearchX } from 'lucide-react';
import type { Question } from '../types';
import { QuestionCard } from '../components/result/QuestionCard';
import { QuestionDetailModal } from '../components/result/QuestionDetailModal';
import { useSettingsStore } from '../store';
import { DriverFactory } from '../drivers/DriverFactory';

export const FavoritesPage: React.FC = () => {
  const { activeDriver } = useSettingsStore();
  const [favorites, setFavorites] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const driver = DriverFactory.getDriver(activeDriver);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const favs = await driver.getFavorites();
      setFavorites(favs);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [activeDriver]);

  const handleRemoveFavorite = async (id: number) => {
    try {
      await driver.removeFavorite(id);
      setFavorites(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <section className="bg-bg-page border-b border-border-line py-10 px-4 transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-brand/10">
              <Heart size={22} className="text-brand" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
              Câu hỏi yêu thích
            </h1>
          </div>
          <p className="text-text-muted text-sm ml-1">
            {favorites.length > 0
              ? `${favorites.length} câu hỏi đã được đánh dấu — lưu offline trên thiết bị của bạn.`
              : 'Đánh dấu câu hỏi bằng biểu tượng ❤️ trên trang Tra cứu để lưu vào đây.'}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-bg-card border border-border-line rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && favorites.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="p-5 rounded-full bg-bg-interactive mb-5">
              <SearchX size={32} className="text-text-subtle" />
            </div>
            <h3 className="font-serif text-xl font-medium text-text-main mb-2">
              Chưa có câu hỏi yêu thích
            </h3>
            <p className="text-sm text-text-muted max-w-xs">
              Nhấn biểu tượng ❤️ trên bất kỳ câu hỏi nào ở trang Tra cứu để lưu vào danh sách này.
            </p>
          </div>
        )}

        {/* Favorite Cards */}
        <div className="space-y-3" id="favorites-list">
          {favorites.map((q, idx) => (
            <div
              key={q.id}
              className="relative animate-fade-in"
              style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
            >
              <QuestionCard
                question={q}
                searchQuery=""
                isInitiallyFavorite={true}
                onSelect={() => setSelectedQuestion(q)}
              />
              <button
                onClick={() => handleRemoveFavorite(q.id)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-subtle hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Xóa khỏi yêu thích"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
};
export default FavoritesPage;
