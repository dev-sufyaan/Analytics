import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design System',
  description: 'Internal component kitchen sink for the Analytics design system.',
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
