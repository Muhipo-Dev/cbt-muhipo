import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Urutan tabel dengan memperhatikan Foreign Key Constraints
const TABLE_CONFIGS = [
  { name: 'PengaturanSistem', model: 'pengaturanSistem' },
  { name: 'Kelas', model: 'kelas' },
  { name: 'User', model: 'user' },
  { name: 'GuruKelas', model: 'guruKelas' },
  { name: 'Modul', model: 'modul' },
  { name: 'MataPelajaran', model: 'mataPelajaran' },
  { name: 'GuruMataPelajaran', model: 'guruMataPelajaran' },
  { name: 'Soal', model: 'soal' },
  { name: 'OpsiJawaban', model: 'opsiJawaban' },
  { name: 'Ujian', model: 'ujian' },
  { name: 'UjianKelas', model: 'ujianKelas' },
  { name: 'PesertaUjian', model: 'pesertaUjian' },
  { name: 'JawabanPeserta', model: 'jawabanPeserta' },
  { name: 'LogAktivitasUjian', model: 'logAktivitasUjian' },
];

/**
 * Escape string value for MySQL SQL statement
 */
function sqlEscapeValue(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return 'NULL';
    return String(val);
  }
  if (val instanceof Date) {
    // Format YYYY-MM-DD HH:mm:ss.SSS
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    const y = val.getFullYear();
    const m = pad(val.getMonth() + 1);
    const d = pad(val.getDate());
    const h = pad(val.getHours());
    const min = pad(val.getMinutes());
    const s = pad(val.getSeconds());
    const ms = pad(val.getMilliseconds(), 3);
    return `'${y}-${m}-${d} ${h}:${min}:${s}.${ms}'`;
  }
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }

  // Escape special characters in strings for standard MySQL / HeidiSQL
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');

  return `'${str}'`;
}

// GET: Export SQL Dump (.sql)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Hanya Admin/Superadmin yang berhak mengakses SQL Dump.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDrop = searchParams.get('includeDrop') !== 'false';
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 8);
    const nowIso = new Date().toISOString();

    let sqlDump = '';

    // 1. Header HeidiSQL / MySQL Compatible Dump
    sqlDump += `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`;
    sqlDump += `/*!40101 SET NAMES utf8mb4 */;\n`;
    sqlDump += `/*!50503 SET NAMES utf8mb4 */;\n`;
    sqlDump += `/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;\n`;
    sqlDump += `/*!40103 SET TIME_ZONE='+00:00' */;\n`;
    sqlDump += `/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`;
    sqlDump += `/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n`;
    sqlDump += `/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n`;

    sqlDump += `-- ========================================================\n`;
    sqlDump += `-- CBT MUHIPO STANDALONE DATABASE DUMP (MySQL / HeidiSQL)\n`;
    sqlDump += `-- Application: CBT SMA Muhammadiyah 1 Ponorogo\n`;
    sqlDump += `-- Exported By : ${user.name} (${user.username} [${user.role}])\n`;
    sqlDump += `-- Export Date: ${dateStr} ${timeStr} (UTC: ${nowIso})\n`;
    sqlDump += `-- Format     : Standard MySQL Data & Table SQL Script\n`;
    sqlDump += `-- HeidiSQL Compatible: YES\n`;
    sqlDump += `-- phpMyAdmin Compatible: YES\n`;
    sqlDump += `-- ========================================================\n\n`;

    // 2. Dump data for each table in order
    for (const table of TABLE_CONFIGS) {
      try {
        const modelDelegate = (prisma as any)[table.model];
        if (!modelDelegate || typeof modelDelegate.findMany !== 'function') {
          continue;
        }

        const rows = await modelDelegate.findMany();

        sqlDump += `-- --------------------------------------------------------\n`;
        sqlDump += `-- Dumping data for table \`${table.name}\` (${rows.length} rows)\n`;
        sqlDump += `-- --------------------------------------------------------\n`;

        if (includeDrop) {
          sqlDump += `/*!40000 ALTER TABLE \`${table.name}\` DISABLE KEYS */;\n`;
          sqlDump += `DELETE FROM \`${table.name}\`;\n`;
        }

        if (rows.length > 0) {
          const sample = rows[0];
          const columns = Object.keys(sample);
          const colNamesEscaped = columns.map((c) => `\`${c}\``).join(', ');

          // Batch insert in chunks of 100 rows
          const chunkSize = 100;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const valueLines = chunk.map((row: any) => {
              const vals = columns.map((c) => sqlEscapeValue(row[c]));
              return `  (${vals.join(', ')})`;
            });

            sqlDump += `INSERT INTO \`${table.name}\` (${colNamesEscaped}) VALUES\n`;
            sqlDump += valueLines.join(',\n') + ';\n';
          }
        }

        if (includeDrop) {
          sqlDump += `/*!40000 ALTER TABLE \`${table.name}\` ENABLE KEYS */;\n\n`;
        } else {
          sqlDump += `\n`;
        }
      } catch (tableErr: any) {
        console.error(`Error dumping table ${table.name}:`, tableErr);
        sqlDump += `-- [Error exporting table ${table.name}: ${tableErr.message}]\n\n`;
      }
    }

    // 3. Footer Reset Constraints
    sqlDump += `-- ========================================================\n`;
    sqlDump += `-- End of CBT MUHIPO Database Dump\n`;
    sqlDump += `-- ========================================================\n`;
    sqlDump += `/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;\n`;
    sqlDump += `/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;\n`;
    sqlDump += `/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;\n`;
    sqlDump += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
    sqlDump += `/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;\n`;

    const filename = `CBT_MUHIPO_MYSQL_DUMP_${dateStr}.sql`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/sql; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(sqlDump, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('SQL Backup GET error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor SQL dump: ' + error.message }, { status: 500 });
  }
}

/**
 * Parse raw SQL script into executable statements, properly handling string literals and comments
 */
function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inString: false | "'" | '"' | '`' = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let escapeNext = false;

  const len = sqlText.length;
  for (let i = 0; i < len; i++) {
    const char = sqlText[i];
    const nextChar = i + 1 < len ? sqlText[i + 1] : '';

    // Handle escape character inside strings
    if (escapeNext) {
      currentStatement += char;
      escapeNext = false;
      continue;
    }

    if (inString) {
      if (char === '\\') {
        escapeNext = true;
        currentStatement += char;
      } else if (char === inString) {
        inString = false;
        currentStatement += char;
      } else {
        currentStatement += char;
      }
      continue;
    }

    // Check comment end
    if (inSingleLineComment) {
      if (char === '\n' || char === '\r') {
        inSingleLineComment = false;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++; // skip '/'
      }
      continue;
    }

    // Check comment start
    if (char === '-' && nextChar === '-') {
      inSingleLineComment = true;
      i++;
      continue;
    }
    if (char === '#') {
      inSingleLineComment = true;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      // MySQL conditional comment /*!40101 ... */
      if (i + 2 < len && sqlText[i + 2] === '!') {
        const closingIdx = sqlText.indexOf('*/', i + 3);
        if (closingIdx !== -1) {
          const conditionalContent = sqlText.slice(i + 3, closingIdx).replace(/^\d{5}\s*/, '');
          currentStatement += ' ' + conditionalContent + ' ';
          i = closingIdx + 1;
          continue;
        }
      }
      inMultiLineComment = true;
      i++;
      continue;
    }

    // Check string start
    if (char === "'" || char === '"' || char === '`') {
      inString = char;
      currentStatement += char;
      continue;
    }

    // Check statement delimiter ';'
    if (char === ';') {
      const trimmed = currentStatement.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      currentStatement = '';
      continue;
    }

    currentStatement += char;
  }

  const finalTrimmed = currentStatement.trim();
  if (finalTrimmed.length > 0) {
    statements.push(finalTrimmed);
  }

  return statements;
}

// POST: Import / Restore from SQL Dump (.sql)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Hanya Admin/Superadmin yang berhak mengimpor SQL.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let sqlContent = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      sqlContent = body.sql || body.sqlContent || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ success: false, message: 'File SQL tidak ditemukan pada request.' }, { status: 400 });
      }
      sqlContent = await file.text();
    } else {
      sqlContent = await request.text();
    }

    if (!sqlContent || sqlContent.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Isi file SQL kosong.' }, { status: 400 });
    }

    // Split SQL script into distinct statements
    const statements = splitSqlStatements(sqlContent);
    if (statements.length === 0) {
      return NextResponse.json({ success: false, message: 'Tidak ada perintah SQL yang valid untuk dieksekusi.' }, { status: 400 });
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Temporarily disable foreign key checks for the session
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    try {
      for (const statement of statements) {
        // Skip empty or comment-only commands
        if (!statement || statement.trim().length === 0) continue;

        try {
          await prisma.$executeRawUnsafe(statement);
          successCount++;
        } catch (stmtErr: any) {
          const msg = stmtErr?.message || String(stmtErr);
          if (statement.toUpperCase().startsWith('SET ') || statement.toUpperCase().startsWith('/*!')) {
            skippedCount++;
          } else {
            console.warn('SQL statement warning during import:', msg, '\nStatement:', statement.slice(0, 120));
            errors.push(msg.slice(0, 160));
          }
        }
      }
    } finally {
      // Always re-enable foreign key checks
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    }

    return NextResponse.json({
      success: true,
      message: `Impor basis data SQL berhasil diselesaikan. ${successCount} statement berhasil dieksekusi${skippedCount > 0 ? `, ${skippedCount} dilewati` : ''}.`,
      stats: {
        totalStatements: statements.length,
        executed: successCount,
        skipped: skippedCount,
        errorCount: errors.length,
        firstErrors: errors.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('SQL Backup POST error:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengimpor file SQL: ' + error.message }, { status: 500 });
  }
}
