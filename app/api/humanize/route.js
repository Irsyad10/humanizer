import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { analyzeTextForAi } from '@/lib/detector';
import { executeHumanizer } from '@/lib/ai-provider';
import { recordExperiment } from '@/lib/learning-store';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(clientIp);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak permintaan. Silakan tunggu ${rateCheck.resetInSeconds} detik.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { text, tone = 'natural', bypassLimit = false } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teks masukan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    const minWords = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MIN || '1', 10);
    const maxWords = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MAX || '1000', 10);

    // Enforce 1 - 1000 word limit
    if (!bypassLimit && (wordCount < minWords || wordCount > maxWords)) {
      return NextResponse.json(
        {
          success: false,
          error: `Jumlah kata (${wordCount} kata) belum memenuhi batas yang ditentukan. Harap masukkan antara ${minWords} hingga ${maxWords} kata.`,
          currentWordCount: wordCount,
          minWords,
          maxWords
        },
        { status: 400 }
      );
    }

    // 1. Initial AI Detection
    const initialDetection = analyzeTextForAi(text);

    // 2. Execute Humanizer Engine (Gemini / Groq / OpenAI / Heuristic Fallback)
    const { humanizedText, providerUsed, engineNote } = await executeHumanizer(text, tone);

    // 3. Post-Humanize AI Detection & Audit
    const resultDetection = analyzeTextForAi(humanizedText);

    // 4. Save to Research & Learning Dataset (Tahap 1 Roadmap)
    const experimentLog = recordExperiment({
      originalText: text,
      humanizedText,
      tone,
      providerUsed,
      aiScoreInitial: initialDetection.aiScore,
      humanScoreResult: resultDetection.humanScore,
      burstinessBefore: initialDetection.metrics.burstiness.value,
      burstinessAfter: resultDetection.metrics.burstiness.value,
      promptVersion: 'v1.4-burstiness-jitter'
    });

    return NextResponse.json({
      success: true,
      data: {
        originalText: text,
        humanizedText,
        tone,
        providerUsed,
        engineNote,
        initialDetection,
        resultDetection,
        learningLogId: experimentLog.id
      }
    });
  } catch (error) {
    console.error('[API /api/humanize Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal melakukan konversi teks.' },
      { status: 500 }
    );
  }
}
