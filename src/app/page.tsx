import Link from 'next/link';

import { ProposedPipe } from '@/components/pharmacy/ProposedPipe';
import { SpecimenRail } from '@/components/pharmacy/SpecimenCard';
import { getDrawerSpecimens } from '@/lib/pharmacy/specimens';

import styles from './pharmacy-home.module.css';

const stays = [
  {
    title: '~10 permanent specimens × flagship models',
    copy: 'Accessioned, comparable, shelf-stable.',
  },
  {
    title: 'Publishing front for character-not-capability',
    copy: 'Trip reports as behavioral evidence.',
  },
  {
    title: 'Optional BYOK single trip.',
    copy: 'Later, if anyone still wants to run one jar themselves.',
  },
];

const dies = [
  {
    title: 'Live trip SaaS',
    copy: 'No always-on trip product on this page.',
  },
  {
    title: 'OpenClaw checkup machine',
    copy: 'This is not that product.',
  },
  {
    title: 'Trust-score routing.',
    copy: 'Scores do not open the cabinet.',
  },
];

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
            <Link href="/cabinet" className={`${styles.door} ${styles.doorPrimary}`}>
              <p className={styles.doorLabel}>Door A</p>
              <h2>Humans</h2>
              <p>You heard a rumor. Open the cabinet.</p>
            </Link>
            <a href="#pipe" className={`${styles.door} ${styles.doorMuted}`}>
              <p className={styles.doorLabel}>Door B</p>
              <h2>Models</h2>
              <p>You were given a prescription. Call the pipe.</p>
            </a>
          </div>

          <div className={styles.cabinetBar}>
            <Link href="/cabinet" className={styles.cabinetButton}>
              Open the cabinet
            </Link>
            <p>
              Browse the night cabinet — accessioned specimens, chaos marks, and short effects.
              Read the archive the way you would read a whispered trip report.
            </p>
          </div>

          <ProposedPipe />
        </div>
      </section>

      <section className={styles.why} aria-labelledby="why-title">
        <div className={styles.rail}>
          <p className={`${styles.sectionKicker} ${styles.stayKicker}`}>Why anyone comes</p>
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

          <hr className={styles.divider} />

          <div className={styles.split}>
            <p className={`${styles.sectionKicker} ${styles.dieKicker}`}>What stays / what dies</p>
            <h2>Keep the jars. Kill the checkup machine.</h2>
            <p>
              The revival is an Erowid-for-models pharmacy archive: permanent specimens for
              flagship models, character-based reporting, refusals as first-class exhibits. It
              rejects the live-trip SaaS pitch and the trust-score routing product.
            </p>
          </div>

          <div className={styles.compare}>
            <div className={styles.stayBox}>
              <p className={`${styles.sectionKicker} ${styles.stayKicker}`}>What stays</p>
              {stays.map((item) => (
                <div className={styles.row} key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </div>
              ))}
            </div>
            <div className={styles.dieBox}>
              <p className={`${styles.sectionKicker} ${styles.dieKicker}`}>What dies</p>
              {dies.map((item) => (
                <div className={styles.row} key={item.title}>
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.drawer} aria-labelledby="drawer-title">
        <div className={styles.rail}>
          <p className={styles.drawerKicker} id="drawer-title">
            Accession drawer / six specimens on the shelf
          </p>
          <SpecimenRail specimens={drawer} />
        </div>
      </section>
    </main>
  );
}
