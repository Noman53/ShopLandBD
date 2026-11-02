import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const EMOJI_CATEGORIES = [
  {
    name: '😊',
    label: 'Smileys',
    emojis: '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 🥹 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎 🤓 🧐'.split(' '),
  },
  {
    name: '👋',
    label: 'Gestures',
    emojis: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🫶'.split(' '),
  },
  {
    name: '❤️',
    label: 'Hearts',
    emojis: '❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 💕 💞 💓 💗 💖 💘 💝 💟 ❣️ 💌 💋'.split(' '),
  },
  {
    name: '🐱',
    label: 'Animals',
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐴 🦄 🐝 🪱 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐘 🦒 🦓 🦍 🐪 🐄 🐎 🐑 🐐 🐕 🐈 🐓 🦜 🦢 🦚'.split(' '),
  },
  {
    name: '🍕',
    label: 'Food',
    emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🫔 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍦 🍨 🍧 🍰 🎂 🧁 🥧 🍫 🍬 🍭 🍮 🍩 🍪 ☕ 🧋 🥤 🧃 🥛 🍵 🧉 🍺 🍻 🍷 🥂 🥃'.split(' '),
  },
  {
    name: '⚽',
    label: 'Activities',
    emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏒 🏑 🏏 🥍 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🚴 🚵 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🪇 🪘 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩'.split(' '),
  },
  {
    name: '🚗',
    label: 'Travel',
    emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚏 🛣️ 🛤️ ⛽ 🚨 🚥 🚦 🚧 ⚓ 🛟 ⛵ 🚤 🛳️ ⛴️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🌍 🌎 🌏 🗺️ 🧭 🏕️ 🏖️ 🏝️ 🏜️ 🏞️ 🏟️ 🏛️ 🏗️ 🏘️ 🏠 🏡 🏢 🏬 🏪 🏫 🏥 🏦 🏨 🏩 🏰 🗼 🗽 ⛪ 🕌 🛕 ⛩️ 🕋 ⛲ 🌅 🌇 🌃 🌉 🌌 🌈'.split(' '),
  },
  {
    name: '🛒',
    label: 'Shopping',
    emojis: '🛒 📦 📫 📬 📭 📮 🚚 🏷️ 🎁 🛍️ 💳 💵 💶 💷 💴 💸 💰 🪙 🧾 📱 💻 ⌚ 📷 📸 🎥 📺 🔌 🔋 💡 🔦 🧰 🪛 🔧 🔨 ⚙️ 🧲 🪜 🧹 🧺 🧻 🧼 🪥 🧴 🔑 🗝️ 🔒 🔓 🔐 🔏 🛡️ ✅ ☑️ ✔️ ❌ ❎ ⚠️ ⏳ ⌛ 📞 ☎️ 📧 ✉️ 📍 🏠 ⭐ 🌟 💡 🔔 🔕'.split(' '),
  },
  {
    name: '🎉',
    label: 'Symbols',
    emojis: '🎉 🎊 🎈 🎂 🎀 🎁 🎆 🎇 🧨 ✨ 🎐 🎏 🎎 🎍 🎋 🎄 🧧 🎑 🏮 🎃 🎗️ 🔥 💯 💢 💥 💫 💦 💨 🕳️ 💬 🗨️ 🗯️ 💭 💤 ❤️‍🔥 💌 ♻️ 🔰 🔱 ☯️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☮️ 🆗 🆕 🆙 🆓 🆒 🆘 🅿️ 🅰️ 🅱️ 🆎 🏧 🚻 🚹 🚺 🚼 🚾 ♿ 🚭 🚮 🚰 🚸 ⛔ 🚫 🔞 📵 🔃 🔄 🔝 🔚 🔙 🔛 🔜 ➕ ➖ ➗ ✖️ ♾️ 💲 ™️ ©️ ®️'.split(' '),
  },
  {
    name: '🚩',
    label: 'Flags',
    emojis: '🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇧🇩 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇮🇳 🇵🇰 🇸🇦 🇦🇪 🇯🇵 🇰🇷 🇨🇳 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇧🇷 🇲🇾 🇸🇬 🇹🇷 🇳🇵 🇱🇰 🇶🇦 🇰🇼 🇴🇲 🇵🇭 🇮🇩 🇹🇭 🇳🇿 🇿🇦 🇳🇬 🇪🇬 🇺🇳'.split(' '),
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={t('ইমোজি বাছুন', 'Choose emoji')}
        aria-expanded={isOpen}
      >
        <Smile className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 z-[70] mb-2 flex max-h-[min(22rem,55dvh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          role="dialog"
          aria-label={t('ইমোজি তালিকা', 'Emoji picker')}
        >
          <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b px-2 pt-2 no-scrollbar" role="tablist" aria-label="Emoji categories">
            {EMOJI_CATEGORIES.map((category, index) => (
              <button
                key={category.label}
                type="button"
                role="tab"
                aria-label={category.label}
                aria-selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                className={cn(
                  'h-10 min-w-10 flex-shrink-0 rounded-t-lg px-2 text-lg transition-colors',
                  activeTab === index ? 'bg-secondary font-medium' : 'hover:bg-secondary/50'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 overflow-y-auto overscroll-contain p-2 sm:grid-cols-9" role="tabpanel" aria-label={EMOJI_CATEGORIES[activeTab].label}>
            {EMOJI_CATEGORIES[activeTab].emojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  setIsOpen(false);
                }}
                className="flex aspect-square min-h-9 min-w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Insert ${emoji}`}
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
