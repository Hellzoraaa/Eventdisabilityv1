import React, { useEffect, useMemo } from 'react';
import { Icon } from './Icon.tsx';
import { ApplicationSettings } from '../types.ts';
import { KosakataPublik } from './KosakataPublik.tsx';

export type ArtikelJenis = 'braille' | 'isyarat' | 'umum';
export type RouteJenis = 'braille' | 'isyarat';
export type RouteBagian = 'pedoman' | 'panduan' | 'kosa-isyarat';

export interface Article {
  slug: string;
  title: string;
  category: string;
  date: string;
  content: string;
  body: string[];
  /** Kelompok artikel. 'umum' hanya tampil di daftar "Semua Artikel". */
  jenis: ArtikelJenis;
  /** Pedoman / Panduan (kosa isyarat bukan artikel, diambil dari data kosakata). */
  bagian?: 'pedoman' | 'panduan';
  fromDatabase?: boolean;
}

const PENUTUP =
  'Kementerian Agama dan lembaga mitra terus memperluas jaringan pendampingan dan cetakan mushaf ramah disabilitas di seluruh wilayah Indonesia agar tidak ada sahabat disabilitas yang tertinggal dalam mengakses ilmu Al-Quran.';

/* ------------------------------------------------------------------ */
/* Struktur menu: Artikel > Braille / Isyarat > Pedoman / Panduan / Kosa Isyarat */
/* ------------------------------------------------------------------ */
export const BAGIAN_LABEL: Record<RouteBagian, string> = {
  pedoman: 'Pedoman',
  panduan: 'Panduan',
  'kosa-isyarat': 'Kosa Isyarat',
};
export const JENIS_LABEL: Record<RouteJenis, string> = { braille: 'Braille', isyarat: 'Isyarat' };

const BAGIAN_BY_JENIS: Record<RouteJenis, RouteBagian[]> = {
  braille: ['pedoman', 'panduan'],
  isyarat: ['pedoman', 'panduan', 'kosa-isyarat'],
};

/** Dipakai navbar untuk membangun dropdown Artikel. */
export const ARTIKEL_MENU = (Object.keys(BAGIAN_BY_JENIS) as RouteJenis[]).map(jenis => ({
  jenis,
  label: JENIS_LABEL[jenis],
  bagian: BAGIAN_BY_JENIS[jenis].map(key => ({ key, label: BAGIAN_LABEL[key] })),
}));

/** Tautan hash: articleHref() -> #artikel, articleHref('isyarat','kosa-isyarat') -> #artikel/isyarat/kosa-isyarat */
export const articleHref = (jenis?: RouteJenis, bagian?: RouteBagian) =>
  `#artikel${jenis ? `/${jenis}` : ''}${jenis && bagian ? `/${bagian}` : ''}`;

export const ARTICLES: Article[] = [
  {
    slug: 'panduan-al-quran-braille',
    title: 'Panduan Mudah Mengenal Al-Quran Braille Standar Indonesia',
    category: 'Disabilitas Netra',
    date: '15 September 2024',
    jenis: 'braille',
    bagian: 'panduan',
    content:
      'Al-Quran Braille di Indonesia mengacu pada standar resmi Kementerian Agama RI dengan sistem 6 titik timbul yang memudahkan para tunanetra membaca dengan sentuhan ujung jari. Pelajari tanda harakat, tajwid braille, dan panduan dasar belajarnya di sini.',
    body: [],
  },
  {
    slug: 'huruf-hijaiyah-isyarat',
    title: 'Metode Pembelajaran Huruf Hijaiyah Isyarat (BISINDO & SIBI)',
    category: 'Disabilitas Rungu / Tuli',
    date: '10 September 2024',
    jenis: 'isyarat',
    bagian: 'panduan',
    content:
      'Pembelajaran Al-Quran bagi teman Tuli kini semakin inklusif berkat pengembangan isyarat hijaiyah dan tafsir isyarat Al-Quran. Melalui visualisasi makhraj huruf dan ekspresi gerak tangan, pemahaman makna ayat suci dapat dicapai dengan komprehensif.',
    body: [],
  },
  {
    slug: 'aksesibilitas-fisik-rumah-quran',
    title: 'Standarisasi Aksesibilitas Fisik Rumah Quran & Masjid Inklusif',
    category: 'Disabilitas Daksa & Fisik',
    date: '02 September 2024',
    jenis: 'umum',
    content:
      'Mewujudkan rumah quran ramah disabilitas daksa mencakup pembuatan ramp dengan kemiringan maksimal 1:12, handrail pemandu, pintu minimal lebar 90cm, dan toilet wudhu ramah kursi roda.',
    body: [],
  },
].map(a => ({ ...a, body: [a.content, PENUTUP] })) as Article[];

/* ------------------------------------------------------------------ */
/* Routing lewat hash                                                  */
/* ------------------------------------------------------------------ */
export interface ArticleRoute {
  open: boolean;
  slug: string | null;
  jenis: RouteJenis | null;
  bagian: RouteBagian | null;
}

/** Buka halaman artikel (daftar) atau satu artikel lewat hash URL. */
export const openArticlesPage = (slug?: string) => {
  window.location.hash = slug ? `#artikel/${slug}` : '#artikel';
};

/**
 * "#artikel"                      -> semua artikel
 * "#artikel/braille"              -> artikel Braille
 * "#artikel/isyarat/kosa-isyarat" -> kosa isyarat
 * "#artikel/<slug>"               -> detail satu artikel
 */
export const parseArticleHash = (hash: string): ArticleRoute => {
  const closed: ArticleRoute = { open: false, slug: null, jenis: null, bagian: null };
  const m = /^#artikel(?:\/([\w-]+))?(?:\/([\w-]+))?\/?$/.exec(hash);
  if (!m) return closed;
  const [, a, b] = m;
  if (a === 'braille' || a === 'isyarat') {
    const bagian = b && BAGIAN_BY_JENIS[a].includes(b as RouteBagian) ? (b as RouteBagian) : null;
    return { open: true, slug: null, jenis: a, bagian };
  }
  return { open: true, slug: a ?? null, jenis: null, bagian: null };
};

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */
interface ArticlesPageProps {
  slug: string | null;
  jenis?: RouteJenis | null;
  bagian?: RouteBagian | null;
  currentLang: 'id' | 'en';
  appSettings?: ApplicationSettings;
  /** Navbar yang sama persis dengan homepage (dikirim dari PublicLandingPage). */
  navbar: React.ReactNode;
}

const pill = (active: boolean) =>
  `px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
    active ? 'bg-[#006316] text-white border-[#006316]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
  }`;

export const ArticlesPage: React.FC<ArticlesPageProps> = ({ slug, jenis = null, bagian = null, currentLang, appSettings, navbar }) => {
  const id = currentLang === 'id';

  const [databaseArticles, setDatabaseArticles] = React.useState<Article[]>([]);

  useEffect(() => {
    let active = true;
    const apiBase = (import.meta as any).env?.VITE_API_URL || '';
    fetch(`${apiBase}/api/articles`)
      .then(response => { if (!response.ok) throw new Error('Gagal memuat artikel publik'); return response.json(); })
      .then(data => {
        if (!active || !Array.isArray(data.articles)) return;
        const mapped: Article[] = data.articles.map((item: any) => {
          const category = String(item.category || '');
          const isBraille = category.toLocaleLowerCase().includes('braille');
          const jenis: ArtikelJenis = isBraille ? 'braille' : category.toLocaleLowerCase().includes('isyarat') ? 'isyarat' : 'umum';
          const bagian: 'pedoman' | 'panduan' | undefined = category.toLocaleLowerCase().startsWith('pedoman') ? 'pedoman' : category.toLocaleLowerCase().startsWith('panduan') ? 'panduan' : undefined;
          const slugId = String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '-');
          return {
            slug: `db-${slugId}`, title: String(item.title || 'Artikel'), category, date: item.publishedAt || item.updatedAt || item.createdAt || '',
            content: String(item.content || ''), body: [], jenis, bagian, fromDatabase: true,
          };
        });
        setDatabaseArticles(mapped);
      })
      .catch(error => console.warn('[ArticlesPage] Artikel dari API tidak tersedia:', error));
    return () => { active = false; };
  }, []);

  const allArticles = useMemo(() => [...databaseArticles, ...ARTICLES], [databaseArticles]);
  const article = useMemo(() => allArticles.find(a => a.slug === slug) || null, [allArticles, slug]);

  const visible = useMemo(
    () => allArticles.filter(a => (!jenis || a.jenis === jenis) && (!bagian || (bagian === 'kosa-isyarat' ? a.category === 'Kosa Isyarat' : a.bagian === bagian))),
    [allArticles, jenis, bagian]
  );

  const idx = article ? allArticles.findIndex(a => a.slug === article.slug) : -1;
  const prev = idx > 0 ? allArticles[idx - 1] : null;
  const next = idx >= 0 && idx < allArticles.length - 1 ? allArticles[idx + 1] : null;

  const sectionTitle = [
    id ? 'Artikel' : 'Articles',
    jenis ? JENIS_LABEL[jenis] : '',
    bagian ? BAGIAN_LABEL[bagian] : '',
  ].filter(Boolean).join(' - ');

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const base = appSettings?.applicationName || "AL-QUR'AN DISABILITAS";
    const prevTitle = document.title;
    document.title = article ? `${article.title} | ${base}` : `${sectionTitle} | ${base}`;
    return () => { document.title = prevTitle; };
  }, [slug, jenis, bagian]);

  const jenisBadge = (a: Article) =>
    [a.jenis !== 'umum' ? JENIS_LABEL[a.jenis] : '', a.bagian ? BAGIAN_LABEL[a.bagian] : ''].filter(Boolean).join(' • ');

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-[#F4F8F3] text-slate-800">
      {navbar}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {article ? (
          /* ---------- DETAIL ARTIKEL ---------- */
          <article className="bg-white border border-[#DCE8DE] rounded-3xl p-6 sm:p-10 shadow-sm">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500 mb-4">
              <a href={articleHref()} className="hover:text-[#006316]">{id ? 'Artikel' : 'Articles'}</a>
              {article.jenis !== 'umum' && (
                <>
                  <span>/</span>
                  <a href={articleHref(article.jenis as RouteJenis)} className="hover:text-[#006316]">{JENIS_LABEL[article.jenis as RouteJenis]}</a>
                  {article.bagian && (
                    <>
                      <span>/</span>
                      <a href={articleHref(article.jenis as RouteJenis, article.bagian)} className="hover:text-[#006316]">{BAGIAN_LABEL[article.bagian]}</a>
                    </>
                  )}
                </>
              )}
            </nav>

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
              {article.fromDatabase ? <div className="article-published-html" dangerouslySetInnerHTML={{ __html: article.content }} /> : article.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>

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
              href={article.jenis !== 'umum' ? articleHref(article.jenis as RouteJenis, article.bagian) : articleHref()}
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
            <a href={articleHref()} className="inline-block mt-4 text-[13px] font-semibold text-[#006316] hover:underline">
              {id ? 'Lihat semua artikel' : 'See all articles'}
            </a>
          </div>
        ) : (
          /* ---------- DAFTAR: Semua / Braille / Isyarat ---------- */
          <>
            <header className="mb-6">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#006316] tracking-tight">
                {jenis
                  ? `${id ? 'Artikel' : 'Articles'} ${JENIS_LABEL[jenis]}${bagian ? ` - ${BAGIAN_LABEL[bagian]}` : ''}`
                  : id ? 'Artikel & Panduan Inklusi' : 'Articles & Inclusion Guides'}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-slate-600 mt-2 max-w-2xl">
                {id
                  ? "Bacaan dan panduan seputar pembelajaran Al-Qur'an yang ramah bagi semua ragam disabilitas."
                  : "Reading and guides on Qur'an learning that is accessible to every kind of disability."}
              </p>
            </header>

            {/* Tingkat 1: Semua / Braille / Isyarat */}
            <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={id ? 'Jenis artikel' : 'Article type'}>
              <a href={articleHref()} aria-current={!jenis ? 'page' : undefined} className={pill(!jenis)}>{id ? 'Semua' : 'All'}</a>
              {ARTIKEL_MENU.map(g => (
                <a key={g.jenis} href={articleHref(g.jenis)} aria-current={jenis === g.jenis ? 'page' : undefined} className={pill(jenis === g.jenis)}>
                  {g.label}
                </a>
              ))}
            </div>

            {/* Tingkat 2: Pedoman / Panduan / Kosa Isyarat (muncul setelah memilih Braille / Isyarat) */}
            {jenis && (
              <div className="flex flex-wrap gap-2 mb-6 pl-3 border-l-2 border-emerald-200" role="group" aria-label={id ? 'Bagian' : 'Section'}>
                <a href={articleHref(jenis)} aria-current={!bagian ? 'page' : undefined} className={pill(!bagian)}>{id ? 'Semua' : 'All'}</a>
                {BAGIAN_BY_JENIS[jenis].map(b => (
                  <a key={b} href={articleHref(jenis, b)} aria-current={bagian === b ? 'page' : undefined} className={pill(bagian === b)}>
                    {BAGIAN_LABEL[b]}
                  </a>
                ))}
              </div>
            )}
            {!jenis && <div className="mb-3" />}

            {bagian === 'kosa-isyarat' ? (
              <div className="bg-white border border-[#DCE8DE] rounded-3xl p-5 sm:p-8 shadow-sm">
                <KosakataPublik id={id} className="" />
              </div>
            ) : visible.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <Icon name="article" className="text-[48px] text-slate-300 mb-2" />
                <p className="text-[14px] text-slate-600">{id ? 'Belum ada artikel pada bagian ini.' : 'No articles in this section yet.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {visible.map(art => (
                  <a
                    key={art.slug}
                    href={`#artikel/${art.slug}`}
                    className="group bg-white border border-[#DCE8DE] rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#006316]/50 transition-all flex flex-col"
                  >
                    <span className="self-start px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {jenisBadge(art) || art.category}
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
            )}
          </>
        )}
      </main>

      <footer className="w-full border-t border-[#DCE8DE] bg-white py-6 text-center text-[12px] text-slate-500">
        © 2026 Disability Event Platform Indonesia. {id ? 'Seluruh hak cipta dilindungi.' : 'All rights reserved.'}
      </footer>
    </div>
  );
};