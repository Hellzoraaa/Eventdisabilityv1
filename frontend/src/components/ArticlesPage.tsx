import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.tsx';
import { ApplicationSettings } from '../types.ts';

export interface Article {
  slug: string;
  title: string;
  category: string;
  date: string;
  content: string;
  body: string[];
}

const PENUTUP =
  'Kementerian Agama dan lembaga mitra terus memperluas jaringan pendampingan dan cetakan mushaf ramah disabilitas di seluruh wilayah Indonesia agar tidak ada sahabat disabilitas yang tertinggal dalam mengakses ilmu Al-Quran.';

export const ARTICLES: Article[] = [
  {
    slug: 'panduan-al-quran-braille',
    title: 'Panduan Mudah Mengenal Al-Quran Braille Standar Indonesia',
    category: 'Disabilitas Netra',
    date: '15 September 2024',
    content:
      'Al-Quran Braille di Indonesia mengacu pada standar resmi Kementerian Agama RI dengan sistem 6 titik timbul yang memudahkan para tunanetra membaca dengan sentuhan ujung jari. Pelajari tanda harakat, tajwid braille, dan panduan dasar belajarnya di sini.',
    body: [],
  },
  {
    slug: 'huruf-hijaiyah-isyarat',
    title: 'Metode Pembelajaran Huruf Hijaiyah Isyarat (BISINDO & SIBI)',
    category: 'Disabilitas Rungu / Tuli',
    date: '10 September 2024',
    content:
      'Pembelajaran Al-Quran bagi teman Tuli kini semakin inklusif berkat pengembangan isyarat hijaiyah dan tafsir isyarat Al-Quran. Melalui visualisasi makhraj huruf dan ekspresi gerak tangan, pemahaman makna ayat suci dapat dicapai dengan komprehensif.',
    body: [],
  },
  {
    slug: 'aksesibilitas-fisik-rumah-quran',
    title: 'Standarisasi Aksesibilitas Fisik Rumah Quran & Masjid Inklusif',
    category: 'Disabilitas Daksa & Fisik',
    date: '02 September 2024',
    content:
      'Mewujudkan rumah quran ramah disabilitas daksa mencakup pembuatan ramp dengan kemiringan maksimal 1:12, handrail pemandu, pintu minimal lebar 90cm, dan toilet wudhu ramah kursi roda.',
    body: [],
  },
].map(a => ({ ...a, body: [a.content, PENUTUP] }));

/** Buka halaman artikel (daftar) atau satu artikel lewat hash URL. */
export const openArticlesPage = (slug?: string) => {
  window.location.hash = slug ? `#artikel/${slug}` : '#artikel';
};

/** "#artikel" -> daftar, "#artikel/<slug>" -> detail. Hash lain -> bukan halaman artikel. */
export const parseArticleHash = (hash: string): { open: boolean; slug: string | null } => {
  const m = /^#artikel(?:\/([\w-]+))?\/?$/.exec(hash);
  return m ? { open: true, slug: m[1] ?? null } : { open: false, slug: null };
};

interface ArticlesPageProps {
  slug: string | null;
  currentLang: 'id' | 'en';
  appSettings?: ApplicationSettings;
  /** Navbar yang sama persis dengan homepage (dikirim dari PublicLandingPage). */
  navbar: React.ReactNode;
}

export const ArticlesPage: React.FC<ArticlesPageProps> = ({ slug, currentLang, appSettings, navbar }) => {
  const id = currentLang === 'id';
  const [filter, setFilter] = useState('Semua');

  const article = useMemo(() => ARTICLES.find(a => a.slug === slug) || null, [slug]);
  const categories = useMemo(() => ['Semua', ...Array.from(new Set(ARTICLES.map(a => a.category)))], []);
  const visible = filter === 'Semua' ? ARTICLES : ARTICLES.filter(a => a.category === filter);

  const idx = article ? ARTICLES.findIndex(a => a.slug === article.slug) : -1;
  const prev = idx > 0 ? ARTICLES[idx - 1] : null;
  const next = idx >= 0 && idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const base = appSettings?.applicationName || "AL-QUR'AN DISABILITAS";
    const prevTitle = document.title;
    document.title = article
      ? `${article.title} | ${base}`
      : `${id ? 'Artikel & Panduan Inklusi' : 'Articles & Inclusion Guides'} | ${base}`;
    return () => { document.title = prevTitle; };
  }, [slug]);

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F4F8F3] text-slate-800">
      {/* Navbar: sama persis dengan homepage */}
      {navbar}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {article ? (
          /* ---------- DETAIL ARTIKEL ---------- */
          <article className="bg-white border border-[#DCE8DE] rounded-3xl p-6 sm:p-10 shadow-sm">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[#006316] border border-emerald-200 text-[11px] font-bold uppercase tracking-wider">
              {article.category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mt-3 mb-2">
              {article.title}
            </h1>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500 pb-6 mb-6 border-b border-slate-100">
              <Icon name="calendar_month" className="text-[16px]" />
              <time>{article.date}</time>
            </p>

            <div className="text-[15px] sm:text-[16px] text-slate-700 leading-[1.85] space-y-5">
              {article.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Prev / Next */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 pt-6 border-t border-slate-100">
              {prev ? (
                <a href={`#artikel/${prev.slug}`} className="p-4 rounded-2xl border border-slate-200 hover:border-[#006316]/50 hover:bg-emerald-50/40 transition-all">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <Icon name="arrow_back" className="text-[14px]" />
                    {id ? 'Sebelumnya' : 'Previous'}
                  </span>
                  <span className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{prev.title}</span>
                </a>
              ) : <span />}
              {next ? (
                <a href={`#artikel/${next.slug}`} className="p-4 rounded-2xl border border-slate-200 hover:border-[#006316]/50 hover:bg-emerald-50/40 transition-all sm:text-right">
                  <span className="flex items-center sm:justify-end gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {id ? 'Berikutnya' : 'Next'}
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </span>
                  <span className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2">{next.title}</span>
                </a>
              ) : <span />}
            </div>

            <a
              href="#artikel"
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-full bg-[#006316] hover:bg-[#004D11] text-white text-[13px] font-semibold transition-colors"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>{id ? 'Kembali ke daftar artikel' : 'Back to all articles'}</span>
            </a>
          </article>
        ) : slug ? (
          /* ---------- SLUG TIDAK DITEMUKAN ---------- */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <Icon name="article" className="text-[48px] text-slate-300 mb-2" />
            <h1 className="text-[18px] font-bold text-slate-800">{id ? 'Artikel tidak ditemukan' : 'Article not found'}</h1>
            <a href="#artikel" className="inline-block mt-4 text-[13px] font-semibold text-[#006316] hover:underline">
              {id ? 'Lihat semua artikel' : 'See all articles'}
            </a>
          </div>
        ) : (
          /* ---------- DAFTAR ARTIKEL ---------- */
          <>
            <header className="mb-8">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#006316] tracking-tight">
                {id ? 'Artikel & Panduan Inklusi' : 'Articles & Inclusion Guides'}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-slate-600 mt-2 max-w-2xl">
                {id
                  ? "Bacaan dan panduan seputar pembelajaran Al-Qur'an yang ramah bagi semua ragam disabilitas."
                  : "Reading and guides on Qur'an learning that is accessible to every kind of disability."}
              </p>
            </header>

            {/* Filter kategori */}
            <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label={id ? 'Filter kategori' : 'Category filter'}>
              {categories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  aria-pressed={filter === c}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${filter === c
                    ? 'bg-[#006316] text-white border-[#006316]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {visible.map(art => (
                <a
                  key={art.slug}
                  href={`#artikel/${art.slug}`}
                  className="group bg-white border border-[#DCE8DE] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#006316]/50 transition-all flex flex-col"
                >
                  <span className="self-start px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    {art.category}
                  </span>
                  <h2 className="text-[17px] font-bold text-slate-900 leading-snug mt-2.5 mb-2 group-hover:text-[#006316] transition-colors">
                    {art.title}
                  </h2>
                  <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-3 mb-4">{art.content}</p>
                  <div className="mt-auto flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">{art.date}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#006316]">
                      {id ? 'Baca selengkapnya' : 'Read more'}
                      <Icon name="arrow_forward" className="text-[15px] transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="w-full border-t border-[#DCE8DE] bg-white py-6 text-center text-[12px] text-slate-500">
        © 2026 Disability Event Platform Indonesia. {id ? 'Seluruh hak cipta dilindungi.' : 'All rights reserved.'}
      </footer>
    </div>
  );
};