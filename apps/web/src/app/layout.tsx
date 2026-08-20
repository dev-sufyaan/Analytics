import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Aether — Privacy-First Website Analytics',
  description: 'Simple privacy-first analytics. No cookies. No fingerprint theatre. A dashboard you actually enjoy opening.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-white text-black min-h-screen selection:bg-[#c8f6f9] selection:text-black">
        {children}
      </body>
    </html>
  );
}
