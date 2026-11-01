import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QuickRepliesProps {
  onSelect: (message: string) => void;
  isInitial?: boolean;
}

const INITIAL_SUGGESTIONS = [
  { bn: '🚚 ডেলিভারি চার্জ কত?', en: '🚚 What are delivery charges?' },
  { bn: '💳 পেমেন্ট পদ্ধতি কী কী?', en: '💳 What payment methods?' },
  { bn: '📦 অর্ডার ট্র্যাক করতে চাই', en: '📦 Track my order' },
  { bn: '🔄 রিটার্ন পলিসি কী?', en: '🔄 What is the return policy?' },
];

const FOLLOW_UP_SUGGESTIONS = [
  { bn: '⏱️ ডেলিভারি কতদিন লাগে?', en: '⏱️ How long is delivery?' },
  { bn: '📞 মানুষের সাথে কথা বলতে চাই', en: '📞 Talk to a human' },
  { bn: '🎁 কোনো অফার আছে?', en: '🎁 Any offers available?' },
];

export default function QuickReplies({ onSelect, isInitial = true }: QuickRepliesProps) {
  const { t } = useLanguage();
  const suggestions = isInitial ? INITIAL_SUGGESTIONS : FOLLOW_UP_SUGGESTIONS;

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(t(s.bn, s.en))}
          className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
        >
          {t(s.bn, s.en)}
        </button>
      ))}
    </div>
  );
}
