import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/common/Providers';

export const metadata: Metadata = {
  title: 'Kitty & Star — StudyPartner',
  description: 'Gamified dual-accountability study ecosystem, focus timer, and distraction blocker web companion.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
