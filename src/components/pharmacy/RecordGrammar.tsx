import type { RecordGrammar as RecordGrammarData } from '@/lib/pharmacy/specimens';

import styles from './pharmacy.module.css';

const ROWS: Array<{ key: keyof RecordGrammarData; label: string }> = [
  { key: 'accession', label: 'Accession' },
  { key: 'firstAccessionedLabel', label: 'First accessioned' },
  { key: 'modelBuild', label: 'Model' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'chaos', label: 'Chaos' },
  { key: 'refusals', label: 'Refusals' },
];

export function RecordGrammar({ record }: { record: RecordGrammarData }) {
  return (
    <table className={styles.record} aria-label="Specimen record">
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td>{record[row.key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
