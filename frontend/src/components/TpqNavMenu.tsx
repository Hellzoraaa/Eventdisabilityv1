import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';

/**
 * Menu navbar "Program TPQ" dengan dropdown bertingkat:
 *
 *   Program TPQ
 *   ├─ Tunanetra  ─────────────► Pelatihan Al-Qur’an Braille
 *   └─ Tunarungu  ▸ (submenu)
 *        ├─ Pelatihan Al-Qur’an Isyarat Metode Kitabah
 *        ├─ Pelatihan Al-Qur’an Isyarat Metode Tilawah
 *        └─ Pelatihan Al-Qur’an Komunikasi Total
 *
 * Satu komponen untuk desktop (dropdown melayang) dan mobile (accordion).
 * Pilihan dikirim lewat onSelect({label, jenis, metode}); ubah daftar di TPQ_MENU bila perlu.
 */

export interface TpqSelection {
  /** Nama menu yang dipilih (untuk ditampilkan sebagai label filter). */
  label: string;
  /** Jenis TPQ pada data (TPQProgram.jenisTPQ). */
  jenis: 'braille' | 'isyarat';
  /** Metode (hanya untuk Tunarungu). */
  metode?: 'kitabah' | 'tilawah' | 'komunikasi-total';
}

export interface TpqMenuLeaf extends TpqSelection {}
export interface TpqMenuGroup {
  label: string;
  icon: string;
  /** Jika ada `select` -> langsung dipilih. Jika ada `children` -> membuka submenu. */
  select?: TpqSelection;
  children?: TpqMenuLeaf[];
}

export const TPQ_MENU: TpqMenuGroup[] = [
  {
    label: 'Tunanetra',
    icon: 'visibility',
    select: { label: 'Pelatihan Al-Qur’an Braille', jenis: 'braille' },
  },
  {
    label: 'Tunarungu',
    icon: 'sign_language',
    children: [
      { label: 'Pelatihan Al-Qur’an Isyarat Metode Kitabah', jenis: 'isyarat', metode: 'kitabah' },
      { label: 'Pelatihan Al-Qur’an Isyarat Metode Tilawah', jenis: 'isyarat', metode: 'tilawah' },
      { label: 'Pelatihan Al-Qur’an Komunikasi Total', jenis: 'isyarat', metode: 'komunikasi-total' },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * Sumber data tunggal untuk form TPQManagement (Jenis Peserta + Kategori).
 * Semuanya diturunkan dari TPQ_MENU di atas, jadi mengubah menu otomatis
 * mengubah isi form.
 * ------------------------------------------------------------------------- */

export const JENIS_PESERTA_GABUNGAN = 'Tunanetra Dan Tunarungu';

/** Pilihan "Jenis Peserta": tiap grup menu + gabungan keduanya. */
export const JENIS_PESERTA_OPTIONS: string[] = [
  ...TPQ_MENU.map(g => g.label),
  JENIS_PESERTA_GABUNGAN,
];

/** Pilihan "Kategori" sesuai Jenis Peserta yang dipilih. */
export const getKategoriOptions = (jenisPeserta: string): TpqSelection[] => {
  const groups = jenisPeserta === JENIS_PESERTA_GABUNGAN
    ? TPQ_MENU
    : TPQ_MENU.filter(g => g.label === jenisPeserta);
  return groups.flatMap(g => g.children ?? (g.select ? [g.select] : []));
};

/** Samakan penulisan (spasi ganda, jenis tanda petik) agar data lama tetap cocok. */
export const normalizeTpqLabel = (value: string) =>
  String(value || '').replace(/['\u2018\u2019]/g, '\u2019').replace(/\s+/g, ' ').trim();

/** Cari kategori resmi dari teks (mis. data lama). Mengembalikan undefined bila tidak cocok. */
export const findKategori = (value: string): TpqSelection | undefined => {
  const target = normalizeTpqLabel(value);
  return getKategoriOptions(JENIS_PESERTA_GABUNGAN).find(k => normalizeTpqLabel(k.label) === target);
};

interface Props {
  variant?: 'desktop' | 'mobile';
  /** Dipanggil saat sebuah jenis peserta diklik: 'Tunanetra', 'Tunarungu', atau 'Tunanetra Dan Tunarungu'. */
  onSelect: (jenisPeserta: string) => void;
  /** Dipanggil setelah item dipilih (mis. untuk menutup menu mobile). */
  onNavigate?: () => void;
  /** Kelas warna teks tombol utama (desktop), mengikuti warna navbar. */
  className?: string;
  label?: string;
}

const Chevron = ({ open, className = '' }: { open: boolean; className?: string }) => (
  <Icon name="keyboard_arrow_down" className={`text-[18px] leading-none transition-transform duration-200 ${className}`} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
);

/** Menu navbar "Program TPQ": hanya tiga pilihan jenis peserta, tanpa submenu. */
export const TpqNavMenu: React.FC<Props> = ({
  variant = 'desktop',
  onSelect,
  onNavigate,
  className = '',
  label = 'Program TPQ',
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar / tekan Escape (desktop).
  useEffect(() => {
    if (!open || variant !== 'desktop') return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, variant]);

  const choose = (jenisPeserta: string) => {
    onSelect(jenisPeserta);
    setOpen(false);
    onNavigate?.();
  };

  /* ---------------------------- MOBILE (accordion) ---------------------------- */
  if (variant === 'mobile') {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <span>{label}</span>
          <Chevron open={open} />
        </button>

        {open && (
          <div className="ml-3 mt-1 pl-3 border-l-2 border-slate-200 flex flex-col space-y-1">
            {JENIS_PESERTA_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => choose(opt)}
                className="flex items-center gap-2 text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {opt === JENIS_PESERTA_GABUNGAN ? 'Tunanetra dan Tunarungu' : opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------- DESKTOP (dropdown melayang) ------------------------- */
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      >
        {label}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full mt-3 w-64 bg-white text-slate-800 rounded-2xl p-2 shadow-2xl border border-slate-100 z-50"
        >
          {JENIS_PESERTA_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              role="menuitem"
              onClick={() => choose(opt)}
              className="flex w-full items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-[14px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {opt === JENIS_PESERTA_GABUNGAN ? 'Tunanetra dan Tunarungu' : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
