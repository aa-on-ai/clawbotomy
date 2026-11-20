import { ArrowLeft, ArrowRight, Moon, Sun, Plus, Minus, Menu, X, ChevronDown, Check, ExternalLink } from 'lucide-react';

const icons = { arrowLeft: ArrowLeft, arrowRight: ArrowRight, moon: Moon, sun: Sun, plus: Plus, minus: Minus, menu: Menu, close: X, chevronDown: ChevronDown, check: Check, externalLink: ExternalLink };

/** Decorative UI icons. Icon-only controls supply their own accessible name. */
export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Glyph = icons[name];
  return <Glyph size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" className={['controlGlyph', className].filter(Boolean).join(' ')} />;
}
