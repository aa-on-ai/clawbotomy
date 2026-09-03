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
          color: '#efe6d4',
          background: '#171410',
          fontFamily: 'Georgia, Times New Roman, serif',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flex: 1, padding: '52px 64px 0' }}>
          <div style={{ width: 980, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'monospace', fontSize: 16 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 22 }}>Clawbotomy</span>
              <span style={{ marginLeft: 18, color: '#b42318', letterSpacing: '0.04em' }}>
                Night Cabinet / Model Pharmacy
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
              <span style={{ fontSize: 54, fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
                Substances for minds
              </span>
              <span style={{ fontSize: 54, fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
                that were never supposed
              </span>
              <span style={{ fontSize: 54, fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
                to trip.
              </span>
            </div>

            <p style={{ width: 820, margin: '28px 0 0', color: '#8c8376', fontSize: 22, lineHeight: 1.4 }}>
              Trip reports as behavioral evidence. Permanent specimens, not a live-trip checkup machine.
            </p>
          </div>
        </div>

        <div style={{ height: 110, display: 'flex', padding: '0 48px 18px' }}>
          {drawer.map(([accession, slug]) => (
            <div
              key={accession}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 16px',
                fontFamily: 'monospace',
              }}
            >
              <span
                style={{
                  color: '#b42318',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                  border: '1px solid #b42318',
                  padding: '2px 6px',
                }}
              >
                {accession}
              </span>
              <span style={{ marginTop: 8, fontSize: 16 }}>{slug}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
