import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { analyzeTextForAi } from '@/lib/detector';

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(clientIp);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak permintaan (Rate limit tercapai). Silakan coba lagi dalam ${rateCheck.resetInSeconds} detik.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { text, bypassLimit = false } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Teks tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    const minWords = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MIN || '1', 10);
    const maxWords = parseInt(process.env.NEXT_PUBLIC_WORD_LIMIT_MAX || '1000', 10);

    // Validate word limit (1 - 1000 kata)
    if (!bypassLimit && (wordCount < minWords || wordCount > maxWords)) {
      return NextResponse.json(
        {
          success: false,
          error: `Jumlah kata saat ini (${wordCount} kata) tidak sesuai batas. Ketentuan kuota: minimal ${minWords} kata dan maksimal ${maxWords} kata per permintaan.`,
          currentWordCount: wordCount,
          minWords,
          maxWords
        },
        { status: 400 }
      );
    }

    // Run AI Detection Heuristics
    const analysis = analyzeTextForAi(text);

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[API /api/detect Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan internal pada server saat mendeteksi teks.' },
      { status: 500 }
    );
  }
}
