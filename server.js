const http = require('http');
const os = require('os');
const next = require('next');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || process.env.HTTP_PORT || '8080', 10);

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

  httpServer.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
      console.error(`[ERROR] Gagal menjalankan HTTP Server di Port ${PORT}:`, err);
      process.exit(1);
    }

    const localIps = getLocalIpAddresses();
    console.log('\n================================================================');
    console.log('       CBT MUHIPO HTTP SERVER BERHASIL AKTIF');
    console.log('       SMA Muhammadiyah 1 Ponorogo - Muhipo Dev (C) 2026');
    console.log('================================================================');
    console.log(`\n  [HTTP] Server Utama: http://localhost:${PORT}`);
    console.log('\n  [JARINGAN LOKAL] Alamat Akses Peserta Ujian / Siswa:');
    localIps.forEach((ip) => {
      console.log(`    -> http://${ip}:${PORT}`);
    });
    console.log('================================================================\n');
  });
});

