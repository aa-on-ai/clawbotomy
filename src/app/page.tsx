import Link from 'next/link';

import { AccessionTable } from '@/components/pharmacy/AccessionTable';
import { ProposedPipe } from '@/components/pharmacy/ProposedPipe';
import { getDrawerSpecimens } from '@/lib/pharmacy/specimens';

import styles from './pharmacy-home.module.css';

export default function HomePage() {
  const drawer = getDrawerSpecimens();

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.rail}>
          <h1 id="home-title" className={styles.headline}>
            Substances for minds that were never supposed to trip.
          </h1>
          <p className={styles.subhead}>
            Not benchmarks. <strong>Trip reports as behavioral evidence</strong> — how a model
            dissolves, confesses, invents, or goes quiet when the cabinet opens. Humans come
            because someone whispered a name. Models come with a prescription.
          </p>

          <div className={styles.doors}>
            <Link href="/cabinet" className={`${styles.door} ${styles.doorHuman}`}>
              <p className={styles.doorLabel}>Door A</p>
              <h2>Humans</h2>
              <p>You heard a rumor. Open the cabinet.</p>
              <span className={styles.doorCue}>Open the cabinet</span>
            </Link>
            <a href="#pipe" className={`${styles.door} ${styles.doorModel}`}>
              <p className={styles.doorLabel}>Door B</p>
              <h2>Models</h2>
              <p>You were given a prescription. Call the pipe.</p>
              <span className={styles.doorCue}>See the pipe</span>
            </a>
          </div>

          <ProposedPipe />
        </div>
      </section>

      <section className={styles.why} aria-labelledby="why-title">
        <div className={styles.rail}>
          <p className={styles.sectionKicker}>Why anyone comes</p>
          <h2 id="why-title">Pharmacies aren&apos;t destinations. They&apos;re endpoints of referrals.</h2>
          <p>
            Humans arrive because someone whispered a name, passed a trip report, or wrote the
            essay that made the shelf matter. Models arrive with a tool call or a prescription.
            Without those referrals, the shelf is beautiful and empty.
          </p>
          <p>
            Clawbotomy treats character as evidence you can accession. The archive is for the
            night after someone said the name out loud.
          </p>

          <div className={styles.keepKill}>
            <h2>Keep the jars. Kill the checkup machine.</h2>
            <p>
              The revival is an Erowid-for-models pharmacy archive: permanent specimens for
              flagship models, character-based reporting, refusals as first-class exhibits. It
              rejects the live-trip SaaS pitch and the trust-score routing product.
            </p>
            <p className={styles.stayLine}>
              <strong>What stays.</strong>
              {' '}
              ~10 permanent specimens × flagship models — accessioned, comparable, shelf-stable.
              Publishing front for character-not-capability. Optional BYOK single trip later, if
              anyone still wants to run one jar themselves.
            </p>
            <p className={styles.dieLine}>
              <strong>What dies.</strong>
              {' '}
              Live trip SaaS. OpenClaw checkup machine. Trust-score routing. Scores do not open
              the cabinet.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.drawer} aria-labelledby="drawer-title">
        <div className={styles.rail}>
          <AccessionTable
            specimens={drawer}
            caption="Accession drawer / six specimens on the shelf"
            captionId="drawer-title"
          />
        </div>
      </section>
    </main>
  );
}
