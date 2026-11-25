import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

let cachedPythonBinary: string | null = null;
let pythonChecked = false;

/**
 * Mendapatkan executable Python yang valid di lingkungan host.
 * Menghindari Microsoft Store app execution alias (python3.exe 0-byte shim)
 * yang menyebabkan spam popup instalasi dan looping error EACCES.
 */
export function getPythonBinary(): string | null {
  if (pythonChecked) {
    return cachedPythonBinary;
  }

  // 1. Cek jika disetel eksplisit di env
  if (process.env.PYTHON_BIN) {
    try {
      execSync(`"${process.env.PYTHON_BIN}" --version`, { stdio: 'ignore', windowsHide: true });
      cachedPythonBinary = process.env.PYTHON_BIN;
      pythonChecked = true;
      return cachedPythonBinary;
    } catch {}
  }

  // 2. Daftar direktori instalasi Python standar di Windows
  const standardWindowsPaths = [
    path.join(process.env.LOCALAPPDATA || 'C:\\Users\\Administrator\\AppData\\Local', 'Programs', 'Python', 'Python311', 'python.exe'),
    'C:\\Python315\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python312\\python.exe',
  ];

  for (const exePath of standardWindowsPaths) {
    if (fs.existsSync(exePath)) {
      try {
        execSync(`"${exePath}" --version`, { stdio: 'ignore', windowsHide: true });
        cachedPythonBinary = exePath;
        pythonChecked = true;
        return cachedPythonBinary;
      } catch {}
    }
  }

  // 3. Coba perintah generic 'python' atau 'py' (BUKAN 'python3' karena memicu Windows Store stub)
  const candidateCommands = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const cmd of candidateCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore', windowsHide: true });
      cachedPythonBinary = cmd;
      pythonChecked = true;
      return cachedPythonBinary;
    } catch {}
  }

  // Python tidak tersedia
  cachedPythonBinary = null;
  pythonChecked = true;
  return null;
}

/**
 * Jalankan script Python dengan payload JSON via STDIN dan terima output JSON via STDOUT.
 * Menjamin graceful fallback jika Python tidak terpasang di host server.
 */
export async function runPythonScript<T = any>(
  scriptRelativePath: string,
  payload: any,
  timeoutMs: number = 8000
): Promise<T | null> {
  const pythonCmd = getPythonBinary();
  if (!pythonCmd) {
    // Tidak ada runtime Python yang valid, batalkan proses tanpa spam error
    return null;
  }

  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), scriptRelativePath);

    let py;
    try {
      py = spawn(pythonCmd, [scriptPath], {
        windowsHide: true,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });
    } catch (spawnErr) {
      resolve(null);
      return;
    }

    let stdoutData = '';
    let stderrData = '';
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try { py.kill(); } catch {}
        resolve(null);
      }
    }, timeoutMs);

    py.stdout.on('data', (data) => {
      stdoutData += data.toString('utf-8');
    });

    py.stderr.on('data', (data) => {
      stderrData += data.toString('utf-8');
    });

    py.on('error', () => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        resolve(null);
      }
    });

    py.on('close', (code) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);

      if (code !== 0 && !stdoutData.trim()) {
        resolve(null);
        return;
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });

    // Kirim payload ke STDIN Python
    try {
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    } catch {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Panggil AI Proctor Engine untuk analisis anomali pengawasan seluruh sesi ujian
 */
export async function runAIProctorAnalysis(pesertaList: any[]): Promise<any> {
  try {
    const res = await runPythonScript<{ success: boolean; result: any }>(
      'scripts/ai_proctor_monitor.py',
      {
        action: 'ANALYZE_PROCTOR_SESSION',
        pesertaList,
      },
      6000
    );
    if (res && res.success) {
      return res.result;
    }
    return null;
  } catch (error) {
    console.error('[AI Proctor Bridge Error]:', error);
    return null;
  }
}

/**
 * Panggil AI Question Matcher untuk koreksi esai / isian singkat
 * Mendukung integrasi Google AI Studio (Gemini) dengan fallback cerdas ke Local AI Semantic Matcher
 */
export async function runAIEssayEvaluation(
  jawabanSiswa: string,
  rubrikKunci: string,
  maxBobot: number = 10.0,
  pertanyaan: string = '',
  geminiApiKey: string = ''
): Promise<any> {
  try {
    const res = await runPythonScript<{ success: boolean; result: any }>(
      'scripts/ai_question_matcher.py',
      {
        action: 'EVALUATE_ESSAY',
        jawabanSiswa,
        rubrikKunci,
        pertanyaan,
        maxBobot,
        geminiApiKey: geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      },
      8000
    );
    if (res && res.success) {
      return res.result;
    }
    return null;
  } catch (error) {
    console.error('[AI Essay Bridge Error]:', error);
    return null;
  }
}

/**
 * Panggil AI Question Matcher untuk pencocokan Isian Singkat
 */
export async function runAIMathIsianMatch(
  jawabanSiswa: string,
  kunciTeks: string
): Promise<any> {
  try {
    const res = await runPythonScript<{ success: boolean; result: any }>(
      'scripts/ai_question_matcher.py',
      {
        action: 'MATCH_ISIAN',
        jawabanSiswa,
        kunciTeks,
      },
      5000
    );
    if (res && res.success) {
      return res.result;
    }
    return null;
  } catch (error) {
    console.error('[AI Math Isian Bridge Error]:', error);
    return null;
  }
}
