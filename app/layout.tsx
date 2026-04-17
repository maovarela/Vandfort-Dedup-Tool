import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vandfort Dedup",
  description:
    "Client-side CRM deduplication for HubSpot and Salesforce. Zero server storage.",
  robots: { index: false, follow: false },
};

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="min-h-screen bg-vf-bg text-vf-text font-body antialiased">
        <header className="border-b border-vf-border">
          <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
            <Link
              href="/"
              className="font-display text-xl font-bold tracking-tight text-vf-accent"
            >
              VANDFORT
            </Link>
            <ul className="flex items-center gap-6 text-sm text-vf-text-2">
              <li>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-vf-text"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/scan"
                  className="transition-colors hover:text-vf-text"
                >
                  New Scan
                </Link>
              </li>
              <li>
                <Link
                  href="/audit"
                  className="transition-colors hover:text-vf-text"
                >
                  Audit
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
        <footer className="border-t border-vf-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-vf-text-3">
            <span>All data stays in your browser.</span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
