'use client';

import { memo } from 'react';

type TopographyProps = {
  className?: string;
  lineColor?: string;
  heroTint?: string;
  lineCount?: number;
};

function buildContours(lineCount: number) {
  return Array.from({ length: lineCount }, (_, index) => {
    const progress = index / Math.max(lineCount - 1, 1);
    const y = 8 + progress * 84;
    const amplitude = 8 + Math.sin(progress * Math.PI) * 16;
    const drift = (index % 2 === 0 ? 1 : -1) * (6 + progress * 12);
    const tension = 4 + progress * 10;

    const start = `${-10 + drift},${y}`;
    const c1 = `${18 + tension},${y - amplitude}`;
    const c2 = `${34 - drift},${y + amplitude * 0.9}`;
    const mid = `${50 + drift * 0.35},${y}`;
    const c4 = `${84 - tension},${y + amplitude}`;
    const end = `${110 - drift * 0.4},${y}`;

    return {
      id: `contour-${index}`,
      opacity: (0.4 + progress * 0.6).toFixed(3),
      width: (0.85 + progress * 0.5).toFixed(2),
      path: `M ${start} C ${c1} ${c2} ${mid} S ${c4} ${end}`,
    };
  });
}

const Topography = memo(function Topography({
  className = '',
  lineColor = 'rgba(255,255,255,0.06)',
  heroTint = 'rgba(16,185,129,0.14)',
  lineCount = 26,
}: TopographyProps) {
  const contours = buildContours(lineCount);

  return (
    <div className={`topography-background ${className}`.trim()} aria-hidden="true">
      <div className="topography-background__hero-glow" />
      <svg
        className="topography-background__svg topography-background__svg--base"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {contours.map((contour) => (
          <path
            key={contour.id}
            d={contour.path}
            fill="none"
            stroke={lineColor}
            strokeWidth={contour.width}
            strokeLinecap="round"
            opacity={contour.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <svg
        className="topography-background__svg topography-background__svg--hero"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {contours.slice(0, 13).map((contour, index) => (
          <path
            key={`${contour.id}-hero`}
            d={contour.path}
            fill="none"
            stroke={heroTint}
            strokeWidth={Number(contour.width) + 0.2}
            strokeLinecap="round"
            opacity={0.22 + index * 0.018}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
});

export { Topography };
