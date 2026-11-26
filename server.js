if (!process.env.UV_THREADPOOL_SIZE) {
  process.env.UV_THREADPOOL_SIZE = '16';
}

const http = require('http');
const os = require('os');
const next = require('next');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || process.env.HTTP_PORT || '4020', 10);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = ['127.0.0.1'];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.prepare().then(() => {
  const httpServer = http.createServer((req, res) => {
    handle(req, res);
  });

  // Optimasi untuk 800+ pengguna bersamaan (high concurrency)
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
  httpServer.requestTimeout = 30000;

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL ERROR] Port ${PORT} sudah digunakan oleh aplikasi lain!`);
      console.error(`Silakan periksa apakah web server lain (IIS/Apache/Nginx/Node) sedang menggunakan Port ${PORT}.`);
    } else if (err.code === 'EACCES') {
      console.error(`\n[FATAL ERROR] Akses ke Port ${PORT} ditolak!`);
      console.error(`Silakan jalankan terminal atau start-cbt-server.bat sebagai Administrator (Run as administrator).`);
    } else {
      console.error(`\n[FATAL ERROR] Gagal menjalankan HTTP Server di Port ${PORT}:`, err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    const portSuffix = PORT === 80 ? '' : `:${PORT}`;
    console.log('\n================================================================');
    console.log('       CBT v2 SMA Muhipo HTTP SERVER BERHASIL AKTIF');
    console.log('       SMA Muhammadiyah 1 Ponorogo - Muhipo Dev (C) 2026');
    console.log('================================================================');
    console.log(`\n  [HTTP] Server Utama: http://localhost${portSuffix}`);
    console.log('\n  [JARINGAN LOKAL] Alamat Akses Peserta Ujian / Siswa:');
    localIps.forEach((ip) => {
      console.log(`    -> http://${ip}${portSuffix}`);
    });
    console.log('================================================================\n');
  });
});

