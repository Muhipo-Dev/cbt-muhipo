import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { runPythonScript } from '@/lib/pythonBridge';

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

    // Jalankan smart_excel_parser.py via pythonBridge
    const result = await runPythonScript<{ success: boolean; soalItems?: any[]; error?: string }>(
      'scripts/smart_excel_parser.py',
      rawRows,
      12000
    );

    if (result && result.success && Array.isArray(result.soalItems)) {
      return NextResponse.json({
        success: true,
        soalItems: result.soalItems,
        totalParsed: result.soalItems.length,
        source: 'AI_PYTHON_PARSER',
      });
    }

    return NextResponse.json({
      success: false,
      message: result?.error || 'Gagal memproses butir soal dengan parser AI Python',
    }, { status: 500 });
  } catch (err: any) {
    console.error('Parse Excel API Error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
