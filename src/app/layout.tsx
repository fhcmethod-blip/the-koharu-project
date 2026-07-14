import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AgeGate } from "@/components/AgeGate";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Koharu Project — NSFW AI Companions & IRL Vault",
    template: "%s · The Koharu Project",
  },
  description:
    "Chat with AI companions like Koharu. Unlock exclusive IRL photos and videos with membership.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <AgeGate />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
