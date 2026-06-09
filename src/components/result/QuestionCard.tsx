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

  // Parse multiple-choice format: stem + \n\nA. ...\nB. ...\nC. ...\nD. ...
  const parseMultipleChoice = (text: string): { stem: string; options: { letter: string; text: string }[] } | null => {
    const parts = text.split(/\n\n/);
    if (parts.length < 2) return null;
    const stem = parts[0].trim();
    const optionText = parts.slice(1).join('\n');
    const optionLines = optionText.split('\n');
    const options: { letter: string; text: string }[] = [];
    for (const line of optionLines) {
      const m = line.match(/^([A-D])\.\s+(.+)$/);
      if (m) options.push({ letter: m[1], text: m[2].trim() });
    }
    return options.length >= 2 ? { stem, options } : null;
  };

  const parsed = parseMultipleChoice(question.question);
  const correctLetter = question.answer?.match(/^([A-D])\./)?.[1];
  const highlightedStem = highlightKeywords(parsed ? parsed.stem : question.question, searchQuery);
  const tagsList = question.tags ? question.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div
      onClick={onSelect}
      className="bg-bg-card border border-border-line hover:border-border-strong hover:shadow-sm rounded-xl p-4 sm:p-5 cursor-pointer text-left relative group select-text"
      style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
      id={`question-card-${question.id}`}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start gap-3 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {question.school && (
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide shrink-0">
              {question.school}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/10 uppercase tracking-wide shrink-0">
            <BookOpen size={10} />
            {question.subject}
          </span>
          <span className="text-2xs text-text-subtle bg-bg-interactive/50 px-2 py-0.5 rounded border border-border-line font-medium truncate min-w-0">
            {question.chapter}
          </span>
        </div>

        <button
          onClick={toggleFavorite}
          className={`p-1.5 rounded-full border border-transparent hover:border-border-strong hover:bg-bg-interactive shrink-0 ${isFav ? 'text-brand' : 'text-text-subtle hover:text-text-main'
            }`}
          style={{ transition: 'color 0.15s, background 0.15s, border-color 0.15s' }}
          title={isFav ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}
          id={`fav-btn-${question.id}`}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Question Text (stem or full) */}
      <div className="text-base font-serif font-medium leading-relaxed text-text-main pr-2" id="question-text">
        {highlightedStem.map((segment, index) => (
          <span
            key={index}
            className={segment.isMatch ? 'bg-amber-100 dark:bg-yellow-950/40 text-text-main font-semibold px-0.5 rounded' : ''}
          >
            {segment.text}
          </span>
        ))}
      </div>

      {/* Multiple-choice options (A/B/C/D) with correct answer highlighted */}
      {parsed && (
        <div className="mt-3 flex flex-col gap-1.5">
          {parsed.options.map(opt => {
            const isCorrect = correctLetter && opt.letter === correctLetter;
            return (
              <div
                key={opt.letter}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm leading-snug ${isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-semibold'
                  : 'bg-bg-interactive/30 border border-border-line text-text-muted'
                  }`}
                style={{ transition: 'background 0.15s' }}
              >
                <span className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-2xs font-bold ${isCorrect
                  ? 'bg-emerald-500 text-white'
                  : 'bg-bg-interactive text-text-subtle'
                  }`}>{opt.letter}</span>
                <span className="flex-1">{opt.text}</span>
                {isCorrect && (
                  <span className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {/* Accordion Toggle */}
      <div className="mt-4 pt-3 border-t border-border-line flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(v => !v);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-main"
          style={{ transition: 'color 0.15s' }}
          id={`toggle-answer-btn-${question.id}`}
        >
          <ChevronDown
            size={14}
            style={{
              transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
          <span>{isExpanded ? 'Ẩn lời giải' : 'Xem lời giải'}</span>
        </button>

        <span className="text-3xs text-text-subtle">ID: #{question.id}</span>
      </div>

      {/* Expandable explanation */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid"
        style={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="pt-3 pb-0.5">
            <div className="p-4 bg-bg-page border border-border-strong rounded-lg text-sm select-text">
              {!parsed && (
                <div className="mb-2">
                  <span className="font-semibold text-brand text-xs uppercase tracking-wider">Đáp án:</span>
                  <p className="mt-1 font-serif text-base font-medium text-text-main">{question.answer}</p>
                </div>
              )}
              {parsed && (
                <div className="mb-2">
                  <span className="font-semibold text-brand text-xs uppercase tracking-wider">Đáp án đúng:</span>
                  <p className="mt-1 font-serif text-base font-semibold text-emerald-700 dark:text-emerald-300">{question.answer}</p>
                </div>
              )}

              {question.explanation && (
                <div className="border-t border-border-line pt-2 mt-2">
                  <span className="font-semibold text-text-subtle text-xs uppercase tracking-wider">Lời giải:</span>
                  <p className="mt-1 text-text-muted leading-relaxed text-sm whitespace-pre-line">{question.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default QuestionCard;
