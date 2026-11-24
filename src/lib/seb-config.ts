/**
 * Generator File Konfigurasi Safe Exam Browser (.seb)
 * Format plist XML standar SEB yang didukung di:
 * - Safe Exam Browser for iOS (iPhone & iPad di App Store)
 * - Safe Exam Browser for Android (Google Play Store)
 * - Safe Exam Browser for Windows & macOS
 */

export interface SEBConfigOptions {
  startUrl: string;
  title?: string;
  quitPassword?: string;
  allowPreferencesWindow?: boolean;
  allowReload?: boolean;
  showReloadWarning?: boolean;
  allowSpellCheck?: boolean;
}

export function generateSEBConfigFile(options: SEBConfigOptions): string {
  const {
    startUrl,
    title = 'CBT MUHIPO Exam',
    quitPassword = '',
    allowPreferencesWindow = false,
    allowReload = true,
  } = options;

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>originatorVersion</key>
    <string>SEB_iOS_Android_CBT_MUHIPO</string>
    <key>startURL</key>
    <string>${startUrl}</string>
    <key>sendBrowserExamKey</key>
    <true/>
    <key>browserExamKey</key>
    <string></string>
    <key>browserViewMode</key>
    <integer>0</integer>
    <key>browserWindowAllowReload</key>
    <${allowReload}/>
    <key>showReloadButton</key>
    <true/>
    <key>showReloadWarning</key>
    <false/>
    <key>allowPreferencesWindow</key>
    <${allowPreferencesWindow}/>
    <key>showTaskBar</key>
    <true/>
    <key>taskBarHeight</key>
    <integer>40</integer>
    <key>touchOptimized</key>
    <true/>
    <key>allowDownPriorToExam</key>
    <false/>
    <key>allowSpellCheck</key>
    <false/>
    <key>allowDictionaryLookup</key>
    <false/>
    <key>allowScreenSharing</key>
    <false/>
    <key>enableAltEsc</key>
    <false/>
    <key>enableAltF4</key>
    <false/>
    <key>enableStartMenu</key>
    <false/>
    <key>enableMiddleMouse</key>
    <false/>
    <key>enableRightMouse</key>
    <false/>
    <key>hookKeys</key>
    <true/>
    <key>allowQuit</key>
    <true/>
    <key>quitURL</key>
    <string></string>
    <key>quitURLConfirm</key>
    <true/>
    <key>hashedQuitPassword</key>
    <string>${quitPassword}</string>
    <key>title</key>
    <string>${title}</string>
    <key>mobileAllowSingleAppMode</key>
    <true/>
    <key>mobileAllowGuidedAccess</key>
    <true/>
    <key>mobileAllowCustomHeaders</key>
    <true/>
    <key>mobileShowSettings</key>
    <false/>
    <key>allowBrowsingBackForward</key>
    <false/>
    <key>allowUserAppFolderInstall</key>
    <false/>
  </dict>
</plist>`;
}

/**
 * Mengubah URL HTTP/HTTPS menjadi skema langsung peluncur SEB:
 * - seb://example.com/api/seb/config
 * - sebs://example.com/api/seb/config (untuk HTTPS)
 */
export function getSEBProtocolUrl(httpUrl: string): string {
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace(/^https:\/\//i, 'sebs://');
  }
  if (httpUrl.startsWith('http://')) {
    return httpUrl.replace(/^http:\/\//i, 'seb://');
  }
  return `seb://${httpUrl}`;
}
