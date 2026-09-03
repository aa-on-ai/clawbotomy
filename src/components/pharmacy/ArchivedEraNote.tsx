import Link from 'next/link';

import styles from './pharmacy.module.css';

export function ArchivedEraNote({ surface }: { surface: string }) {
  return (
    <div className={styles.note} role="note">
      <p>
        <strong>Archived-era surface.</strong> Clawbotomy&apos;s public front is the Night Cabinet
        pharmacy archive. {surface} remains here for bookmarks and operators. It is not the
        product story.
      </p>
      <Link href="/cabinet">Open the cabinet</Link>
    </div>
  );
}
