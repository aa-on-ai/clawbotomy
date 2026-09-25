'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type FlowPicture = {
  src: string;
  alt: string;
  label: string;
  caption: string;
};

export function ArticleImageFlow({ picture, children }: { picture: FlowPicture; children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const body = bodyRef.current;
    const flowFloat = floatRef.current;
    if (!shell || !body || !flowFloat) return;

    const desktop = window.matchMedia('(min-width: 821px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let bodyTop = 0;
    let maxTravel = 0;
    let lastTravel = -1;
    let measuredWidth = -1;

    const measure = () => {
      if (!desktop.matches || reducedMotion.matches) {
        flowFloat.style.removeProperty('--flow-travel');
        lastTravel = -1;
        return;
      }

      // Measure from a stable origin, not the previous scroll-driven float.
      // Otherwise clearance can grow the article and extend its own travel.
      flowFloat.style.setProperty('--flow-travel', '0px');
      lastTravel = -1;
      const shellRect = shell.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const floatRect = flowFloat.getBoundingClientRect();
      const offset = Math.max(0, bodyRect.left - shellRect.left);
      const artWidth = Math.max(260, bodyRect.left - shellRect.left);

      measuredWidth = shellRect.width;
      bodyTop = bodyRect.top + window.scrollY;
      const boundary = body.querySelector<HTMLElement>(
        ':scope > .fieldCard, :scope > .storyQuote, :scope > figure',
      );
      const boundaryTop = boundary
        ? boundary.getBoundingClientRect().top - bodyRect.top - 32
        : body.scrollHeight;
      maxTravel = Math.max(0, boundaryTop - floatRect.height);
      flowFloat.style.setProperty('--flow-offset', `${offset}px`);
      flowFloat.style.setProperty('--flow-art-width', `${artWidth}px`);
      update();
    };

    const update = () => {
      frame = 0;
      if (!desktop.matches || reducedMotion.matches) return;
      const travel = Math.round(Math.min(maxTravel, Math.max(0, window.scrollY + 26 - bodyTop)));
      if (travel === lastTravel) return;
      lastTravel = travel;
      flowFloat.style.setProperty('--flow-travel', `${travel}px`);
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - measuredWidth) > 0.5) measure();
    });
    resizeObserver.observe(shell);
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', measure);
    desktop.addEventListener('change', measure);
    reducedMotion.addEventListener('change', measure);
    measure();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', measure);
      desktop.removeEventListener('change', measure);
      reducedMotion.removeEventListener('change', measure);
    };
  }, []);

  return (
    <div className="articleShell articleShellImageFlow" ref={shellRef}>
      <div className="articleBody articleBodyImageFlow" ref={bodyRef}>
        <div className="articleFlowFloat" ref={floatRef} data-testid="article-image-flow">
          <figure className="storyFigure articleFlowFigure">
            <Image src={picture.src} width={1536} height={1024} unoptimized priority alt={picture.alt} />
            <figcaption><strong>{picture.label}</strong>{' '}<span>{picture.caption}</span></figcaption>
          </figure>
        </div>
        {children}
      </div>
    </div>
  );
}
