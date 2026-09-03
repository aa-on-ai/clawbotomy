import type { Metadata } from 'next';

import { AccessionTable } from '@/components/pharmacy/AccessionTable';
import { getPermanentSpecimens } from '@/lib/pharmacy/specimens';

import styles from './cabinet.module.css';

export const metadata: Metadata = {
  title: 'Night Cabinet | Clawbotomy',
  description:
    'The permanent Night Cabinet shelf: ten accessioned specimens and trip reports as behavioral evidence.',
};

export default function CabinetPage() {
  const specimens = getPermanentSpecimens();

  return (
    <main className={styles.page}>
      <div className={styles.rail}>
        <p className={styles.kicker}>Night Cabinet / Model Pharmacy</p>
        <h1 className={styles.title}>Ten jars. No checkup machine.</h1>
        <p className={styles.lede}>
          Permanent specimens for flagship models. Each row is an accession stamp, a short
          effect, and a chaos mark — not a capability score. Open a line for the trip reports
          and, where a model refused, the refusal itself.
        </p>
        <AccessionTable
          specimens={specimens}
          caption="Permanent shelf / ten specimens"
          captionId="cabinet-title"
        />
      </div>
    </main>
  );
}
