-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: cbt_muhipo
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `gurukelas`
--

DROP TABLE IF EXISTS `gurukelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gurukelas` (
  `id` varchar(191) NOT NULL,
  `guruId` varchar(191) NOT NULL,
  `kelasId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `GuruKelas_guruId_kelasId_key` (`guruId`,`kelasId`),
  KEY `GuruKelas_kelasId_fkey` (`kelasId`),
  CONSTRAINT `GuruKelas_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GuruKelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gurukelas`
--

LOCK TABLES `gurukelas` WRITE;
/*!40000 ALTER TABLE `gurukelas` DISABLE KEYS */;
/*!40000 ALTER TABLE `gurukelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gurumatapelajaran`
--

DROP TABLE IF EXISTS `gurumatapelajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gurumatapelajaran` (
  `id` varchar(191) NOT NULL,
  `guruId` varchar(191) NOT NULL,
  `mataPelajaranId` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `GuruMataPelajaran_guruId_mataPelajaranId_key` (`guruId`,`mataPelajaranId`),
  KEY `GuruMataPelajaran_mataPelajaranId_fkey` (`mataPelajaranId`),
  CONSTRAINT `GuruMataPelajaran_guruId_fkey` FOREIGN KEY (`guruId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GuruMataPelajaran_mataPelajaranId_fkey` FOREIGN KEY (`mataPelajaranId`) REFERENCES `matapelajaran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gurumatapelajaran`
--

LOCK TABLES `gurumatapelajaran` WRITE;
/*!40000 ALTER TABLE `gurumatapelajaran` DISABLE KEYS */;
/*!40000 ALTER TABLE `gurumatapelajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jawabanpeserta`
--

DROP TABLE IF EXISTS `jawabanpeserta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jawabanpeserta` (
  `id` varchar(191) NOT NULL,
  `pesertaUjianId` varchar(191) NOT NULL,
  `soalId` varchar(191) NOT NULL,
  `jawabanDipilih` longtext DEFAULT NULL,
  `raguRagu` tinyint(1) NOT NULL DEFAULT 0,
  `isBenar` tinyint(1) DEFAULT NULL,
  `skor` double NOT NULL DEFAULT 0,
  `catatanKoreksi` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `JawabanPeserta_pesertaUjianId_soalId_key` (`pesertaUjianId`,`soalId`),
  KEY `JawabanPeserta_soalId_fkey` (`soalId`),
  CONSTRAINT `JawabanPeserta_pesertaUjianId_fkey` FOREIGN KEY (`pesertaUjianId`) REFERENCES `pesertaujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `JawabanPeserta_soalId_fkey` FOREIGN KEY (`soalId`) REFERENCES `soal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jawabanpeserta`
--

LOCK TABLES `jawabanpeserta` WRITE;
/*!40000 ALTER TABLE `jawabanpeserta` DISABLE KEYS */;
/*!40000 ALTER TABLE `jawabanpeserta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kelas` (
  `id` varchar(191) NOT NULL,
  `nama` varchar(191) NOT NULL,
  `tingkat` int(11) NOT NULL,
  `jurusan` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Kelas_nama_key` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logaktivitasujian`
--

DROP TABLE IF EXISTS `logaktivitasujian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logaktivitasujian` (
  `id` varchar(191) NOT NULL,
  `pesertaUjianId` varchar(191) DEFAULT NULL,
  `userId` varchar(191) NOT NULL,
  `aktivitas` varchar(191) NOT NULL,
  `detail` text DEFAULT NULL,
  `fotoBukti` longtext DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `LogAktivitasUjian_pesertaUjianId_fkey` (`pesertaUjianId`),
  KEY `LogAktivitasUjian_userId_fkey` (`userId`),
  CONSTRAINT `LogAktivitasUjian_pesertaUjianId_fkey` FOREIGN KEY (`pesertaUjianId`) REFERENCES `pesertaujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LogAktivitasUjian_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logaktivitasujian`
--

LOCK TABLES `logaktivitasujian` WRITE;
/*!40000 ALTER TABLE `logaktivitasujian` DISABLE KEYS */;
/*!40000 ALTER TABLE `logaktivitasujian` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matapelajaran`
--

DROP TABLE IF EXISTS `matapelajaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matapelajaran` (
  `id` varchar(191) NOT NULL,
  `kode` varchar(191) NOT NULL,
  `nama` varchar(191) NOT NULL,
  `tingkat` int(11) DEFAULT 10,
  `jurusan` varchar(191) DEFAULT 'UMUM',
  `durasiMenit` int(11) NOT NULL DEFAULT 90,
  `status` varchar(191) NOT NULL DEFAULT 'AKTIF',
  `modulId` varchar(191) DEFAULT NULL,
  `namaModul` varchar(191) DEFAULT 'Default',
  `kkm` double NOT NULL DEFAULT 75,
  `nilaiMinimal` double NOT NULL DEFAULT 0,
  `nilaiMaksimal` double NOT NULL DEFAULT 100,
  `pembuatId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `MataPelajaran_kode_key` (`kode`),
  KEY `MataPelajaran_modulId_fkey` (`modulId`),
  KEY `MataPelajaran_pembuatId_fkey` (`pembuatId`),
  CONSTRAINT `MataPelajaran_modulId_fkey` FOREIGN KEY (`modulId`) REFERENCES `modul` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `MataPelajaran_pembuatId_fkey` FOREIGN KEY (`pembuatId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matapelajaran`
--

LOCK TABLES `matapelajaran` WRITE;
/*!40000 ALTER TABLE `matapelajaran` DISABLE KEYS */;
/*!40000 ALTER TABLE `matapelajaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modul`
--

DROP TABLE IF EXISTS `modul`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `modul` (
  `id` varchar(191) NOT NULL,
  `nama` varchar(191) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Modul_nama_key` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modul`
--

LOCK TABLES `modul` WRITE;
/*!40000 ALTER TABLE `modul` DISABLE KEYS */;
/*!40000 ALTER TABLE `modul` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opsijawaban`
--

DROP TABLE IF EXISTS `opsijawaban`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `opsijawaban` (
  `id` varchar(191) NOT NULL,
  `soalId` varchar(191) NOT NULL,
  `label` varchar(191) NOT NULL,
  `konten` longtext NOT NULL,
  `gambar` longtext DEFAULT NULL,
  `isBenar` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `OpsiJawaban_soalId_fkey` (`soalId`),
  CONSTRAINT `OpsiJawaban_soalId_fkey` FOREIGN KEY (`soalId`) REFERENCES `soal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opsijawaban`
--

LOCK TABLES `opsijawaban` WRITE;
/*!40000 ALTER TABLE `opsijawaban` DISABLE KEYS */;
/*!40000 ALTER TABLE `opsijawaban` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pengaturansistem`
--

DROP TABLE IF EXISTS `pengaturansistem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pengaturansistem` (
  `id` varchar(191) NOT NULL DEFAULT 'default-settings',
  `schoolName` varchar(191) NOT NULL DEFAULT 'SMA Muhammadiyah 1 Ponorogo',
  `appTitle` varchar(191) NOT NULL DEFAULT 'CBT MUHIPO',
  `academicYear` varchar(191) NOT NULL DEFAULT '2026/2027',
  `semester` varchar(191) NOT NULL DEFAULT 'Ganjil',
  `timezone` varchar(191) NOT NULL DEFAULT 'Asia/Jakarta',
  `serverLocation` varchar(191) NOT NULL DEFAULT 'Ponorogo, Jawa Timur',
  `logoUrl` text DEFAULT '/pic_logo.png',
  `backgroundUrl` text DEFAULT '/muhipo-front.jpg',
  `timeSyncOffsetMs` int(11) NOT NULL DEFAULT 0,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengaturansistem`
--

LOCK TABLES `pengaturansistem` WRITE;
/*!40000 ALTER TABLE `pengaturansistem` DISABLE KEYS */;
INSERT INTO `pengaturansistem` VALUES ('default-settings','SMA Muhammadiyah 1 Ponorogo','CBT MUHIPO','2026/2027','Ganjil','Asia/Jakarta','Ponorogo, Jawa Timur','/pic_logo.png','/muhipo-front.jpg',0,'2026-09-17 00:00:43.089');
/*!40000 ALTER TABLE `pengaturansistem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pesertaujian`
--

DROP TABLE IF EXISTS `pesertaujian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pesertaujian` (
  `id` varchar(191) NOT NULL,
  `ujianId` varchar(191) NOT NULL,
  `siswaId` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'BELUM_MULAI',
  `waktuMulai` datetime(3) DEFAULT NULL,
  `waktuSelesai` datetime(3) DEFAULT NULL,
  `sisaDetik` int(11) DEFAULT NULL,
  `nilaiPG` double NOT NULL DEFAULT 0,
  `nilaiEsai` double NOT NULL DEFAULT 0,
  `nilaiTotal` double NOT NULL DEFAULT 0,
  `isKoreksiSelesai` tinyint(1) NOT NULL DEFAULT 0,
  `ipAddress` varchar(191) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `urutanSoalIds` longtext DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PesertaUjian_ujianId_siswaId_key` (`ujianId`,`siswaId`),
  KEY `PesertaUjian_siswaId_fkey` (`siswaId`),
  CONSTRAINT `PesertaUjian_siswaId_fkey` FOREIGN KEY (`siswaId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PesertaUjian_ujianId_fkey` FOREIGN KEY (`ujianId`) REFERENCES `ujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pesertaujian`
--

LOCK TABLES `pesertaujian` WRITE;
/*!40000 ALTER TABLE `pesertaujian` DISABLE KEYS */;
/*!40000 ALTER TABLE `pesertaujian` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `soal`
--

DROP TABLE IF EXISTS `soal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `soal` (
  `id` varchar(191) NOT NULL,
  `mataPelajaranId` varchar(191) NOT NULL,
  `nomorUrut` int(11) NOT NULL DEFAULT 1,
  `tipeSoal` varchar(191) NOT NULL DEFAULT 'PG',
  `pertanyaan` longtext NOT NULL,
  `mediaAudio` text DEFAULT NULL,
  `mediaGambar` longtext DEFAULT NULL,
  `bobot` double NOT NULL DEFAULT 1,
  `kunciJawabanTeks` longtext DEFAULT NULL,
  `matchingData` longtext DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Soal_mataPelajaranId_fkey` (`mataPelajaranId`),
  CONSTRAINT `Soal_mataPelajaranId_fkey` FOREIGN KEY (`mataPelajaranId`) REFERENCES `matapelajaran` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `soal`
--

LOCK TABLES `soal` WRITE;
/*!40000 ALTER TABLE `soal` DISABLE KEYS */;
/*!40000 ALTER TABLE `soal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ujian`
--

DROP TABLE IF EXISTS `ujian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ujian` (
  `id` varchar(191) NOT NULL,
  `kodeUjian` varchar(191) NOT NULL,
  `judul` varchar(191) NOT NULL,
  `deskripsi` text DEFAULT NULL,
  `mataPelajaranId` varchar(191) NOT NULL,
  `durasiMenit` int(11) NOT NULL,
  `waktuMulai` datetime(3) NOT NULL,
  `waktuSelesai` datetime(3) NOT NULL,
  `acakSoal` tinyint(1) NOT NULL DEFAULT 1,
  `acakOpsi` tinyint(1) NOT NULL DEFAULT 1,
  `tampilkanHasil` tinyint(1) NOT NULL DEFAULT 0,
  `lockBrowser` tinyint(1) NOT NULL DEFAULT 1,
  `token` varchar(191) DEFAULT 'ABCDEF',
  `status` varchar(191) NOT NULL DEFAULT 'DIJADWALKAN',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Ujian_kodeUjian_key` (`kodeUjian`),
  KEY `Ujian_mataPelajaranId_fkey` (`mataPelajaranId`),
  CONSTRAINT `Ujian_mataPelajaranId_fkey` FOREIGN KEY (`mataPelajaranId`) REFERENCES `matapelajaran` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ujian`
--

LOCK TABLES `ujian` WRITE;
/*!40000 ALTER TABLE `ujian` DISABLE KEYS */;
/*!40000 ALTER TABLE `ujian` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ujiankelas`
--

DROP TABLE IF EXISTS `ujiankelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ujiankelas` (
  `id` varchar(191) NOT NULL,
  `ujianId` varchar(191) NOT NULL,
  `kelasId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UjianKelas_ujianId_kelasId_key` (`ujianId`,`kelasId`),
  KEY `UjianKelas_kelasId_fkey` (`kelasId`),
  CONSTRAINT `UjianKelas_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UjianKelas_ujianId_fkey` FOREIGN KEY (`ujianId`) REFERENCES `ujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ujiankelas`
--

LOCK TABLES `ujiankelas` WRITE;
/*!40000 ALTER TABLE `ujiankelas` DISABLE KEYS */;
/*!40000 ALTER TABLE `ujiankelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `plainPassword` varchar(191) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'SISWA',
  `nip` varchar(191) DEFAULT NULL,
  `jenisKelamin` varchar(191) DEFAULT NULL,
  `foto` text DEFAULT NULL,
  `nomorPeserta` varchar(191) DEFAULT NULL,
  `ruangUjian` varchar(191) DEFAULT NULL,
  `sesiUjian` int(11) DEFAULT 1,
  `group` varchar(191) DEFAULT NULL,
  `kelasId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`),
  UNIQUE KEY `User_nip_key` (`nip`),
  UNIQUE KEY `User_nomorPeserta_key` (`nomorPeserta`),
  KEY `User_kelasId_fkey` (`kelasId`),
  CONSTRAINT `User_kelasId_fkey` FOREIGN KEY (`kelasId`) REFERENCES `kelas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmu4rt1ig0000qeyrttqsbsdx','nailar','$2b$10$9Gek5JYRqD1UMROm9EWFIu2Fa26SWCbJ.m2I30ECxpzGs1ay9Q7hW',NULL,'Nailar','SUPERADMIN',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'2026-09-17 00:07:29.512','2026-09-17 00:07:29.512');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'cbt_muhipo'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-17  7:13:44
