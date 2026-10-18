import React from 'react';
import { Icon } from './Icon.tsx';

interface LoginRequiredNoticeProps {
  roleRequired?: 'mitra' | 'superadmin';
  customTitle?: string;
  customDescription?: string;
  onOpenLogin: () => void;
}

export const LoginRequiredNotice: React.FC<LoginRequiredNoticeProps> = ({
  roleRequired = 'mitra',
  customTitle,
  customDescription,
  onOpenLogin,
}) => {
  const isSuperadmin = roleRequired === 'superadmin';

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-surface-container-low text-on-surface-variant flex items-center justify-center mx-auto mb-4">
        <Icon name="lock" className="text-[20px]" />
      </div>

      <h2 className="text-[18px] font-semibold text-on-surface mb-2 tracking-tight">
        {customTitle || (isSuperadmin ? 'Panel Super Admin' : 'Panel Mitra Penyelenggara')}
      </h2>

      <p className="text-[13px] text-on-surface-variant leading-relaxed mb-6 max-w-sm mx-auto font-medium">
        {customDescription || (isSuperadmin
          ? 'Silakan masuk dengan akun Super Admin untuk memverifikasi proposal dan mengelola data lembaga.'
          : 'Silakan masuk dengan akun Mitra untuk mengajukan proposal kegiatan dan memantau pendaftar.')}
      </p>

      <button
        onClick={onOpenLogin}
        className="w-full py-3 px-4 rounded-xl text-[13px] font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
      >
        <Icon name="login" className="text-[18px]" />
        <span>Buka Formulir Masuk</span>
        <Icon name="arrow_forward" className="text-[18px]" />
      </button>
    </div>
  );
};

