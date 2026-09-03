import Link from 'next/link';

import { getPermanentSpecimens } from '@/lib/pharmacy/specimens';

import styles from './pharmacy.module.css';

export function ArchiveShell({ children }: { children: React.ReactNode }) {
  const index = getPermanentSpecimens();

  return (
    <div className={styles.shell}>
      <nav className={styles.index} aria-label="Specimen index">
        <p>Index</p>
        {index.map((specimen) => (
          <Link key={specimen.slug} href={`/specimen/${specimen.slug}`}>
            {specimen.slug}
          </Link>
        ))}
      </nav>
      <div className={styles.document}>{children}</div>
    </div>
  );
}
