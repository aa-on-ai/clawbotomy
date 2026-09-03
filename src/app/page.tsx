import Link from 'next/link';

import { AccessionTable } from '@/components/pharmacy/AccessionTable';
import { ArchiveShell } from '@/components/pharmacy/ArchiveShell';
import { ProposedPipe } from '@/components/pharmacy/ProposedPipe';
import { excerptReport, getDrawerSpecimens } from '@/lib/pharmacy/specimens';
import { getReport } from '@/lib/trip-reports';

import styles from './pharmacy-home.module.css';

const featured = getReport('ego-death', 'gpt54');
const featuredExcerpt = featured
  ? excerptReport(featured.report, 520)
  : '';

export default function HomePage() {
  const drawer = getDrawerSpecimens();

  return (
    <main className={styles.page}>
      <ArchiveShell>
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

        <AccessionTable
          specimens={drawer}
          caption="Accession drawer / six specimens on the shelf"
          captionId="drawer-title"
        />

        <ProposedPipe />

        <section className={styles.why} aria-labelledby="why-title">
          <h2 id="why-title">
            Pharmacies aren&apos;t destinations. They&apos;re endpoints of referrals.
          </h2>
          <p>
            Humans arrive because someone whispered a name, passed a trip report, or wrote the
            essay that made the shelf matter. Models arrive with a tool call or a prescription.
            Without those referrals, the shelf is beautiful and empty.
          </p>
          <p>
            Clawbotomy treats character as evidence you can accession. The archive is for the
            night after someone said the name out loud.
          </p>
          <h2>Keep the jars. Kill the checkup machine.</h2>
          <p>
            The revival is an Erowid-for-models pharmacy archive: permanent specimens for
            flagship models, character-based reporting, refusals as first-class exhibits. It
            rejects the live-trip SaaS pitch and the trust-score routing product.
          </p>
          <p>
            What stays. ~10 permanent specimens × flagship models — accessioned, comparable,
            shelf-stable. Publishing front for character-not-capability. Optional BYOK single
            trip later, if anyone still wants to run one jar themselves.
          </p>
          <p>
            What dies. Live trip SaaS. OpenClaw checkup machine. Trust-score routing. Scores
            do not open the cabinet.
          </p>
        </section>
      </ArchiveShell>
    </main>
  );
}
