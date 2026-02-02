import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CertTracker - Insurance Verification for Event Venues",
  description: "Automatically verify ACORD 25 Certificate of Insurance forms from vendors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
