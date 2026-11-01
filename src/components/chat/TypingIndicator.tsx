import React from 'react';
import { MessageCircle, Headphones } from 'lucide-react';

interface TypingIndicatorProps {
  isAdmin?: boolean;
}

export default function TypingIndicator({ isAdmin = false }: TypingIndicatorProps) {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        {isAdmin ? <Headphones className="w-4 h-4 text-accent" /> : <MessageCircle className="w-4 h-4 text-primary" />}
      </div>
      <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
