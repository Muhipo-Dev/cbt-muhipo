import { spawn } from 'child_process';
import path from 'path';

/**
 * Mendapatkan executable Python yang valid di lingkungan host (python3 atau python)
 */
function getPythonBinary(): string {
  return process.env.PYTHON_BIN || 'python3';
}

/**
 * Jalankan script Python dengan payload JSON via STDIN dan terima output JSON via STDOUT
 */
export async function runPythonScript<T = any>(
  scriptRelativePath: string,
  payload: any,
  timeoutMs: number = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), scriptRelativePath);
    const pythonCmd = getPythonBinary();

    const py = spawn(pythonCmd, [scriptPath], {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdoutData = '';
    let stderrData = '';
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        py.kill();
        reject(new Error(`Python script execution timeout (${timeoutMs}ms): ${scriptRelativePath}`));
      }
    }, timeoutMs);

    py.stdout.on('data', (data) => {
      stdoutData += data.toString('utf-8');
    });

    py.stderr.on('data', (data) => {
      stderrData += data.toString('utf-8');
    });

    py.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    py.on('close', (code) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timer);

      if (code !== 0 && !stdoutData.trim()) {
        reject(new Error(`Python process exited with code ${code}. Stderr: ${stderrData}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(`Failed to parse Python JSON output: ${err.message}. Raw output: ${stdoutData}`));
      }
    });

    // Kirim payload ke STDIN Python
    try {
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    } catch (err) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        reject(err);
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
