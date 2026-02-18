'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/database';
import { useAuthStore } from '@/lib/store/authStore';
import { Input, Button } from '@/components/ui';
import { LogIn, Store } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await db.users
        .where('username')
        .equals(formData.username)
        .first();

      if (!user) {
        setError('Username tidak ditemukan');
        setIsLoading(false);
        return;
      }

      if (!user.isActive) {
        setError('Akun Anda tidak aktif. Hubungi owner.');
        setIsLoading(false);
        return;
      }

      if (user.password !== formData.password) {
        setError('Password salah');
        setIsLoading(false);
        return;
      }

      // Login successful
      login(user);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan saat login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">POS UMKM</h1>
          <p className="text-gray-600">Silakan login untuk melanjutkan</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Masukkan password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <LogIn className="w-5 h-5" />
              {isLoading ? 'Memproses...' : 'Login'}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Demo Credentials:
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Owner:</span> owner / owner123
              </p>
              <p>
                <span className="font-medium">Kasir:</span> kasir / kasir123
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 Created By Sagara. All rights reserved.
        </p>
      </div>
    </div>
  );
}