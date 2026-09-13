import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import WaitingRoomProvider from "@/components/waiting-room/WaitingRoomProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CBT MUHIPO — SMA Muhammadiyah 1 Ponorogo",
  description: "Sistem Ujian Berbasis Komputer Modern SMA Muhammadiyah 1 Ponorogo",
  icons: {
    icon: "/pic_logo.png",
  },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col antialiased">
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

