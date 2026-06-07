import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DriverType } from '../drivers/DriverFactory';
import type { ThemeMode } from '../types';

// Store 1: Settings Store
interface SettingsState {
  theme: ThemeMode;
  activeDriver: DriverType;
  hasSeenOnboarding: boolean;
  dbSize: number | null;
  dbFileName: string | null;
  dbLastUpdated: string | null;
  setTheme: (theme: ThemeMode) => void;
  setActiveDriver: (driver: DriverType) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setDbInfo: (size: number | null, name: string | null, lastUpdated: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      activeDriver: 'json',
      hasSeenOnboarding: false,
      dbSize: null,
      dbFileName: null,
      dbLastUpdated: null,
      setTheme: (theme) => {
        set({ theme });
        // Update root class
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setActiveDriver: (activeDriver) => set({ activeDriver }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setDbInfo: (dbSize, dbFileName, dbLastUpdated) => set({ dbSize, dbFileName, dbLastUpdated })
    }),
    {
      name: 'factorysearch-settings'
    }
  )
);

// Store 2: Search and Navigation Store
interface SearchFilters {
  school?: string;
  subject?: string;
  chapter?: string;
  tag?: string;
}

interface SearchState {
  searchQuery: string;
  filters: SearchFilters;
  searchHistory: string[];
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: (key: keyof SearchFilters, value: string | undefined) => void;
  clearFilters: () => void;
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      searchQuery: '',
      filters: {},
      searchHistory: [],
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilters: (filters) => set({ filters }),
      updateFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value }
      })),
      clearFilters: () => set({ filters: {} }),
      addSearchHistory: (query) => {
        if (!query.trim()) return;
        set((state) => {
          // Remove duplicates and put at start
          const filtered = state.searchHistory.filter((h) => h !== query);
          const history = [query, ...filtered].slice(0, 15); // limit to 15 items
          return { searchHistory: history };
        });
      },
      removeSearchHistory: (query) => set((state) => ({
        searchHistory: state.searchHistory.filter((h) => h !== query)
      })),
      clearSearchHistory: () => set({ searchHistory: [] })
    }),
    {
      name: 'factorysearch-search-history',
      partialize: (state) => ({ searchHistory: state.searchHistory }) // Only persist history
    }
  )
);

// Store 3: PWA & System Store (No persistence needed)
interface PWAState {
  isOffline: boolean;
  isInstallable: boolean;
  deferredPrompt: any;
  setIsOffline: (val: boolean) => void;
  setIsInstallable: (val: boolean) => void;
  setDeferredPrompt: (prompt: any) => void;
}

export const usePWAStore = create<PWAState>((set) => ({
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  isInstallable: false,
  deferredPrompt: null,
  setIsOffline: (isOffline) => set({ isOffline }),
  setIsInstallable: (isInstallable) => set({ isInstallable }),
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt })
}));
