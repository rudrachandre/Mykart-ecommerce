'use client';

/**
 * global-error.tsx — True root-level error boundary for Next.js App Router.
 *
 * Unlike error.tsx (which only catches page-level errors), global-error.tsx
 * catches failures in the root layout itself (e.g. AuthProvider, CartProvider
 * hydration crashes). It must supply its own <html>/<body> tags.
 *
 * Without this file, layout-level crashes show Vercel's own generic
 * "This page couldn't load" error page instead of our custom UI.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              border: '1px solid #e5e7eb',
              borderRadius: 16,
              padding: '3rem 2rem',
              boxShadow: '0 1px 6px rgba(0,0,0,.06)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              An unexpected error occurred while loading this page. This is usually temporary —
              please try again.
            </p>

            {error && (
              <details style={{ textAlign: 'left', background: '#f3f4f6', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', userSelect: 'none' }}>
                  View Error Details (Debugging)
                </summary>
                <p style={{ color: '#dc2626', fontWeight: 'bold', margin: '0 0 4px' }}>{error.message || error.toString()}</p>
                {error.digest && <p style={{ color: '#6b7280', margin: '0 0 4px' }}>Digest: {error.digest}</p>}
                {error.stack && <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.8, margin: 0 }}>{error.stack}</pre>}
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.625rem 1.5rem',
                  borderRadius: 9999,
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  padding: '0.625rem 1.5rem',
                  borderRadius: 9999,
                  border: '1.5px solid #d1d5db',
                  color: '#111',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
