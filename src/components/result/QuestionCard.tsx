import React, { useState } from 'react';
import { Heart, ChevronDown, BookOpen, Tag } from 'lucide-react';
import type { Question } from '../../types';
import { highlightKeywords } from '../../utils/text';
import { useSettingsStore } from '../../store';
import { DriverFactory } from '../../drivers/DriverFactory';

interface QuestionCardProps {
  question: Question;
  searchQuery: string;
  isInitiallyFavorite?: boolean;
  onSelect?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  searchQuery,
  isInitiallyFavorite = false,
  onSelect
}) => {
  const { activeDriver } = useSettingsStore();
  const [isFav, setIsFav] = useState(isInitiallyFavorite);
  const [isExpanded, setIsExpanded] = useState(false);

  const driver = DriverFactory.getDriver(activeDriver);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFav) {
        await driver.removeFavorite(question.id);
        setIsFav(false);
      } else {
        await driver.addFavorite(question);
        setIsFav(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite status:', err);
    }
  };

  const highlightedQuestion = highlightKeywords(question.question, searchQuery);
  const tagsList = question.tags ? question.tags.split(',').map(t => t.trim()) : [];

  return (
    <div
      onClick={onSelect}
      className="bg-bg-card border border-border-line hover:border-border-strong hover:shadow-md rounded-xl p-4 sm:p-5 transition-all duration-300 cursor-pointer text-left relative group select-text"
      id={`question-card-${question.id}`}
    >
      {/* Card Header (Subject & Favorite Button) */}
      <div className="flex justify-between items-start gap-4 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/10 uppercase tracking-wide">
            <BookOpen size={10} />
            {question.subject}
          </span>
          <span className="text-2xs text-text-subtle bg-bg-interactive/50 px-2 py-0.5 rounded border border-border-line font-medium">
            {question.chapter}
          </span>
        </div>
        
        <button
          onClick={toggleFavorite}
          className={`p-1.5 rounded-full border border-transparent hover:border-border-strong hover:bg-bg-interactive transition-all duration-200 ${
            isFav ? 'text-brand' : 'text-text-subtle hover:text-text-main'
          }`}
          title={isFav ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}
          id={`fav-btn-${question.id}`}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Question Text */}
      <div className="text-base font-serif font-medium leading-relaxed text-text-main pr-2" id="question-text">
        {highlightedQuestion.map((segment, index) => (
          <span
            key={index}
            className={segment.isMatch ? 'bg-amber-100 dark:bg-yellow-950/40 text-text-main font-semibold px-0.5 rounded' : ''}
          >
            {segment.text}
          </span>
        ))}
      </div>

      {/* Tags */}
      {tagsList.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tagsList.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-3xs font-semibold text-text-muted bg-bg-interactive/40 px-1.5 py-0.5 rounded">
              <Tag size={8} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Accordion Expand Action */}
      <div className="mt-4 pt-3 border-t border-border-line flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
          id={`toggle-answer-btn-${question.id}`}
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          <span>{isExpanded ? 'Ẩn đáp án' : 'Xem nhanh đáp án'}</span>
        </button>

        <span className="text-3xs text-text-subtle">ID: #{question.id}</span>
      </div>

      {/* Expanded Quick Answer Detail */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-4 bg-bg-page border border-border-strong rounded-lg animate-fade-in text-sm select-text"
        >
          <div className="mb-2">
            <span className="font-semibold text-brand text-xs uppercase tracking-wider">Đáp án:</span>
            <p className="mt-1 font-serif text-base font-medium text-text-main">{question.answer}</p>
          </div>
          
          {question.explanation && (
            <div className="border-t border-border-line pt-2 mt-2">
              <span className="font-semibold text-text-subtle text-xs uppercase tracking-wider">Lời giải chi tiết:</span>
              <p className="mt-1 text-text-muted leading-relaxed text-sm whitespace-pre-line">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default QuestionCard;
