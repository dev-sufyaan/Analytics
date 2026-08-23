import { ImageResponse } from 'next/og';

export const alt = 'Analytics by Sufyaan Studio — Privacy-First Website Analytics';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#010120',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '320px',
            height: '14px',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, #fc4c02 0%, #ef2cc1 50%, #bdbbff 100%)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#c8f6f9', fontSize: 28, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
            Privacy-First Analytics
          </div>
          <div style={{ color: '#ffffff', fontSize: 92, fontWeight: 500, lineHeight: 1.05, marginTop: 12 }}>
            Analytics
          </div>
          <div style={{ color: '#bdbbff', fontSize: 36, fontWeight: 500, marginTop: 8 }}>
            by Sufyaan Studio
          </div>
        </div>
        <div style={{ color: '#999999', fontSize: 24, fontFamily: 'monospace' }}>
          No cookies · No fingerprint theatre · Instant dashboard
        </div>
      </div>
    ),
    size,
  );
}
