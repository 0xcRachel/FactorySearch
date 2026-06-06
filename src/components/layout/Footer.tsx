import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useSettingsStore } from '../../store';

export const Footer: React.FC = () => {
  const { setHasSeenOnboarding } = useSettingsStore();

  const handleRestartTour = (e: React.MouseEvent) => {
    e.preventDefault();
    setHasSeenOnboarding(false);
    // Reload page to automatically trigger the tour from scratch
    window.location.reload();
  };

  return (
    <footer className="w-full border-t border-border-line bg-bg-card/40 py-6 transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-subtle">
        <div>
          <span>© {new Date().getFullYear()} FactorySearch. Thiết kế theo phong cách Claude.</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleRestartTour}
            id="restart-tour-btn"
            className="flex items-center gap-1 hover:text-text-main transition-colors duration-150"
          >
            <HelpCircle size={14} />
            Hướng dẫn sử dụng
          </button>
          <span>•</span>
          <span>Chạy hoàn toàn Offline</span>
        </div>
      </div>
    </footer>
  );
};
