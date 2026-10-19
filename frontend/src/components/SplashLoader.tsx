import React from 'react';

interface SplashLoaderProps {
  /** true = sedang menutup (fade-out) */
  leaving?: boolean;
}

/**
 * Layar loading awal (latar putih bersih).
 * Tampil selama data dari database/API masih diambil.
 */
export default function SplashLoader({ leaving = false }: SplashLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat data"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-slate-900 transition-opacity duration-500 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Logo + cincin berputar */}
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#006316] animate-spin" />
        <div className="absolute inset-3 rounded-full flex items-center justify-center animate-pulse">
          <img
            src="/logo-quran.png"
            alt=""
            className="w-16 h-16 object-contain"
            draggable={false}
          />
        </div>
      </div>

      <p className="text-lg md:text-xl font-bold text-slate-800 text-center px-6">
        Mohon tunggu sebentar...
      </p>

      {/* Progress bar bergerak */}
      <div className="mt-6 w-56 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-[#006316] splash-bar" />
      </div>

      {/* Titik-titik loading */}
      <div className="mt-5 flex gap-2" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-[#006316] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-[#006316] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-[#006316] animate-bounce" />
      </div>
    </div>
  );
}