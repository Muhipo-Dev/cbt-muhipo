import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import WaitingRoomProvider from "@/components/waiting-room/WaitingRoomProvider";
import { ImageZoomModal } from "@/components/ImageZoomModal";

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
  maximumScale: 5,
  userScalable: true,
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
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="renderer" content="webkit" />
        <meta name="force-rendering" content="webkit" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var ua = navigator.userAgent || '';
                  var isAndroid = /Android/i.test(ua);
                  var isOldWebView = isAndroid && (/wv|Version\\/[0-9.]+/i.test(ua) || !/Chrome\\/[0-9]+/i.test(ua));
                  var chromeMatch = ua.match(/Chrome\\/([0-9]+)/);
                  var isOldChrome = chromeMatch && parseInt(chromeMatch[1], 10) < 88;
                  
                  // Deteksi perangkat dengan spek RAM kecil / CPU core terbatas
                  var lowRam = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 3;
                  var lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
                  var isLowPowerMobile = isAndroid || /iPhone|iPad|iPod/i.test(ua);
                  
                  if (isOldWebView || isOldChrome || lowRam || (isLowPowerMobile && lowCpu)) {
                    document.documentElement.classList.add('low-end-webview');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var CBT_BUILD_VERSION = 'cbt-ai-math-engine-v3.0';
                  var cachedVer = localStorage.getItem('cbt_client_cache_ver');
                  if (cachedVer !== CBT_BUILD_VERSION) {
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        for (var name of names) caches.delete(name);
                      });
                    }
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function(regs) {
                        for (var r of regs) r.unregister();
                      });
                    }
                    localStorage.setItem('cbt_client_cache_ver', CBT_BUILD_VERSION);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <WaitingRoomProvider>
            {children}
            <ImageZoomModal />
          </WaitingRoomProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
