import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';

/**
 * Alur lupa password di dalam modal login:
 *   email -> kode OTP (dikirim ke email) -> kata sandi baru -> selesai
 * Dipakai oleh LoginFormModal.tsx.
 */

interface ForgotPasswordFormProps {
  initialEmail?: string;
  /** Kembali ke form login. Email dikirim balik agar kolom login terisi. */
  onBackToLogin: (email: string) => void;
}

type Step = 'email' | 'otp' | 'password' | 'done';

const RESEND_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 6;

const inputClass =
  'w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed';
const primaryButtonClass =
  'w-full py-3 bg-[#1e293b] hover:bg-slate-800 text-white font-bold rounded-xl text-[14px] transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed';

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, data };
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ initialEmail = '', onBackToLogin }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  // Hitung mundur tombol "Kirim ulang kode".
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const cleanEmail = email.trim().toLowerCase();

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Masukkan alamat email yang valid.');
      return;
    }
    setIsLoading(true);
    try {
      const { ok, data } = await postJson('/api/auth/forgot-password', { email: cleanEmail });
      if (!ok) {
        setError(data?.error || 'Gagal mengirim kode OTP.');
        return;
      }
      setOtp('');
      setCooldown(RESEND_SECONDS);
      setInfo(data?.message || 'Kode OTP telah dikirim.');
      setStep('otp');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Kode OTP harus 6 digit angka.');
      return;
    }
    setIsLoading(true);
    try {
      const { ok, data } = await postJson('/api/auth/verify-otp', { email: cleanEmail, otp });
      if (!ok || !data?.resetToken) {
        setError(data?.error || 'Kode OTP tidak valid.');
        return;
      }
      setResetToken(data.resetToken);
      setStep('password');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setIsLoading(true);
    try {
      const { ok, data } = await postJson('/api/auth/reset-password', {
        email: cleanEmail,
        resetToken,
        newPassword,
        confirmPassword,
      });
      if (!ok) {
        setError(data?.error || 'Gagal mengatur ulang kata sandi.');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      setInfo(data?.message || 'Kata sandi berhasil diperbarui.');
      setStep('done');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitle: Record<Step, string> = {
    email: 'Lupa Kata Sandi',
    otp: 'Masukkan Kode OTP',
    password: 'Buat Kata Sandi Baru',
    done: 'Berhasil',
  };
  const stepHint: Record<Step, string> = {
    email: 'Masukkan email akun Mitra atau Super Admin. Kami akan mengirim kode OTP 6 digit ke email tersebut.',
    otp: `Kode dikirim ke ${cleanEmail}. Berlaku 10 menit. Periksa juga folder Spam.`,
    password: 'Kode OTP benar. Buat kata sandi baru untuk akun Anda.',
    done: '',
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[16px] font-bold text-slate-900">{stepTitle[step]}</h3>
        {stepHint[step] && <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{stepHint[step]}</p>}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-start gap-2" role="alert">
          <Icon name="error" className="text-[18px] text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && step !== 'email' && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-start gap-2" role="status">
          <Icon name="check_circle" className="text-[18px] text-emerald-600 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={requestOtp} className="space-y-4" noValidate>
          <div>
            <label htmlFor="forgot-email" className="sr-only">Email</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              disabled={isLoading}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={isLoading || !email.trim()} className={primaryButtonClass}>
            {isLoading ? 'Mengirim...' : 'Kirim Kode OTP'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp} className="space-y-4" noValidate>
          <div>
            <label htmlFor="forgot-otp" className="sr-only">Kode OTP</label>
            <input
              id="forgot-otp"
              ref={otpRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              disabled={isLoading}
              className={`${inputClass} text-center text-[22px] font-bold tracking-[0.5em]`}
            />
          </div>
          <button type="submit" disabled={isLoading || otp.length !== 6} className={primaryButtonClass}>
            {isLoading ? 'Memeriksa...' : 'Verifikasi Kode'}
          </button>
          <div className="flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => { setError(null); setStep('email'); }}
              className="text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Ganti email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || isLoading}
              onClick={() => void requestOtp()}
              className="font-semibold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Kirim ulang kode (${cooldown}d)` : 'Kirim ulang kode'}
            </button>
          </div>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={resetPassword} className="space-y-4" noValidate>
          <div className="relative">
            <label htmlFor="forgot-new-password" className="sr-only">Kata sandi baru</label>
            <input
              id="forgot-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Kata sandi baru"
              disabled={isLoading}
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <div>
            <label htmlFor="forgot-confirm-password" className="sr-only">Ulangi kata sandi baru</label>
            <input
              id="forgot-confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              disabled={isLoading}
              className={inputClass}
            />
          </div>
          <p className="text-[11px] text-slate-400">Minimal {MIN_PASSWORD_LENGTH} karakter.</p>
          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className={primaryButtonClass}
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
          </button>
        </form>
      )}

      {step === 'done' && (
        <button type="button" onClick={() => onBackToLogin(cleanEmail)} className={primaryButtonClass}>
          Kembali ke Login
        </button>
      )}

      {step !== 'done' && (
        <button
          type="button"
          onClick={() => onBackToLogin(cleanEmail)}
          className="w-full text-center text-[12px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          ← Kembali ke Login
        </button>
      )}
    </div>
  );
};
