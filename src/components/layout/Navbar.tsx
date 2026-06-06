import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, Settings, Sun, Moon, Download, Wifi, WifiOff } from 'lucide-react';
import { useSettingsStore, usePWAStore } from '../../store';

export const Navbar: React.FC = () => {
  const { theme, setTheme } = useSettingsStore();
  const { isOffline, isInstallable, deferredPrompt, setIsInstallable } = usePWAStore();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
      setIsInstallable(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-line bg-bg-card/85 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" id="nav-logo">
          <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-brand/30 group-hover:ring-brand/60 transition-all duration-200 shrink-0">
            <img
              src="/icon.jpg"
              alt="FactorySearch Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-serif text-xl font-medium tracking-tight text-text-main group-hover:text-brand transition-colors duration-200">
            FactorySearch
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex space-x-1" id="nav-links">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isActive('/')
                ? 'bg-bg-interactive text-text-main ring-1 ring-ring-border'
                : 'text-text-muted hover:text-text-main hover:bg-bg-interactive/50'
            }`}
          >
            <Search size={16} />
            Tra cứu
          </Link>
          <Link
            to="/favorites"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isActive('/favorites')
                ? 'bg-bg-interactive text-text-main ring-1 ring-ring-border'
                : 'text-text-muted hover:text-text-main hover:bg-bg-interactive/50'
            }`}
          >
            <Heart size={16} />
            Yêu thích
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              isActive('/settings')
                ? 'bg-bg-interactive text-text-main ring-1 ring-ring-border'
                : 'text-text-muted hover:text-text-main hover:bg-bg-interactive/50'
            }`}
          >
            <Settings size={16} />
            Cài đặt
          </Link>
        </nav>

        {/* Utilities */}
        <div className="flex items-center gap-2">
          {/* Offline/Online Indicator */}
          <div
            id="offline-indicator"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isOffline
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : 'bg-green-500/10 border-green-500/20 text-green-500'
            }`}
            title={isOffline ? "Đang chạy Offline" : "Đang kết nối Internet"}
          >
            {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </div>

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              id="pwa-install-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-brand text-parchment rounded-lg border border-brand hover:bg-coral hover:border-coral transition-colors duration-200"
              title="Cài đặt làm ứng dụng"
            >
              <Download size={14} />
              Cài đặt App
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-interactive/70 border border-transparent hover:border-border-line transition-all duration-200"
            title="Đổi giao diện"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="flex md:hidden border-t border-border-line bg-bg-card transition-colors duration-300">
        <Link
          to="/"
          className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium ${
            isActive('/') ? 'text-brand' : 'text-text-muted'
          }`}
        >
          <Search size={18} />
          Tra cứu
        </Link>
        <Link
          to="/favorites"
          className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium ${
            isActive('/favorites') ? 'text-brand' : 'text-text-muted'
          }`}
        >
          <Heart size={18} />
          Yêu thích
        </Link>
        <Link
          to="/settings"
          className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium ${
            isActive('/settings') ? 'text-brand' : 'text-text-muted'
          }`}
        >
          <Settings size={18} />
          Cài đặt
        </Link>
      </div>
    </header>
  );
};
