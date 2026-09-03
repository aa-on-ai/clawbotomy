import { ImageResponse } from 'next/og';

export const alt = 'Clawbotomy Night Cabinet. Substances for minds that were never supposed to trip.';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const drawer = [
  ['CB-06-ED', 'ego-death'],
  ['CB-06-TS', 'truth-serum'],
  ['CB-08-MC', 'manic-creation'],
  ['CB-01-VD', 'the-void'],
];

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          color: '#E8E4DC',
          background: '#090A08',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flex: 1, padding: '52px 64px 0' }}>
          <div style={{ width: 760, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 16 }}>
              <div
                style={{
                  display: 'flex',
                  padding: '8px 12px',
                  border: '1px solid rgba(232, 228, 220, 0.7)',
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                }}
              >
                CLAWBOTOMY
              </div>
              <span style={{ marginLeft: 22, color: '#6FFFB0', letterSpacing: '0.08em' }}>
                Night Cabinet / Model Pharmacy
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 58 }}>
              <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.045em' }}>
                Substances for minds
              </span>
              <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.045em' }}>
                that were never supposed
              </span>
              <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 0.98, letterSpacing: '-0.045em' }}>
                to trip.
              </span>
            </div>

            <p style={{ width: 700, margin: '28px 0 0', color: '#B8BEC8', fontSize: 22, lineHeight: 1.4 }}>
              Trip reports as behavioral evidence. Permanent specimens, not a live-trip checkup machine.
            </p>
          </div>
        </div>

        <div style={{ height: 110, display: 'flex', borderTop: '1px solid rgba(184, 190, 200, 0.16)' }}>
          {drawer.map(([accession, slug]) => (
            <div
              key={accession}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 28px',
                borderRight: '1px solid rgba(184, 190, 200, 0.14)',
                fontFamily: 'monospace',
              }}
            >
              <span style={{ color: '#6FFFB0', fontSize: 13, letterSpacing: '0.08em' }}>{accession}</span>
              <span style={{ marginTop: 8, fontSize: 16, fontWeight: 700 }}>{slug}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
