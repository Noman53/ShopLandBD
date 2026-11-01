import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface HeaderDropdownProps {
  label: string;
  items: DropdownItem[];
  isActive?: boolean;
  className?: string;
}

export default function HeaderDropdown({ label, items, isActive, className }: HeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          "relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-primary hover:bg-accent/50",
          className
        )}
        style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-[100] animate-fade-in-up">
          <div className="py-1.5">
            {items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
              >
                {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
