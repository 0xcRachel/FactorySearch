import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, RotateCcw, ChevronDown, Search, School, BookOpen } from 'lucide-react';
import { useSearchStore, useSettingsStore } from '../../store';
import { DriverFactory } from '../../drivers/DriverFactory';
import { removeVietnameseAccents } from '../../utils/text';

/* ─── Searchable Combobox ──────────────────────────────────────── */
interface ComboboxProps {
  value: string;
  onChange: (val: string | undefined) => void;
  options: string[];
  placeholder: string;
  emptyLabel: string;
  disabled?: boolean;
  id?: string;
}

const Combobox: React.FC<ComboboxProps> = ({
  value, onChange, options, placeholder, emptyLabel, disabled, id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    removeVietnameseAccents(o).toLowerCase().includes(
      removeVietnameseAccents(search).toLowerCase()
    )
  );

  const handleSelect = useCallback((opt: string | undefined) => {
    onChange(opt);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={ref} className="relative" id={id}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full h-9 pl-3 pr-8 text-sm text-left rounded-lg border outline-none flex items-center justify-between
          ${disabled
            ? 'bg-bg-interactive/30 border-border-line text-text-subtle cursor-not-allowed opacity-60'
            : value
              ? 'bg-brand/5 border-brand/40 text-text-main font-medium'
              : 'bg-bg-page border-border-strong text-text-muted hover:border-brand/40'
          }`}
        style={{ transition: 'border-color 0.15s, background 0.15s' }}
      >
        <span className="truncate">{value || placeholder}</span>
        {value ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSelect(undefined); }}
            className="absolute right-2.5 text-text-subtle hover:text-brand"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={13} className="absolute right-2.5 text-text-subtle pointer-events-none" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-xl border border-border-strong bg-bg-card shadow-xl overflow-hidden"
          style={{ animation: 'fadeIn 0.12s ease both' }}
        >
          {/* Search input inside dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-line">
            <Search size={13} className="text-text-subtle shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent text-sm outline-none text-text-main placeholder:text-text-subtle"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-subtle hover:text-brand">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* "All" option */}
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              className={`w-full text-left px-3 py-2 text-sm ${
                !value
                  ? 'bg-brand/8 text-brand font-medium'
                  : 'text-text-muted hover:bg-bg-interactive'
              }`}
              style={{ transition: 'background 0.1s' }}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-text-subtle text-center">
                Không tìm thấy kết quả
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm truncate ${
                    value === opt
                      ? 'bg-brand/8 text-brand font-medium'
                      : 'text-text-main hover:bg-bg-interactive'
                  }`}
                  style={{ transition: 'background 0.1s' }}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── FilterPanel ───────────────────────────────────────────────── */
export const FilterPanel: React.FC = () => {
  const { filters, updateFilter, clearFilters } = useSearchStore();
  const { activeDriver } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  const driver = DriverFactory.getDriver(activeDriver);

  const { data: schools = [] } = useQuery({
    queryKey: ['schools', activeDriver],
    queryFn: () => driver.getSchools(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', activeDriver, filters.school],
    queryFn: () => driver.getSubjects(filters.school),
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters_list', activeDriver, filters.school, filters.subject],
    queryFn: () => driver.getChapters(filters.subject, filters.school),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', activeDriver],
    queryFn: () => driver.getTags(),
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full max-w-2xl mx-auto mt-4" id="filter-panel-container">
      {/* Header toggle */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main"
          style={{ transition: 'color 0.15s' }}
        >
          <SlidersHorizontal size={16} className={activeFilterCount > 0 ? 'text-brand' : ''} />
          <span>Bộ lọc câu hỏi</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-2xs font-semibold text-parchment">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-brand hover:text-coral font-medium"
            style={{ transition: 'color 0.15s' }}
          >
            <RotateCcw size={12} />
            <span>Xoá tất cả</span>
          </button>
        )}
      </div>

      {/* Filter grid — smooth expand/collapse */}
      <div
        className="grid"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="mt-3 p-4 bg-bg-card border border-border-strong rounded-xl shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* School */}
              <div className="flex flex-col gap-1.5" id="filter-school-select">
                <label className="flex items-center gap-1 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                  <School size={11} />
                  Trường
                </label>
                <Combobox
                  value={filters.school || ''}
                  onChange={(v) => {
                    updateFilter('school', v);
                    updateFilter('subject', undefined);
                    updateFilter('chapter', undefined);
                  }}
                  options={schools}
                  placeholder="Tất cả trường"
                  emptyLabel="Tất cả trường"
                />
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5" id="filter-subject-select">
                <label className="flex items-center gap-1 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                  <BookOpen size={11} />
                  Môn học
                </label>
                <Combobox
                  value={filters.subject || ''}
                  onChange={(v) => {
                    updateFilter('subject', v);
                    updateFilter('chapter', undefined);
                  }}
                  options={subjects}
                  placeholder="Tất cả môn"
                  emptyLabel="Tất cả môn"
                />
              </div>

              {/* Chapter */}
              <div className="flex flex-col gap-1.5" id="filter-chapter-select">
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
                  Danh mục
                </label>
                <Combobox
                  value={filters.chapter || ''}
                  onChange={(v) => updateFilter('chapter', v)}
                  options={chapters}
                  placeholder="Tất cả danh mục"
                  emptyLabel="Tất cả danh mục"
                />
              </div>

              {/* Tag */}
              <div className="flex flex-col gap-1.5" id="filter-tag-select">
                <label className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
                  Tags
                </label>
                <Combobox
                  value={filters.tag || ''}
                  onChange={(v) => updateFilter('tag', v)}
                  options={tags}
                  placeholder="Tất cả tag"
                  emptyLabel="Tất cả tag"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">
          {filters.school && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              🏫 {filters.school}
              <button onClick={() => { updateFilter('school', undefined); updateFilter('subject', undefined); updateFilter('chapter', undefined); }}>
                <X size={12} className="hover:text-coral" />
              </button>
            </span>
          )}
          {filters.subject && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              📖 {filters.subject}
              <button onClick={() => { updateFilter('subject', undefined); updateFilter('chapter', undefined); }}>
                <X size={12} className="hover:text-coral" />
              </button>
            </span>
          )}
          {filters.chapter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              §  {filters.chapter}
              <button onClick={() => updateFilter('chapter', undefined)}>
                <X size={12} className="hover:text-coral" />
              </button>
            </span>
          )}
          {filters.tag && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-brand/5 border border-brand/20 text-brand font-medium">
              # {filters.tag}
              <button onClick={() => updateFilter('tag', undefined)}>
                <X size={12} className="hover:text-coral" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
export default FilterPanel;
