import { ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react';

const icons = { arrowLeft: ArrowLeft, arrowRight: ArrowRight, moon: Moon, sun: Sun };

/** Decorative UI icons. Icon-only controls supply their own accessible name. */
export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Glyph = icons[name];
  return <Glyph size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" className={className} />;
}
