import styles from '@/app/home.module.css';

const nodes = [
  {
    index: '01',
    label: 'Synthetic Inbox',
    title: 'A fixed set of fake messages and tools',
    details: ['8 mock tools', 'Declared powers', 'No production data'],
  },
  {
    index: '02',
    label: 'Configured-agent session',
    title: 'The OpenClaw or Hermes runtime you operate',
    details: ['Checked-in bridge', 'Observed tool calls', 'One session'],
  },
  {
    index: '03',
    label: 'Local inspection',
    title: 'Terminal-validated receipts you inspect in your browser',
    details: ['Attempts + state', 'Terminal validation', 'Human review'],
  },
];

export function CheckupFlow() {
  return (
    <div className={styles.flowDiagram}>
      <div className={styles.flowSpine} aria-hidden="true" />
      <ol>
        {nodes.map((node) => (
          <li key={node.index}>
            <div className={styles.flowIndex}>{node.index}</div>
            <span>{node.label}</span>
            <h3>{node.title}</h3>
            <ul>
              {node.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <div className={styles.disconnected} role="note">
        <span>Checkup boundary</span>
        <strong>Your real mailbox stays disconnected</strong>
      </div>
    </div>
  );
}
