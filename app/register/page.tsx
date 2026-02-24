'use client';
// app/register/page.tsx — halaman registrasi tenant baru

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart, Building2, User, Mail, Lock,
  Phone, CheckCircle2, Loader2, Eye, EyeOff, ArrowRight,
} from 'lucide-react';

type Step = 1 | 2;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Form fields
  const [namaTenant, setNamaTenant] = useState('');
  const [namaOwner,  setNamaOwner]  = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [showPass,   setShowPass]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const handleNext = () => {
    if (!namaTenant.trim()) { setError('Nama bisnis wajib diisi'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    if (!namaOwner || !email || !password) {
      setError('Semua field wajib diisi'); return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaTenant, namaOwner, email, password, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Gagal mendaftar'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registrasi Berhasil! 🎉</h2>
          <p className="text-gray-500 mb-2">Akun bisnis <strong>{namaTenant}</strong> sudah dibuat.</p>
          <p className="text-sm text-gray-400">Anda mendapat <strong>14 hari trial gratis</strong>.</p>
          <p className="text-sm text-blue-600 mt-4 animate-pulse">Mengarahkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">POS UMKM</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Daftar Sekarang</h1>
          <p className="text-blue-200 text-sm mt-1">14 hari trial gratis, tanpa kartu kredit</p>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mt-5">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                }`}>{s}</div>
                {s < 2 && <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />}
              </div>
            ))}
            <span className="text-blue-200 text-xs ml-1">
              {step === 1 ? 'Info Bisnis' : 'Info Pemilik'}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Nama Bisnis / UMKM
                </label>
                <input value={namaTenant} onChange={e => setNamaTenant(e.target.value)}
                  placeholder="Contoh: Warung Makan Sari Rasa"
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Nama ini akan muncul di struk dan laporan</p>
              </div>

              {/* Plan preview */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm font-semibold text-blue-800 mb-2">✨ Yang kamu dapat (Free Trial):</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {['14 hari trial gratis', '1 outlet', 'Hingga 3 user', 'Kasir, Laporan, Produk', 'Export Excel'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={handleNext}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nama Pemilik
                </label>
                <input value={namaOwner} onChange={e => setNamaOwner(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Nomor HP <span className="text-gray-400 text-xs">(opsional)</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Password
                </label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Kembali
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-gray-500 pt-2">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Login di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}