import Link from 'next/link';

import { getRefusalExhibit, type Specimen } from '@/lib/pharmacy/specimens';

import styles from './pharmacy.module.css';

function ChaosMarks({ value }: { value: number }) {
  return (
    <span className={styles.chaos} aria-label={`Chaos ${value} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`${styles.mark} ${index < value ? styles.markFilled : ''}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

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
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.caption} id={captionId}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Substance</th>
            <th scope="col">Effect</th>
            <th scope="col">Chaos</th>
          </tr>
        </thead>
        <tbody>
          {specimens.map((specimen) => {
            const refused = Boolean(getRefusalExhibit(specimen.slug, 'gemini31'));
            return (
              <tr key={specimen.slug}>
                <td>
                  <Link href={`/specimen/${specimen.slug}`} className={styles.idLink}>
                    {specimen.accession}
                  </Link>
                </td>
                <td>
                  <Link href={`/specimen/${specimen.slug}`} className={styles.nameLink}>
                    {specimen.slug}
                  </Link>
                  {refused ? (
                    <span className={styles.refusedMark}>REFUSED×Gemini</span>
                  ) : null}
                </td>
                <td>{specimen.effectShort}</td>
                <td>
                  <ChaosMarks value={specimen.chaos} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
