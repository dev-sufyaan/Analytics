import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Dashboard',
  description: 'A public Analytics dashboard shared by its owner.',
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
