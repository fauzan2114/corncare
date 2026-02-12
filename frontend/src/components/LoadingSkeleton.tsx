import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8 space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="space-y-3 flex-1">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4"></div>
        </div>
        <div className="h-12 w-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 rounded-full animate-shimmer"
               style={{ width: '60%', backgroundSize: '200% 100%' }}></div>
        </div>
        <p className="text-sm text-gray-500 text-center font-medium">
          Analyzing image with AI...
        </p>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-5/6"></div>
        </div>

        <div className="space-y-2">
          <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-4/5"></div>
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
        </div>
      </div>

      {/* Icon Animation */}
      <div className="flex justify-center pt-4">
        <div className="relative">
          <div className="h-16 w-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl animate-bounce-subtle">🌽</span>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full mb-2"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Inline skeleton for smaller elements
export const InlineLoaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse">
      <div className="h-12 w-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );
};

// Card skeleton for grid layouts
export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-5/6"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-4/6"></div>
      </div>
      <div className="mt-6 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
    </div>
  );
};
