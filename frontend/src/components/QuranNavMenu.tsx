import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';
import { ARTIKEL_MENU, articleHref, RouteJenis } from './ArticlesPage.tsx';

/**
 * Menu navbar "Qur’an Isyarat" dan "Qur’an Braille".
 *
 * Menu ini hanya jalan pintas (relasi) ke bagian situs yang sudah ada, disaring
 * sesuai jenis Qur’an yang dipilih:
 *
 *   Training Of Trainer / Pelatihan / Lomba Umum -> Katalog Event, disaring tipe + jenis Qur’an
 *   Test (Pretest / Postest)                      -> halaman Test
 *   Pendidikan                                    -> Program TPQ, disaring jenis peserta
 *   Pedoman / Panduan / Kosa Isyarat              -> Artikel > Isyarat | Braille > bagian terkait
 *
 * Satu komponen untuk desktop (dropdown melayang) dan mobile (accordion).
 * Daftar Pedoman / Panduan / Kosa Isyarat diambil dari ARTIKEL_MENU, jadi selalu
 * sama dengan dropdown Artikel (Braille tidak punya Kosa Isyarat).
 */

export type QuranJenis = RouteJenis; // 'braille' | 'isyarat'
export type QuranEventTipe = 'tot' | 'pelatihan' | 'lomba';
export type QuranTestTipe = 'pretest' | 'postest';

const EVENT_ITEMS: { tipe: QuranEventTipe; id: string; en: string }[] = [
  { tipe: 'tot', id: 'Training Of Trainer', en: 'Training of Trainers' },
  { tipe: 'pelatihan', id: 'Pelatihan', en: 'Training' },
  { tipe: 'lomba', id: 'Lomba Umum', en: 'Public Competition' },
];

const BAGIAN_EN: Record<string, string> = {
  pedoman: 'Guidelines',
  panduan: 'Guide',
  'kosa-isyarat': 'Sign Vocabulary',
};

interface Props {
  jenis: QuranJenis;
  label: string;
  lang?: 'id' | 'en';
  variant?: 'desktop' | 'mobile';
  /** Kelas tombol utama (desktop: gaya menu navbar, mobile: gaya item menu mobile). */
  className?: string;
  onSelectEvent: (jenis: QuranJenis, tipe: QuranEventTipe) => void;
  onSelectTest: (tipe: QuranTestTipe) => void;
  onSelectPendidikan: (jenis: QuranJenis) => void;
  /** Dipanggil setelah sebuah item dipilih (mis. menutup menu mobile). */
  onNavigate?: () => void;
}

const Chevron = ({ open }: { open: boolean }) => (
  <Icon
    name="keyboard_arrow_down"
    className="text-[18px] leading-none transition-transform duration-200"
    style={{ transform: open ? 'rotate(180deg)' : 'none' }}
    aria-hidden="true"
  />
);

export const QuranNavMenu: React.FC<Props> = ({
  jenis,
  label,
  lang = 'id',
  variant = 'desktop',
  className = '',
  onSelectEvent,
  onSelectTest,
  onSelectPendidikan,
  onNavigate,
}) => {
  const [open, setOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = lang === 'id';

  const bagian = ARTIKEL_MENU.find(g => g.jenis === jenis)?.bagian ?? [];

  // Tutup saat klik di luar / tekan Escape (desktop).
  useEffect(() => {
    if (!open || variant !== 'desktop') return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTestOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setTestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, variant]);

  const done = () => {
    setOpen(false);
    setTestOpen(false);
    onNavigate?.();
  };

  const testLabel = 'Test';
  const pendidikanLabel = id ? 'Pendidikan' : 'Education';

  /* ---------------------------- MOBILE (accordion) ---------------------------- */
  if (variant === 'mobile') {
    const row = 'flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13.5px] hover:bg-slate-100 cursor-pointer';
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className={`w-full flex items-center justify-between cursor-pointer ${className}`}
        >
          <span>{label}</span>
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[20px]" />
        </button>

        {open && (
          <div className="ml-3 mt-1 pl-3 border-l-2 border-emerald-100 flex flex-col space-y-1">
            {EVENT_ITEMS.map(item => (
              <button
                key={item.tipe}
                type="button"
                onClick={() => { onSelectEvent(jenis, item.tipe); done(); }}
                className={row}
              >
                <span>{id ? item.id : item.en}</span>
              </button>
            ))}

            {/* Test: ketuk untuk menampilkan Pretest & Postest */}
            <button
              type="button"
              aria-expanded={testOpen}
              onClick={() => setTestOpen(o => !o)}
              className={`${row} justify-between ${testOpen ? 'bg-emerald-50 text-[#006316] font-bold' : ''}`}
            >
              <span>{testLabel}</span>
              <Icon name={testOpen ? 'expand_less' : 'expand_more'} className="text-[18px]" />
            </button>
            {testOpen && (
              <div className="ml-3 pl-2 border-l-2 border-emerald-100 flex flex-col space-y-1">
                <button type="button" onClick={() => { onSelectTest('pretest'); done(); }} className={row}>
                  Pretest
                </button>
                <button type="button" onClick={() => { onSelectTest('postest'); done(); }} className={row}>
                  Postest
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => { onSelectPendidikan(jenis); done(); }}
              className={row}
            >
              <span>{pendidikanLabel}</span>
            </button>

            {bagian.map(b => (
              <a
                key={b.key}
                href={articleHref(jenis, b.key)}
                onClick={done}
                className={row}
              >
                {id ? b.label : (BAGIAN_EN[b.key] ?? b.label)}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------- DESKTOP (dropdown melayang) ------------------------- */
  const item =
    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-left transition-colors cursor-pointer text-slate-700 hover:bg-slate-50';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${className} inline-flex items-center gap-1 cursor-pointer`}
      >
        <span>{label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full mt-3 w-60 bg-white rounded-2xl p-2 shadow-2xl border border-slate-100 z-50 text-slate-800"
        >
          {EVENT_ITEMS.map(ev => (
            <button
              key={ev.tipe}
              type="button"
              role="menuitem"
              onClick={() => { onSelectEvent(jenis, ev.tipe); done(); }}
              className={item}
            >
              <span>{id ? ev.id : ev.en}</span>
            </button>
          ))}

          {/* Test: klik untuk menampilkan Pretest & Postest */}
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={testOpen}
            onClick={() => setTestOpen(o => !o)}
            className={`${item} justify-between ${testOpen ? '!bg-emerald-50 !text-[#006316]' : ''}`}
          >
            <span>{testLabel}</span>
            <Chevron open={testOpen} />
          </button>
          {testOpen && (
            <div className="ml-3 pl-2 border-l-2 border-emerald-100">
              <button type="button" role="menuitem" onClick={() => { onSelectTest('pretest'); done(); }} className={item}>
                Pretest
              </button>
              <button type="button" role="menuitem" onClick={() => { onSelectTest('postest'); done(); }} className={item}>
                Postest
              </button>
            </div>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => { onSelectPendidikan(jenis); done(); }}
            className={item}
          >
            <span>{pendidikanLabel}</span>
          </button>

          <div className="my-1.5 mx-2 border-t border-slate-100" role="separator" />

          {bagian.map(b => (
            <a
              key={b.key}
              href={articleHref(jenis, b.key)}
              role="menuitem"
              onClick={done}
              className={`${item} block`}
            >
              {id ? b.label : (BAGIAN_EN[b.key] ?? b.label)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
