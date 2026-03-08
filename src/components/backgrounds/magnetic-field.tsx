'use client';

import { memo } from 'react';

type MagneticFieldProps = {
  className?: string;
  lineColor?: string;
};

const fieldLines = [
  'M 6 74 C 18 56, 24 30, 38 20 S 68 14, 94 28',
  'M 4 66 C 18 54, 30 32, 46 26 S 74 24, 96 40',
  'M 8 56 C 24 50, 36 38, 50 36 S 76 40, 92 56',
  'M 12 46 C 28 44, 42 46, 52 50 S 72 62, 88 74',
  'M 8 38 C 24 40, 34 54, 48 64 S 72 76, 94 82',
];

const MagneticField = memo(function MagneticField({ className = '', lineColor = 'rgba(16, 185, 129, 0.22)' }: MagneticFieldProps) {
  return (
    <div className={`magnetic-field ${className}`.trim()} aria-hidden="true">
      <div className="magnetic-field__core magnetic-field__core--left" />
      <div className="magnetic-field__core magnetic-field__core--right" />
      <svg className="magnetic-field__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {fieldLines.map((path, index) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={0.6 + index * 0.08}
            strokeLinecap="round"
            opacity={0.35 + index * 0.1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {fieldLines.map((path, index) => (
          <path
            key={`${path}-mirror`}
            d={path.replace(/(\d+(?:\.\d+)?)/g, (value, number, offset, source) => {
              const prev = source.slice(0, offset).split(/[, ]/).filter(Boolean).length;
              return prev % 2 === 1 ? String(100 - Number(number)) : number;
            })}
            fill="none"
            stroke={lineColor}
            strokeWidth={0.6 + index * 0.08}
            strokeLinecap="round"
            opacity={0.2 + index * 0.08}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
});

export { MagneticField };
