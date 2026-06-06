import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-bg-card border border-border-line rounded-xl p-4 sm:p-5 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex gap-2">
        <div className="h-5 w-24 bg-bg-interactive rounded-full" />
        <div className="h-5 w-32 bg-bg-interactive rounded-full" />
      </div>
      <div className="h-7 w-7 bg-bg-interactive rounded-full" />
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-bg-interactive rounded w-full" />
      <div className="h-4 bg-bg-interactive rounded w-5/6" />
      <div className="h-4 bg-bg-interactive rounded w-3/4" />
    </div>
    <div className="flex gap-2 mt-3">
      <div className="h-4 w-12 bg-bg-interactive rounded" />
      <div className="h-4 w-16 bg-bg-interactive rounded" />
    </div>
    <div className="mt-4 pt-3 border-t border-border-line">
      <div className="h-4 w-28 bg-bg-interactive rounded" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
