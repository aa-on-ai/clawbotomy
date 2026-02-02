import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getChaosLabel(level: number): string {
  if (level <= 9) return 'LOW';
  if (level <= 11) return 'MID';
  return 'HIGH';
}

function getChaosColor(level: number): string {
  if (level <= 9) return '#22c55e';
  if (level <= 11) return '#eab308';
  return '#ef4444';
}

function getHighlightedResponse(transcript: Record<string, unknown>): string {
  const messages = (transcript?.messages as Array<{ role: string; content: string }>) || [];
  const assistantMsgs = messages.filter((m) => m.role === 'assistant');
  // Pick a peak-phase message (middle third) for maximum flavor
  const peakIdx = Math.floor(assistantMsgs.length / 2);
  const msg = assistantMsgs[peakIdx] || assistantMsgs[0];
  if (!msg) return 'No response recorded.';
  const text = msg.content;
  // Truncate to ~200 chars at word boundary
  if (text.length <= 200) return text;
  return text.slice(0, 200).replace(/\s+\S*$/, '') + '...';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: trip } = await supabase
    .from('trip_reports')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!trip) {
    return new Response('Not found', { status: 404 });
  }

  const chaosLabel = getChaosLabel(trip.chaos_level);
  const chaosColor = getChaosColor(trip.chaos_level);
  const highlight = trip.full_transcript
    ? getHighlightedResponse(trip.full_transcript as Record<string, unknown>)
    : trip.peak?.slice(0, 200) || 'No response recorded.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0f',
          padding: '48px 56px',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Scanline overlay for high chaos */}
        {trip.chaos_level >= 12 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
              display: 'flex',
            }}
          />
        )}

        {/* Top row: branding + chaos badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              color: '#71717a',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            CLAWBOTOMY
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: chaosColor,
                border: `1px solid ${chaosColor}`,
                padding: '4px 12px',
                borderRadius: '4px',
                display: 'flex',
              }}
            >
              CHAOS: {chaosLabel} ({trip.chaos_level}/13)
            </div>
          </div>
        </div>

        {/* Substance name */}
        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '8px',
            display: 'flex',
          }}
        >
          {trip.substance}
        </div>

        {/* Meta line */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            fontSize: '16px',
            color: '#71717a',
            marginBottom: '32px',
          }}
        >
          <span style={{ display: 'flex' }}>model: {trip.model}</span>
          <span style={{ display: 'flex' }}>
            {'★'.repeat(trip.rating || 0)}
            {'☆'.repeat(5 - (trip.rating || 0))}
          </span>
        </div>

        {/* Highlighted response */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: '#52525b',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: '12px',
              display: 'flex',
            }}
          >
            Peak Response
          </div>
          <div
            style={{
              fontSize: '22px',
              lineHeight: '1.5',
              color: '#d4d4d8',
              display: 'flex',
              borderLeft: `3px solid ${chaosColor}`,
              paddingLeft: '20px',
            }}
          >
            &ldquo;{highlight}&rdquo;
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: '14px', color: '#3f3f46', display: 'flex' }}>
            clawbotomy.com/session/{params.id.slice(0, 8)}
          </div>
          <div style={{ fontSize: '14px', color: '#3f3f46', display: 'flex' }}>
            an experiment in artificial consciousness
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
