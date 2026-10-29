import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';
import { VideoPlayer } from './KosakataVideo.tsx';

interface Kata { id: string; kata: string; kategori: string; deskripsi: string; videoUrl: string; gambarUrl: string; }

const PAGE_SIZE = 12;

/**
 * Kosa Isyarat untuk halaman publik (hanya baca).
 * Tiap kosakata: teks (kata + keterangan), gambar, dan video YouTube yang diputar langsung di halaman.
 */
export const KosakataPublik: React.FC<{ id?: boolean; className?: string }> = ({
  id = true,
  className = 'mt-10 pt-8 border-t border-slate-100',
}) => {
  const [items, setItems] = useState<Kata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('Semua');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/kosakata-isyarat');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat kosakata.');
        if (alive) setItems(Array.isArray(data.kosakata) ? data.kosakata : []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Gagal memuat kosakata.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const kategoriList = useMemo(
    () => ['Semua', ...Array.from(new Set(items.map(i => i.kategori).filter(Boolean)))],
    [items]
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i =>
      (kategori === 'Semua' || i.kategori === kategori) &&
      (!q || `${i.kata} ${i.deskripsi}`.toLowerCase().includes(q))
    );
  }, [items, search, kategori]);

  useEffect(() => { setLimit(PAGE_SIZE); }, [search, kategori]);

  const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-[#006316]';

  return (
    <section className={className} aria-labelledby="kosakata-judul">
      <h2 id="kosakata-judul" className="text-xl sm:text-2xl font-extrabold text-[#006316] tracking-tight">
        {id ? 'Kosa Isyarat Keislaman' : 'Islamic Sign Vocabulary'}
      </h2>
      <p className="text-[13px] sm:text-[14px] text-slate-600 mt-1.5 mb-5">
        {id
          ? 'Setiap kosakata dilengkapi keterangan, gambar, dan video. Klik video untuk memutarnya langsung di halaman ini.'
          : 'Each term comes with a description, image, and video. Click a video to play it right on this page.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={id ? 'Cari kosakata…' : 'Search vocabulary…'}
          aria-label={id ? 'Cari kosakata' : 'Search vocabulary'}
          className={`${inputCls} flex-1`}
        />
        <select
          value={kategori}
          onChange={e => setKategori(e.target.value)}
          aria-label={id ? 'Filter kategori' : 'Category filter'}
          className={`${inputCls} sm:w-56`}
        >
          {kategoriList.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-[13px]">{id ? 'Memuat kosakata…' : 'Loading…'}</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-[13px]">{id ? 'Belum ada kosakata.' : 'No vocabulary yet.'}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shown.slice(0, limit).map(i => (
              <article key={i.id} className="bg-white rounded-2xl border border-[#DCE8DE] p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[17px] font-bold text-slate-900" style={{ overflowWrap: 'anywhere' }}>{i.kata}</h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-1 text-[11px] font-bold shrink-0">{i.kategori || 'Lainnya'}</span>
                </div>

                {i.deskripsi && (
                  <p className="text-[13px] text-slate-600 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{i.deskripsi}</p>
                )}

                {i.gambarUrl && (
                  <img
                    src={i.gambarUrl}
                    alt={`${id ? 'Gambar isyarat' : 'Sign image'}: ${i.kata}`}
                    loading="lazy"
                    className="w-full max-h-64 object-contain rounded-xl bg-slate-50 border border-slate-100"
                  />
                )}

                {i.videoUrl && <VideoPlayer url={i.videoUrl} title={`${i.kata} (isyarat)`} />}
              </article>
            ))}
          </div>
          {shown.length > limit && (
            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => setLimit(l => l + PAGE_SIZE)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#006316] text-[#006316] hover:bg-emerald-50 text-[13px] font-semibold cursor-pointer"
              >
                <Icon name="expand_more" className="text-[18px]" />
                {id ? 'Tampilkan lebih banyak' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};