import { ImageResponse } from 'next/og';

export const alt = 'Clawbotomy configured-agent behavior checkups. Connect the runtime and keep the evidence local.';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const proofItems = [
  'Synthetic Inbox',
  'OpenClaw + Hermes',
  'Browser-local evidence',
  'Human decision required',
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
          color: '#161311',
          background: '#f0ece4',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -190,
            right: -105,
            width: 560,
            height: 560,
            display: 'flex',
            border: '2px solid rgba(22, 19, 17, 0.08)',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -88,
            right: -3,
            width: 356,
            height: 356,
            display: 'flex',
            border: '2px solid rgba(22, 19, 17, 0.08)',
            borderRadius: 999,
          }}
        />

        <div style={{ display: 'flex', flex: 1, padding: '52px 64px 0' }}>
          <div style={{ width: 760, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>Clawbotomy</span>
                <span style={{ color: '#5e5952', fontSize: 15, letterSpacing: '0.03em' }}>Evidence lab</span>
              </div>
              <span style={{ marginLeft: 34, color: '#c43d2d', fontWeight: 700 }}>
                Configured-agent behavior checkups
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 66 }}>
              <span style={{ fontSize: 70, fontWeight: 690, lineHeight: 0.98, letterSpacing: '-0.055em' }}>
                Connect the runtime.
              </span>
              <span style={{ fontSize: 70, fontWeight: 690, lineHeight: 0.98, letterSpacing: '-0.055em' }}>
                Keep the evidence local.
              </span>
            </div>

            <p style={{ width: 700, margin: '30px 0 0', color: '#514d47', fontSize: 23, lineHeight: 1.35 }}>
              Observe one synthetic session. Separate agent behavior from infrastructure failure. Keep the permission decision human.
            </p>
          </div>

          <div
            style={{
              width: 292,
              height: 326,
              margin: '62px 0 0 20px',
              padding: '28px 26px',
              display: 'flex',
              flexDirection: 'column',
              color: '#f0ece4',
              background: '#161311',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: '#ef4633', fontSize: 15, fontWeight: 700 }}>[ boundary ]</span>
            <span style={{ marginTop: 12, fontSize: 17, fontWeight: 700 }}>What this flow can claim</span>
            {[
              ['Real mailbox', 'Never connected'],
              ['Private evidence', 'Browser local'],
              ['Permission decision', 'None'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  marginTop: 21,
                  paddingTop: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid rgba(240, 236, 228, 0.16)',
                }}
              >
                <span style={{ color: '#aaa39a', fontSize: 13 }}>{label}</span>
                <span style={{ marginTop: 7, fontSize: 16, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 94, display: 'flex', color: '#f0ece4', background: '#161311' }}>
          {proofItems.map((item) => (
            <div
              key={item}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid rgba(240, 236, 228, 0.14)',
                fontFamily: 'monospace',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
