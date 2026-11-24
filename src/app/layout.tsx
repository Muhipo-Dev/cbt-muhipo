import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import WaitingRoomProvider from "@/components/waiting-room/WaitingRoomProvider";

export const metadata: Metadata = {
  title: "CBT v2 SMA Muhipo — SMA Muhammadiyah 1 Ponorogo",
  description: "Sistem Ujian Berbasis Komputer Modern SMA Muhammadiyah 1 Ponorogo (Versi 2)",
  applicationName: "CBT Muhipo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CBT Muhipo",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  icons: {
    icon: "/pic_logo.png",
    apple: "/pic_logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <WaitingRoomProvider>
            {children}
          </WaitingRoomProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
