import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, RotateCcw, ChevronDown } from 'lucide-react';
import { useSearchStore, useSettingsStore } from '../../store';
import { DriverFactory } from '../../drivers/DriverFactory';

export const FilterPanel: React.FC = () => {
  const { filters, updateFilter, clearFilters } = useSearchStore();
  const { activeDriver } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false); // Collapsed on mobile by default

  const driver = DriverFactory.getDriver(activeDriver);

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', activeDriver],
    queryFn: () => driver.getSubjects()
  });

  // Fetch chapters (dependent on selected subject)
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', activeDriver, filters.subject],
    queryFn: () => driver.getChapters(filters.subject)
  });

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags', activeDriver],
    queryFn: () => driver.getTags()
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full max-w-2xl mx-auto mt-4" id="filter-panel-container">
      {/* Filter Header / Mobile Trigger */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors duration-150"
        >
          <SlidersHorizontal size={16} className={activeFilterCount > 0 ? 'text-brand' : ''} />
          <span>Bộ lọc câu hỏi</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-2xs font-semibold text-parchment">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-brand hover:text-coral font-medium transition-colors"
          >
            <RotateCcw size={12} />
            <span>Xoá tất cả</span>
          </button>
        )}
      </div>

      {/* Selectors Grid */}
      {isOpen && (
        <div className="mt-3 p-4 bg-bg-card border border-border-strong rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
          {/* Subject Selector */}
          <div className="flex flex-col gap-1.5" id="filter-subject-select">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider text-left">
              Môn học
            </label>
            <div className="relative">
              <select
                value={filters.subject || ''}
                onChange={(e) => {
                  updateFilter('subject', e.target.value || undefined);
                  updateFilter('chapter', undefined); // Clear chapter when subject changes
                }}
                className="w-full h-9 pl-3 pr-8 text-sm bg-bg-page border border-border-strong rounded-lg outline-none appearance-none focus:border-brand cursor-pointer"
              >
                <option value="">Tất cả môn học</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle" />
            </div>
          </div>

          {/* Chapter Selector */}
          <div className="flex flex-col gap-1.5" id="filter-chapter-select">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider text-left">
              Chương
            </label>
            <div className="relative">
              <select
                value={filters.chapter || ''}
                onChange={(e) => updateFilter('chapter', e.target.value || undefined)}
                className="w-full h-9 pl-3 pr-8 text-sm bg-bg-page border border-border-strong rounded-lg outline-none appearance-none focus:border-brand cursor-pointer"
              >
                <option value="">Tất cả chương</option>
                {chapters.map((chap) => (
                  <option key={chap} value={chap}>
                    {chap}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle" />
            </div>
          </div>

          {/* Tag Selector */}
          <div className="flex flex-col gap-1.5" id="filter-tag-select">
            <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider text-left">
              Tags
            </label>
            <div className="relative">
              <select
                value={filters.tag || ''}
                onChange={(e) => updateFilter('tag', e.target.value || undefined)}
                className="w-full h-9 pl-3 pr-8 text-sm bg-bg-page border border-border-strong rounded-lg outline-none appearance-none focus:border-brand cursor-pointer"
              >
                <option value="">Tất cả tag</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle" />
            </div>
          </div>
        </div>
      )}

      {/* Selected Filters Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">
          {filters.subject && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              Môn: {filters.subject}
              <button onClick={() => { updateFilter('subject', undefined); updateFilter('chapter', undefined); }} className="hover:text-coral">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.chapter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              Chương: {filters.chapter}
              <button onClick={() => updateFilter('chapter', undefined)} className="hover:text-coral">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.tag && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              Tag: {filters.tag}
              <button onClick={() => updateFilter('tag', undefined)} className="hover:text-coral">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
export default FilterPanel;
