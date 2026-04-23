import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Moonlit — Calming bedtime stories for your little one',
  description:
    'Personalized, magical bedtime stories that help children relax and drift gently to sleep.',
};

export const viewport: Viewport = {
  themeColor: '#0f0a1f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="stars relative min-h-screen">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
