import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = [
  { name: '😊', emojis: ['😊', '😂', '❤️', '👍', '🙏', '😍', '🥰', '😘', '🤗', '😁', '🎉', '✨', '🔥', '💯', '👏', '🤝'] },
  { name: '🛒', emojis: ['🛒', '📦', '🚚', '💳', '💰', '🏷️', '🎁', '✅', '❌', '⏳', '📞', '📧', '🏠', '📍', '⭐', '💡'] },
  { name: '😢', emojis: ['😢', '😤', '😡', '🤔', '😳', '😅', '🙁', '😒', '🤷', '👀', '🙄', '😬', '🫣', '😮', '🫡', '🤞'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[260px] bg-card border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
          {/* Category tabs */}
          <div className="flex border-b px-2 pt-2 gap-1">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-3 py-1.5 rounded-t-lg text-sm transition-colors',
                  activeTab === i ? 'bg-secondary font-medium' : 'hover:bg-secondary/50'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-36 overflow-y-auto">
            {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  setIsOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
