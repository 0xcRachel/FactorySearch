import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { useSearchStore, useSettingsStore } from '../../store';
import { DriverFactory } from '../../drivers/DriverFactory';
import type { Question } from '../../types';

export const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, searchHistory, addSearchHistory, removeSearchHistory } = useSearchStore();
  const { activeDriver } = useSettingsStore();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<Question[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize local input value when store value changes (e.g. from history click)
  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Debounce input updates to Zustand store
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputVal);
    }, 250); // 250ms debounce
    return () => clearTimeout(timer);
  }, [inputVal, setSearchQuery]);

  // Fetch suggestions based on input value
  useEffect(() => {
    if (!inputVal.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const driver = DriverFactory.getDriver(activeDriver);
        const result = await driver.searchQuestions(inputVal, {}, 1, 5); // limit to 5 suggestions
        setSuggestions(result.questions);
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
      }
    };

    fetchSuggestions();
  }, [inputVal, activeDriver]);

  // Handle outside clicks to close suggestion dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (queryText: string) => {
    if (!queryText.trim()) return;
    setInputVal(queryText);
    setSearchQuery(queryText);
    addSearchHistory(queryText);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const itemsCount = inputVal.trim() ? suggestions.length : searchHistory.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < itemsCount - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemsCount - 1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        if (inputVal.trim()) {
          // Select suggestion
          const selected = suggestions[activeIndex];
          if (selected) {
            handleSearchSubmit(selected.question.slice(0, 50));
          }
        } else {
          // Select history item
          const selected = searchHistory[activeIndex];
          if (selected) {
            handleSearchSubmit(selected);
          }
        }
      } else {
        handleSearchSubmit(inputVal);
      }
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    setInputVal('');
    setSearchQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={dropdownRef} id="search-bar-container">
      {/* Search Input Box */}
      <div className="relative flex items-center bg-bg-card border border-border-strong hover:border-ring-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 rounded-xl shadow-sm transition-all duration-200">
        <Search className="absolute left-4 text-text-subtle" size={20} />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowDropdown(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            setShowDropdown(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nhập nội dung câu hỏi cần tra cứu..."
          className="w-full h-12 pl-12 pr-12 text-base text-text-main placeholder-text-subtle bg-transparent rounded-xl outline-none"
        />
        {inputVal && (
          <button
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full text-text-subtle hover:bg-bg-interactive hover:text-text-main transition-colors duration-150"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestion Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-bg-card border border-border-strong rounded-xl shadow-lg max-h-80 overflow-y-auto animate-fade-in transition-all">
          
          {/* 1. Show suggestions when input has text */}
          {inputVal.trim() && suggestions.length > 0 && (
            <div className="p-1.5">
              {suggestions.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleSearchSubmit(item.question.slice(0, 80))}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    idx === activeIndex
                      ? 'bg-bg-interactive text-text-main'
                      : 'text-text-muted hover:bg-bg-interactive/40'
                  }`}
                >
                  <Search size={14} className="text-text-subtle shrink-0" />
                  <span className="truncate flex-1 text-left">{item.question}</span>
                  <span className="text-xs text-brand/70 font-serif font-medium shrink-0 bg-brand/5 px-2 py-0.5 rounded border border-brand/10">
                    {item.subject}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 2. Show Search History when input is empty */}
          {!inputVal.trim() && searchHistory.length > 0 && (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                <span>Tra cứu gần đây</span>
              </div>
              {searchHistory.map((historyItem, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    idx === activeIndex
                      ? 'bg-bg-interactive text-text-main'
                      : 'text-text-muted hover:bg-bg-interactive/40'
                  }`}
                >
                  <div
                    onClick={() => handleSearchSubmit(historyItem)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <Clock size={14} className="text-text-subtle shrink-0" />
                    <span className="truncate">{historyItem}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSearchHistory(historyItem);
                    }}
                    className="p-1 text-text-subtle hover:text-red-500 rounded hover:bg-bg-interactive"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 3. Empty State within Dropdown */}
          {inputVal.trim() && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-sm text-text-subtle">
              <span>Bấm <kbd className="px-1.5 py-0.5 bg-bg-interactive rounded text-xs border">Enter</kbd> để tìm kiếm chi tiết:</span>
              <button
                onClick={() => handleSearchSubmit(inputVal)}
                className="mt-2 flex items-center gap-1.5 text-brand font-medium hover:underline text-xs"
              >
                "Tìm kiếm "{inputVal}"" <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
