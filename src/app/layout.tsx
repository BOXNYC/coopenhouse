import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CoOpenHouse", template: "%s | CoOpenHouse" },
  description:
    "Find a verified, licensed agent to cover your open house, or pick up open houses near you on your schedule.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f5565",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>
          <AuthProvider>
            {/* Root Suspense boundary: lets any page use useParams/useSearchParams/await params under cacheComponents. */}
            <Suspense fallback={<div className="flex-1 animate-pulse bg-paper" aria-busy="true" />}>{children}</Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
