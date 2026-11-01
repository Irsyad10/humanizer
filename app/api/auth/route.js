import { NextResponse } from 'next/server';

// In-memory demo user session database
const usersDb = new Map([
  [
    'demo@humanizer.ai',
    {
      id: 'usr_demo_1',
      email: 'demo@humanizer.ai',
      name: 'Demo Researcher',
      dailyQuota: 2500,
      wordsUsedToday: 420,
      tier: 'Pro Researcher'
    }
  ]
]);

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: 'Email dan kata sandi wajib diisi.' },
          { status: 400 }
        );
      }

      // Check existing or auto-create demo user
      let user = usersDb.get(email.toLowerCase());
      if (!user) {
        user = {
          id: `usr_${Date.now()}`,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          dailyQuota: 2500,
          wordsUsedToday: 0,
          tier: 'Free Member'
        };
        usersDb.set(email.toLowerCase(), user);
      }

      return NextResponse.json({
        success: true,
        message: 'Login berhasil.',
        user: {
          ...user,
          remainingQuota: Math.max(0, user.dailyQuota - user.wordsUsedToday)
        }
      });
    }

    if (action === 'consume_quota') {
      const { userEmail, wordsCount } = body;
      if (!userEmail) {
        return NextResponse.json({ success: false, error: 'User email diperlukan.' }, { status: 400 });
      }

      const user = usersDb.get(userEmail.toLowerCase());
      if (!user) {
        return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan.' }, { status: 404 });
      }

      user.wordsUsedToday += (wordsCount || 0);
      usersDb.set(userEmail.toLowerCase(), user);

      return NextResponse.json({
        success: true,
        remainingQuota: Math.max(0, user.dailyQuota - user.wordsUsedToday),
        wordsUsedToday: user.wordsUsedToday
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi auth tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('[API /api/auth Error]:', error);
    return NextResponse.json({ success: false, error: 'Kesalahan internal server autentikasi.' }, { status: 500 });
  }
}
