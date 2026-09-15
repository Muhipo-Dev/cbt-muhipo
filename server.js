const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const next = require('next');
const selfsigned = require('selfsigned');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '443', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '80', 10);

// Direktori penyimpanan sertifikat lokal
const certDir = path.join(__dirname, 'certificates');
const keyPath = path.join(certDir, 'cbt-local.key');
const certPath = path.join(certDir, 'cbt-local.crt');

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

async function getOrCreateCertificates() {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  // Jika sertifikat sudah ada dan masih valid, gunakan kembali
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const key = fs.readFileSync(keyPath, 'utf8');
      const cert = fs.readFileSync(certPath, 'utf8');
      if (key && cert) {
        return { key, cert };
      }
    } catch (e) {
      console.warn('[SSL] Membaca sertifikat lama gagal, membuat sertifikat baru...');
    }
  }

  console.log('[SSL] Menghasilkan sertifikat SSL/TLS mandiri untuk Jaringan Lokal & Localhost...');
  const ips = getLocalIpAddresses();
  const altNames = [
    { type: 2, value: 'localhost' },
    ...ips.map((ip) => ({ type: 7, ip: ip })),
  ];

  const attrs = [
    { name: 'commonName', value: 'CBT MUHIPO Standalone' },
    { name: 'organizationName', value: 'SMA Muhammadiyah 1 Ponorogo' },
    { name: 'organizationalUnitName', value: 'CBT Examination System' },
  ];

  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    days: 365,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: altNames,
      },
    ],
  });

  fs.writeFileSync(keyPath, pems.private, 'utf8');
  fs.writeFileSync(certPath, pems.cert, 'utf8');
  console.log('[SSL] Sertifikat SSL berhasil disimpan di direktori certificates/');

  return { key: pems.private, cert: pems.cert };
}

app.prepare().then(async () => {
  const { key, cert } = await getOrCreateCertificates();

  // 1. Server Utama: HTTPS (Port 443 / HTTPS_PORT)
  const httpsServer = https.createServer({ key, cert }, (req, res) => {
    handle(req, res);
  });

  httpsServer.listen(HTTPS_PORT, '0.0.0.0', (err) => {
    if (err) {
      console.error(`[ERROR] Gagal menjalankan HTTPS Server di Port ${HTTPS_PORT}:`, err);
      process.exit(1);
    }

    const localIps = getLocalIpAddresses();
    console.log('\n================================================================');
    console.log('       CBT MUHIPO SECURE HTTPS SERVER BERHASIL AKTIF');
    console.log('       SMA Muhammadiyah 1 Ponorogo (C) 2026');
    console.log('================================================================');
    console.log(`\n  [HTTPS] Server Utama Aman: https://localhost${HTTPS_PORT === 443 ? '' : ':' + HTTPS_PORT}`);
    console.log('\n  [JARINGAN LOKAL] Alamat Akses Peserta Ujian / Siswa:');
    localIps.forEach((ip) => {
      console.log(`    -> https://${ip}${HTTPS_PORT === 443 ? '' : ':' + HTTPS_PORT}`);
    });
    console.log('================================================================\n');
  });

  // 2. Server Pengalih: HTTP (Port 80 / HTTP_PORT) -> Otomatis Redirect ke HTTPS
  const redirectServer = http.createServer((req, res) => {
    const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
    const targetPort = HTTPS_PORT === 443 ? '' : `:${HTTPS_PORT}`;
    const redirectUrl = `https://${host}${targetPort}${req.url}`;

    res.writeHead(301, {
      Location: redirectUrl,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    res.end();
  });

  redirectServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`  [HTTP REDIRECT] Port ${HTTP_PORT} aktif (otomatis mengalihkan ke HTTPS)\n`);
  }).on('error', (err) => {
    console.warn(`[HTTP REDIRECT] Peringatan: Port ${HTTP_PORT} tidak dapat digunakan (${err.message}). HTTP Redirect dinonaktifkan.`);
  });
});
