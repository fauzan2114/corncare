import React from 'react';
import NotificationBadge from './NotificationBadge';

interface ChatIconProps {
  onClick: () => void;
  unreadCount?: number;
  color?: 'green' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}

const ChatIcon: React.FC<ChatIconProps> = ({ 
  onClick, 
  unreadCount = 0, 
  color = 'green', 
  size = 'md',
  title = 'Open Chat',
  className = ""
}) => {
  const colorClasses = {
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={onClick}
        className={`bg-gradient-to-r ${colorClasses[color]} text-white ${sizeClasses[size]} rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        title={title}
      >
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
      <NotificationBadge count={unreadCount} />
    </div>
  );
};

export default ChatIcon;