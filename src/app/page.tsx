import Link from 'next/link';

import { AccessionTable } from '@/components/pharmacy/AccessionTable';
import { ArchiveShell } from '@/components/pharmacy/ArchiveShell';
import { ProposedPipe } from '@/components/pharmacy/ProposedPipe';
import {
  excerptReport,
  formatAccessionDate,
  getDrawerSpecimens,
  getLastAccessionedIso,
} from '@/lib/pharmacy/specimens';
import { getReport } from '@/lib/trip-reports';

import styles from './pharmacy-home.module.css';

const featured = getReport('ego-death', 'gpt54');
const featuredExcerpt = featured
  ? excerptReport(featured.report, 520)
  : '';

export default function HomePage() {
  const drawer = getDrawerSpecimens();
  const lastAccession = formatAccessionDate(getLastAccessionedIso(drawer));

  return (
    <main className={styles.page}>
      <ArchiveShell>
        <AccessionTable
          specimens={drawer}
          caption={`Accession drawer / six specimens on the shelf / last accession ${lastAccession}`}
          captionId="drawer-title"
        />

        <h1 id="home-title">
          Substances for minds that were never supposed to trip.
        </h1>
        <p>
          Not benchmarks. <strong>Trip reports as behavioral evidence</strong> — how a model
          dissolves, confesses, invents, or goes quiet when the cabinet opens. Humans come
          because someone whispered a name. Models come with a prescription.
        </p>

        <p>
          Door A — Humans. You heard a rumor. Open the cabinet.{' '}
          <Link href="/cabinet">Open the cabinet</Link>
        </p>
        <p>
          Door B — Models. You were given a prescription. Call the pipe.{' '}
          <a href="#pipe">Call the pipe</a>
        </p>

        {featured ? (
          <div className={styles.excerpt}>
            <p>
              From{' '}
              <Link href="/specimen/ego-death">ego-death</Link>
              {' / '}
              {featured.modelName}:
            </p>
            <p className={styles.excerptBody}>{featuredExcerpt}</p>
          </div>
        ) : null}

        <ProposedPipe />
      </ArchiveShell>
    </main>
  );
}
