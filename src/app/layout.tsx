import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import WaitingRoomProvider from "@/components/waiting-room/WaitingRoomProvider";

export const metadata: Metadata = {
  title: "CBT v2 SMA Muhipo — SMA Muhammadiyah 1 Ponorogo",
  description: "Sistem Ujian Berbasis Komputer Modern SMA Muhammadiyah 1 Ponorogo (Versi 2)",
  icons: {
    icon: "/pic_logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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

