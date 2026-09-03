import Link from 'next/link';

import { chaosMark, getRefusalExhibit, type Specimen } from '@/lib/pharmacy/specimens';

import styles from './pharmacy.module.css';

export function AccessionTable({
  specimens,
  caption,
  captionId,
}: {
  specimens: Specimen[];
  caption: string;
  captionId?: string;
}) {
  return (
    <div className={styles.file}>
      <p className={styles.caption} id={captionId}>{caption}</p>
      <ol className={styles.slips}>
        {specimens.map((specimen) => {
          const refused = Boolean(getRefusalExhibit(specimen.slug, 'gemini31'));
          const mark = chaosMark(specimen.chaos);
          return (
            <li key={specimen.slug} className={styles.slip}>
              <Link href={`/specimen/${specimen.slug}`} className={styles.slipLink}>
                <span className={styles.stamp}>{specimen.accession}</span>
                <span className={styles.slipBody}>
                  <span className={styles.nameLink}>{specimen.slug}</span>
                  {refused ? (
                    <span className={styles.refusedMark}>REFUSED×Gemini</span>
                  ) : null}
                  <span className={styles.effect}>{specimen.effectShort}</span>
                </span>
                <span className={styles.chaos} aria-label={`Chaos ${specimen.chaos} of 5, ${mark}`}>
                  {mark}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
