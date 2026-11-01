import { NextResponse } from 'next/server';
import { getStoredExperiments, getDatasetAnalytics, updateExperimentFeedback } from '@/lib/learning-store';

export async function GET() {
  try {
    const experiments = getStoredExperiments();
    const analytics = getDatasetAnalytics();

    return NextResponse.json({
      success: true,
      data: {
        experiments,
        analytics
      }
    });
  } catch (error) {
    console.error('[API /api/history GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil riwayat dataset riset.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, rating, userNotes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID eksperimen diperlukan.' },
        { status: 400 }
      );
    }

    const updated = updateExperimentFeedback(id, { rating, userNotes });
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Data eksperimen tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('[API /api/history POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui feedback eksperimen.' },
      { status: 500 }
    );
  }
}
