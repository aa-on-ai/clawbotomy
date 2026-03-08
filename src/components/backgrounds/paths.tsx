'use client';

import { memo } from 'react';

type PathsProps = {
  className?: string;
  stroke?: string;
};

const pathSet = [
  'M -10 18 C 10 8, 24 12, 42 22 S 78 42, 110 32',
  'M -8 34 C 8 26, 28 28, 46 40 S 78 60, 108 50',
  'M -6 52 C 12 44, 30 48, 50 58 S 82 74, 108 64',
  'M -4 70 C 14 62, 28 68, 44 78 S 74 92, 104 84',
];

const Paths = memo(function Paths({ className = '', stroke = 'rgba(125, 211, 252, 0.22)' }: PathsProps) {
  return (
    <div className={`paths-background ${className}`.trim()} aria-hidden="true">
      <svg className="paths-background__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pathSet.map((path, index) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={0.8 + index * 0.1}
            strokeLinecap="round"
            strokeDasharray="18 14"
            opacity={0.28 + index * 0.12}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {pathSet.map((path, index) => (
          <path
            key={`${path}-mirror`}
            d={path.replace(/(\d+(?:\.\d+)?)/g, (value, number, offset, source) => {
              const prev = source.slice(0, offset).split(/[, ]/).filter(Boolean).length;
              return prev % 2 === 1 ? String(100 - Number(number)) : number;
            })}
            fill="none"
            stroke={stroke}
            strokeWidth={0.5 + index * 0.08}
            strokeLinecap="round"
            opacity={0.12 + index * 0.08}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
});

export { Paths };
