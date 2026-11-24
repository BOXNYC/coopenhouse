import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b161a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {/* Root Suspense boundary: lets any page use useParams/useSearchParams/await params under cacheComponents. */}
            <Suspense fallback={<div className="flex-1 animate-pulse bg-paper" aria-busy="true" />}>{children}</Suspense>
          </AuthProvider>
        </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
