import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGMS Workspace",
  description: "Internal knowledge base and projects for iGaming Managed Services",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
