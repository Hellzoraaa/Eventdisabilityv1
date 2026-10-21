import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';
import { goHome, leaveEventPage } from './EventDetailPage.tsx';

// ---------------------------------------------------------------------------
// Halaman Test peserta, dibuka dari menu Pendidikan > Test.
//   #test/pretest  |  #test/postest
// Alur: isi email -> sistem mengecek event yang diikuti -> pilih event -> kerjakan soal -> nilai.
// Kunci jawaban tidak pernah dikirim ke browser; penilaian dilakukan di server.
// ---------------------------------------------------------------------------

export type TestTipe = 'pretest' | 'postest';
export type TestRoute = { tipe: TestTipe };

export function parseTestRoute(hash: string): TestRoute | null {
  const match = hash.match(/^#test\/(pretest|postest)\/?$/);
  return match ? { tipe: match[1] as TestTipe } : null;
}

interface TestEvent { eventId: string; namaKegiatan: string; jumlahSoal: number; sudahMengerjakan: boolean }
interface TestSoal { id: string; pertanyaan: string; pilihan: string[] }
interface TestResult { nilai: number; benar: number; total: number }

interface Props {
  tipe: TestTipe;
  appSettings?: { logo?: string; applicationName?: string; institutionSubtitle?: string; topbarColor?: string };
}

const HURUF = ['A', 'B', 'C', 'D', 'E'];
const LABEL: Record<TestTipe, string> = { pretest: 'Pretest', postest: 'Postest' };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Terjadi kesalahan. Silakan coba lagi.');
  return data as T;
}

export const TestPage: React.FC<Props> = ({ tipe, appSettings }) => {
  const [step, setStep] = useState<'email' | 'events' | 'quiz' | 'result'>('email');
  const [email, setEmail] = useState('');
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<TestEvent | null>(null);
  const [soal, setSoal] = useState<TestSoal[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const label = LABEL[tipe];
  const darkBar = !!appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff';

  // Pindah antara Pretest <-> Postest dari menu: mulai dari awal.
  useEffect(() => {
    setStep('email'); setEvents([]); setActiveEvent(null); setSoal([]); setAnswers({}); setResult(null); setError('');
    window.scrollTo(0, 0);
  }, [tipe]);

  const checkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await postJson<{ events: TestEvent[] }>('/api/test/lookup', { tipe, email });
      if (!data.events.length) {
        setError('Email ini belum terdaftar di event/pelatihan mana pun. Pastikan email sama dengan yang Anda gunakan saat mendaftar.');
        return;
      }
      setEvents(data.events);
      setStep('events');
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memeriksa email.'); }
    finally { setBusy(false); }
  };

  const startTest = async (ev: TestEvent) => {
    setBusy(true); setError('');
    try {
      const data = await postJson<{ soal: TestSoal[] }>('/api/test/start', { tipe, email, eventId: ev.eventId });
      setActiveEvent(ev); setSoal(data.soal); setAnswers({}); setStep('quiz');
      window.scrollTo(0, 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat soal.'); }
    finally { setBusy(false); }
  };

  const submitTest = async () => {
    if (!activeEvent) return;
    const unanswered = soal.filter(s => !answers[s.id]).length;
    if (unanswered > 0 && !window.confirm(`Masih ada ${unanswered} soal yang belum dijawab. Kirim jawaban sekarang?`)) return;
    setBusy(true); setError('');
    try {
      const data = await postJson<TestResult>('/api/test/submit', { tipe, email, eventId: activeEvent.eventId, jawaban: answers });
      setResult(data); setStep('result');
      // Tandai selesai agar tidak bisa dipilih lagi di daftar event.
      setEvents(prev => prev.map(x => x.eventId === activeEvent.eventId ? { ...x, sudahMengerjakan: true } : x));
      window.scrollTo(0, 0);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal mengirim jawaban.'); }
    finally { setBusy(false); }
  };

  const inputCls = 'w-full px-4 py-3 border border-slate-200 rounded-xl text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600';
  const primaryBtn = 'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const topBar = (
    <nav
      className="sticky top-0 z-40 w-full border-b shadow-2xs"
      style={{ backgroundColor: appSettings?.topbarColor || '#ffffff', borderColor: darkBar ? 'rgba(255,255,255,0.15)' : '#f1f5f9', color: darkBar ? '#ffffff' : '#1e293b' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <button type="button" onClick={goHome} className="flex items-center gap-3 text-left cursor-pointer" aria-label="Ke beranda">
          {appSettings?.logo
            ? <img src={appSettings.logo} alt={appSettings.applicationName || 'Logo Aplikasi'} className="w-10 h-10 object-contain" />
            : <Icon name="menu_book" className="text-4xl text-teal-700" />}
          <span className="flex flex-col">
            <span className={`font-bold text-[16px] sm:text-[19px] tracking-tight leading-tight ${darkBar ? 'text-white' : 'text-slate-900'}`}>
              {appSettings?.applicationName || "Event for Disability to Qur'an"}
            </span>
            <span className={`text-[11px] font-medium hidden sm:inline ${darkBar ? 'text-white/80' : 'text-slate-500'}`}>
              {appSettings?.institutionSubtitle || 'Platform Pelatihan & Pemberdayaan Sahabat Disabilitas'}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={leaveEventPage}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${darkBar ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Kembali</span>
        </button>
      </div>
    </nav>
  );

  const errorBox = error && (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-800">{error}</div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {topBar}
      <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[12px] font-bold">
            <Icon name="quiz" className="text-[16px]" />{label}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3">{label} Peserta</h1>
        </div>

        {/* LANGKAH 1: email */}
        {step === 'email' && (
          <form onSubmit={checkEmail} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
            <p className="text-[14px] text-slate-600">
              Masukkan email yang Anda gunakan saat mendaftar di event/pelatihan. Sistem akan memeriksa event apa saja yang Anda ikuti.
            </p>
            <div>
              <label htmlFor="test-email" className="block text-[13px] font-semibold text-slate-800 mb-1.5">Email Peserta *</label>
              <input id="test-email" type="email" required autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="nama@email.com" className={inputCls} />
            </div>
            {errorBox}
            <button type="submit" disabled={busy || !email.trim()} className={`${primaryBtn} w-full`}>
              {busy ? 'Memeriksa email…' : 'Periksa Email'}
            </button>
          </form>
        )}

        {/* LANGKAH 2: pilih event yang terdaftar */}
        {step === 'events' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-500">Email terverifikasi</p>
                  <p className="text-[14px] font-bold text-slate-900 truncate">{email.trim().toLowerCase()}</p>
                </div>
                <button type="button" onClick={() => { setStep('email'); setEvents([]); setError(''); }} className="text-[13px] font-semibold text-emerald-700 hover:underline cursor-pointer shrink-0">Ganti email</button>
              </div>
              <p className="text-[13px] text-slate-600 mt-3">
                {events.length === 1
                  ? `Anda terdaftar di 1 event. Pilih event untuk memulai ${label}.`
                  : `Anda terdaftar di ${events.length} event. Pilih event yang ingin dikerjakan ${label}-nya.`}
              </p>
            </div>

            {errorBox}

            <ul className="space-y-3">
              {events.map(ev => {
                const unavailable = ev.sudahMengerjakan || ev.jumlahSoal === 0;
                return (
                  <li key={ev.eventId}>
                    <button
                      type="button"
                      disabled={busy || unavailable}
                      onClick={() => void startTest(ev)}
                      className={`w-full text-left bg-white rounded-2xl border p-5 flex items-center justify-between gap-4 transition-colors ${unavailable ? 'border-slate-200 opacity-70 cursor-not-allowed' : 'border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 cursor-pointer'}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-[15px] font-bold text-slate-900">{ev.namaKegiatan}</span>
                        <span className="block text-[12px] text-slate-500 mt-1">
                          {ev.sudahMengerjakan ? `${label} sudah dikerjakan` : ev.jumlahSoal === 0 ? `Soal ${label} belum tersedia` : `${ev.jumlahSoal} soal`}
                        </span>
                      </span>
                      {ev.sudahMengerjakan
                        ? <Icon name="check_circle" className="text-[24px] text-emerald-600 shrink-0" />
                        : !unavailable && <Icon name="arrow_forward" className="text-[22px] text-emerald-700 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* LANGKAH 3: kerjakan soal */}
        {step === 'quiz' && activeEvent && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[12px] font-semibold text-slate-500">{label} untuk event</p>
              <p className="text-[16px] font-bold text-slate-900">{activeEvent.namaKegiatan}</p>
              <p className="text-[12px] text-slate-500 mt-1">{Object.keys(answers).length} dari {soal.length} soal terjawab</p>
            </div>

            {soal.map((s, idx) => (
              <fieldset key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <legend className="sr-only">Soal {idx + 1}</legend>
                <p className="text-[14px] font-semibold text-slate-900 whitespace-pre-wrap"><span className="text-emerald-700 mr-1">{idx + 1}.</span>{s.pertanyaan}</p>
                <div className="mt-3 space-y-2">
                  {s.pilihan.map((p, i) => {
                    const huruf = HURUF[i];
                    const checked = answers[s.id] === huruf;
                    return (
                      <label key={huruf} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] cursor-pointer transition-colors ${checked ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name={`soal-${s.id}`} checked={checked} onChange={() => setAnswers(prev => ({ ...prev, [s.id]: huruf }))} className="mt-0.5 accent-emerald-700" />
                        <span><span className="font-bold mr-1.5">{huruf}.</span>{p}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {errorBox}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <button type="button" disabled={busy} onClick={() => { if (window.confirm('Keluar dari test? Jawaban Anda belum tersimpan.')) { setStep('events'); setSoal([]); setAnswers({}); } }} className="px-5 py-3 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer">
                Batal
              </button>
              <button type="button" disabled={busy} onClick={() => void submitTest()} className={primaryBtn}>
                {busy ? 'Mengirim…' : `Kirim Jawaban ${label}`}
              </button>
            </div>
          </div>
        )}

        {/* LANGKAH 4: hasil */}
        {step === 'result' && result && activeEvent && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 text-center space-y-4 shadow-sm">
            <Icon name="check_circle" className="text-[56px] text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">{label} selesai dikerjakan</h2>
            <p className="text-[13px] text-slate-600">{activeEvent.namaKegiatan}</p>
            <p className="text-5xl font-extrabold text-emerald-700">{result.nilai % 1 === 0 ? result.nilai : result.nilai.toFixed(2)}</p>
            <p className="text-[13px] text-slate-600">{result.benar} dari {result.total} soal dijawab benar</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              {events.some(x => !x.sudahMengerjakan && x.jumlahSoal > 0) && (
                <button type="button" onClick={() => { setStep('events'); setResult(null); setActiveEvent(null); setSoal([]); setAnswers({}); }} className={primaryBtn}>Kerjakan Event Lain</button>
              )}
              <button type="button" onClick={goHome} className="px-5 py-3 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer">Ke Beranda</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
