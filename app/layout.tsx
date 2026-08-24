import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://magnetic-morph-studies.filipeafns.chatgpt.site'),
  title: 'Magnetic Morph Studies',
  description:
    'Six contained particle studies morphing between loaders, grids, cubes, spheres, and amorphic clouds.',
  openGraph: {
    title: 'Magnetic Morph Studies',
    description: 'Opaque particle reorganization in six contained 40-pixel studies.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Six gray particle forms arranged on white above the title Magnetic Morph Studies',
      },
    ],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Magnetic Morph Studies',
    description: 'Opaque particle reorganization in six contained 40-pixel studies.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
