import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { SearchPage } from '../pages/SearchPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRouter: React.FC = () => (
  <BrowserRouter>
    <div className="flex flex-col min-h-screen bg-bg-page transition-colors duration-300">
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<SearchPage />} />
        </Routes>
      </ErrorBoundary>
      <Footer />
    </div>
  </BrowserRouter>
);
