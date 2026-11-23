import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rawRows } = body;

    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data baris excel kosong' },
        { status: 400 }
      );
    }

    // Jalankan smart_excel_parser.py
    const scriptPath = path.join(process.cwd(), 'scripts', 'smart_excel_parser.py');

    const pythonPromise = new Promise<{ success: boolean; soalItems?: any[]; error?: string }>(
      (resolve) => {
        const py = spawn('python3', [scriptPath]);

        let stdoutData = '';
        let stderrData = '';

        py.stdout.on('data', (chunk) => {
          stdoutData += chunk.toString();
        });

        py.stderr.on('data', (chunk) => {
          stderrData += chunk.toString();
        });

        py.on('close', (code) => {
          if (code === 0 && stdoutData.trim()) {
            try {
              const parsed = JSON.parse(stdoutData.trim());
              resolve(parsed);
              return;
            } catch (err: any) {
              resolve({ success: false, error: 'Gagal parse output Python: ' + err.message });
              return;
            }
          }
          resolve({ success: false, error: stderrData || `Python exit with code ${code}` });
        });

        py.stdin.write(JSON.stringify(rawRows));
        py.stdin.end();
      }
    );

    const result = await pythonPromise;

    if (result.success && Array.isArray(result.soalItems)) {
      return NextResponse.json({
        success: true,
        soalItems: result.soalItems,
        totalParsed: result.soalItems.length,
        source: 'AI_PYTHON_PARSER',
      });
    }

    return NextResponse.json({
      success: false,
      message: result.error || 'Gagal memproses butir soal dengan parser AI Python',
    }, { status: 500 });
  } catch (err: any) {
    console.error('Parse Excel API Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
