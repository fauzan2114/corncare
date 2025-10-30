import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, className = "" }) => {
  if (count === 0) return null;
  
  return (
    <div className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse shadow-lg ${className}`}>
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default NotificationBadge;