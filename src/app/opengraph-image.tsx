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
          display: 'flex',
          flexDirection: 'column',
          color: '#c8c4b8',
          background: '#101015',
          fontFamily: 'Verdana, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flex: 1, padding: '48px 56px 0' }}>
          <div style={{ width: 980, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 16 }}>
              <span>Clawbotomy</span>
              <span style={{ marginLeft: 16 }}>Night Cabinet / Model Pharmacy</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
                Substances for minds
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
                that were never supposed
              </span>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.15 }}>
                to trip.
              </span>
            </div>
            <p style={{ width: 820, margin: '24px 0 0', fontSize: 20, lineHeight: 1.4 }}>
              Trip reports as behavioral evidence. Permanent specimens, not a live-trip checkup machine.
            </p>
          </div>
        </div>
        <div style={{ height: 100, display: 'flex', padding: '0 48px 20px' }}>
          {drawer.map(([accession, slug]) => (
            <div
              key={accession}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 12px',
                fontFamily: 'Courier New, Courier, monospace',
              }}
            >
              <span style={{ fontSize: 13 }}>{accession}</span>
              <span style={{ marginTop: 6, fontSize: 16 }}>{slug}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
