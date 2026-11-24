import type { ReactNode } from 'react';
import "./globals.css";
import AuthGate from './components/AuthGate';

export const metadata = {
  title: "HerQuest Malaysia",
  description: "A side-quest platform connecting women with local opportunities.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}