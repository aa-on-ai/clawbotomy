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
          const mark = chaosMark(specimen.chaos);
          return (
            <tr key={specimen.slug}>
              <td>
                <Link href={`/specimen/${specimen.slug}`} className={styles.idLink}>
                  {specimen.accession}
                </Link>
              </td>
              <td>
                <Link href={`/specimen/${specimen.slug}`}>
                  {specimen.slug}
                </Link>
                {refused ? (
                  <span className={styles.refusedMark}> REFUSED×Gemini</span>
                ) : null}
              </td>
              <td>{specimen.effectShort}</td>
              <td aria-label={`Chaos ${specimen.chaos} of 5, ${mark}`}>{mark}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
