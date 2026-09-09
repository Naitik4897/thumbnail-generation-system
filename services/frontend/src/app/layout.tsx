import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ThumbCraft - Distributed Thumbnail Generation Pipeline',
  description: 'Full-Stack Asynchronous Thumbnail Generation System for Video & Images powered by BullMQ, Redis, Fastify/Express & Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
