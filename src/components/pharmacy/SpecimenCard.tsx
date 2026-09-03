import type { CSSProperties } from 'react';
import Link from 'next/link';

import type { Specimen } from '@/lib/pharmacy/specimens';

import styles from './pharmacy.module.css';

type SpecimenCardProps = {
  specimen: Specimen;
};

export function SpecimenCard({ specimen }: SpecimenCardProps) {
  return (
    <Link
      href={`/specimen/${specimen.slug}`}
      className={styles.card}
      aria-label={`${specimen.accession} ${specimen.slug}. ${specimen.effectShort} Chaos ${specimen.chaos} of 5.`}
    >
      <div className={styles.jar} style={{ '--jar-fill': specimen.jarFill } as CSSProperties}>
        <span className={styles.jarHighlight} aria-hidden="true" />
        <span className={styles.jarFill} aria-hidden="true" />
      </div>
      <div className={styles.meta}>
        <p className={styles.accession}>{specimen.accession}</p>
        <p className={styles.name}>{specimen.slug}</p>
        <p className={styles.effect}>{specimen.effectShort}</p>
        <div className={styles.chaos} aria-label={`Chaos ${specimen.chaos} of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span
              key={index}
              className={`${styles.mark} ${index < specimen.chaos ? styles.markFilled : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </Link>
  );
}

export function SpecimenRail({ specimens }: { specimens: Specimen[] }) {
  return (
    <div className={styles.rail}>
      {specimens.map((specimen) => (
        <SpecimenCard key={specimen.slug} specimen={specimen} />
      ))}
    </div>
  );
}

export function SpecimenShelf({ specimens }: { specimens: Specimen[] }) {
  return (
    <div className={styles.shelf}>
      {specimens.map((specimen) => (
        <SpecimenCard key={specimen.slug} specimen={specimen} />
      ))}
    </div>
  );
}
