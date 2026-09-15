@echo off
title CBT MUHIPO Server - SMA Muhammadiyah 1 Ponorogo
color 0A

echo ==============================================================================
echo       MENJALANKAN SERVER CBT MUHIPO STANDALONE (WINDOWS 10)
echo ==============================================================================
echo.
echo Server aktif pada port 3010.
echo - Akses Lokal   : http://localhost:3010
echo - Akses Jaringan: http://[IP_KOMPUTER_SERVER]:3010
echo.
echo Tekan Ctrl+C jika ingin menghentikan server.
echo.

call npm run dev
pause
