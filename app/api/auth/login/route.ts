// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log('1. Login attempt for email:', email);

    if (!email || !password) {
      console.log('2. Missing email or password');
      return NextResponse.json({ message: 'Email dan password harus diisi' }, { status: 400 });
    }

    console.log('3. Looking up user in database...');
    const user = await prisma.user.findUnique({
      where: { email },
      include: { outlet: true },
    });

    console.log('4. User found?', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('5. User not found in database');
      return NextResponse.json({ message: 'Email tidak ditemukan' }, { status: 401 });
    }

    // Cek apakah password di database ada
    console.log('6. Password in DB exists?', user.password ? 'Yes' : 'No');
    console.log('7. Password hash length:', user.password?.length);
    console.log('8. Password hash prefix:', user.password?.substring(0, 10));

    // ── Cek password dengan bcrypt ───────────────────────────────────────────
    console.log('9. Comparing passwords...');
    const passwordValid = await bcrypt.compare(password, user.password);
    console.log('10. Password valid?', passwordValid);
    
    if (!passwordValid) {
      console.log('11. Password mismatch');
      return NextResponse.json({ message: 'Password salah' }, { status: 401 });
    }

    console.log('12. Login successful for user:', user.id);

    // ── Buat session payload ─────────────────────────────────────────────────
    const sessionPayload = {
      userId:   user.id,
      role:     user.role,
      tenantId: user.tenantId ?? null,
      outletId: user.outletId ?? null,
    };

    const sessionCookie = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const response = NextResponse.json({
      user: {
        id:       user.id,
        nama:     user.nama,
        email:    user.email,
        role:     user.role,
        tenantId: user.tenantId ?? null,
        outletId: user.outletId ?? null,
        outlet:   user.outlet ? { id: user.outlet.id, nama: user.outlet.nama } : null,
      },
    });

    response.cookies.set('pos-session', sessionCookie, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    });

    console.log('13. Cookie set, returning response');
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: 'Logout berhasil' });
  response.cookies.delete('pos-session');
  return response;
}