import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { User } from '../types.ts';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess?: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentUser) {
      setErrorMsg('Sesi login tidak valid. Silakan login kembali.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Kata sandi berhasil diperbarui.');
        if (onSuccess) {
          onSuccess(data.message || 'Kata sandi berhasil diperbarui.');
        }
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Gagal mengubah kata sandi.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke backend server. Periksa koneksi Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-950/20 border border-slate-200/90 w-full max-w-[380px] sm:max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 flex items-center justify-center shrink-0">
              <Icon name="lock_reset" className="text-[20px]" />
            </div>
            <div>
              <h2 className="text-[16px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-tight">
                Ganti Kata Sandi
              </h2>
              <p className="text-[11px] sm:text-[12px] font-medium text-slate-500">
                {currentUser?.role === 'superadmin' ? 'Akun Super Admin' : 'Akun Mitra'}: {currentUser?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-[12px] font-medium flex items-start gap-2">
              <Icon name="error" className="text-[18px] shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-[12px] font-medium flex items-center gap-2">
              <Icon name="check_circle" className="text-[18px] text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-800 mb-1">
              Kata Sandi Saat Ini
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 text-[13px] text-slate-800 bg-white outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title={showCurrentPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                <Icon name={showCurrentPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              *Jika belum pernah diubah, kata sandi bawaan sistem adalah <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">password123</code>
            </p>
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-800 mb-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 text-[13px] text-slate-800 bg-white outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title={showNewPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                <Icon name={showNewPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-800 mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 text-[13px] text-slate-800 bg-white outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title={showConfirmPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[12px] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-semibold text-[12px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Icon name="save" className="text-[16px]" />
                  <span>Simpan Kata Sandi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
