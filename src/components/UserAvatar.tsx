import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Generate a consistent color based on name
function getAvatarColor(name: string | null | undefined): string {
  if (!name) return 'bg-primary';
  
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  showTooltip = true,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  const avatarContent = (
    <div
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden font-semibold text-white shadow-sm transition-transform hover:scale-105',
        sizeClasses[size],
        !avatarUrl && bgColor,
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || 'User'}
          className="w-full h-full object-cover object-center"
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className={cn(
          size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'
        )} />
      )}
    </div>
  );

  if (showTooltip && name) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {avatarContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarContent;
}
