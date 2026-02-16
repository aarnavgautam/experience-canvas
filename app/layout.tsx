import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Experience Canvas',
  description: 'Private experience canvas for journaling and collages'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4">
          {children}
        </div>
      </body>
    </html>
  );
}

