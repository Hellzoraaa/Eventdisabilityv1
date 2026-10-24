/**
 * Parsing impor Bank Soal dari file CSV/TSV atau teks yang ditempel dari Excel.
 * Berjalan sepenuhnya di browser; hasilnya ditampilkan sebagai pratinjau sebelum dikirim ke server.
 */
export type SoalTipe = 'pretest' | 'postest' | 'latihan';

export const HURUF = ['A', 'B', 'C', 'D', 'E'];
export const MAX_IMPORT_ROWS = 500;
const MAX_QUESTION_LENGTH = 2000;
const MAX_OPTION_LENGTH = 500;

export interface ImportRow {
  /** Nomor baris di file (baris 1 = judul kolom). */
  line: number;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: string;
  tipe: SoalTipe;
  /** Masalah yang membuat baris tidak bisa diimpor. */
  error?: string;
  /** Soal yang sama (event, jenis, dan pertanyaan) sudah ada atau muncul lebih dulu di file. */
  duplicate?: boolean;
}

export interface ImportParseResult {
  rows: ImportRow[];
  /** Masalah pada file secara keseluruhan (judul kolom tidak dikenali, terlalu banyak baris, dll.). */
  fileError?: string;
}

export const SOAL_TEMPLATE_CSV =
  '\uFEFFsep=;\r\n' +
  'Pertanyaan;A;B;C;D;E;Jawaban;Jenis\r\n' +
  '"Berapa jumlah huruf hijaiyah?";"26";"28";"30";"32";;B;pretest\r\n' +
  '"Huruf pertama dalam abjad hijaiyah adalah...";"Alif";"Ba";"Ta";"Tsa";;A;pretest\r\n' +
  '"Hukum bacaan nun sukun bertemu huruf ba adalah...";"Idgham";"Iqlab";"Ikhfa";"Izhar";;B;postest\r\n';

export const normalizeQuestion = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();
export const soalKey = (eventId: string, tipe: string, pertanyaan: string): string =>
  `${eventId || ''}|${tipe}|${normalizeQuestion(pertanyaan)}`;

const HEADER_ALIASES: Record<string, string[]> = {
  pertanyaan: ['pertanyaan', 'soal', 'question', 'teksoal', 'pertanyaansoal'],
  a: ['a', 'pilihana', 'opsia', 'jawabana', 'optiona'],
  b: ['b', 'pilihanb', 'opsib', 'jawabanb', 'optionb'],
  c: ['c', 'pilihanc', 'opsic', 'jawabanc', 'optionc'],
  d: ['d', 'pilihand', 'opsid', 'jawaband', 'optiond'],
  e: ['e', 'pilihane', 'opsie', 'jawabane', 'optione'],
  jawaban: ['jawaban', 'kunci', 'kuncijawaban', 'jawabanbenar', 'answer', 'correct'],
  jenis: ['jenis', 'jenissoal', 'tipe', 'type'],
};

const normalizeHeader = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Pisahkan teks menjadi baris dan sel; mendukung tanda kutip, kutip ganda, dan baris baru di dalam sel. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"' && field === '') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function detectDelimiter(headerLine: string): string {
  const counts: [string, number][] = [['\t', 0], [';', 0], [',', 0]];
  for (const ch of headerLine) {
    const entry = counts.find(([d]) => d === ch);
    if (entry) entry[1]++;
  }
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

function resolveAnswer(raw: string, pilihan: string[]): string {
  const v = raw.trim();
  if (!v) return '';
  const letter = v.toUpperCase().match(/^([A-E])[.)]?$/);
  if (letter) return letter[1];
  if (/^[1-5]$/.test(v)) return HURUF[Number(v) - 1];
  const idx = pilihan.findIndex(p => p.trim().toLowerCase() === v.toLowerCase());
  return idx >= 0 ? HURUF[idx] : '';
}

function resolveTipe(raw: string, fallback: SoalTipe): SoalTipe | null {
  const v = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (!v) return fallback;
  if (v === 'pretest') return 'pretest';
  if (v === 'postest' || v === 'posttest') return 'postest';
  if (v === 'latihan') return 'latihan';
  return null;
}

export function parseSoalImport(
  rawText: string,
  options: { defaultTipe: SoalTipe; eventId: string; existingKeys: Set<string> },
): ImportParseResult {
  let text = rawText.replace(/^\uFEFF/, '');
  if (!text.trim()) return { rows: [] };

  let delimiter: string | null = null;
  const sepMatch = text.match(/^sep=(.)\r?\n/i);
  if (sepMatch) { delimiter = sepMatch[1]; text = text.slice(sepMatch[0].length); }
  const firstLine = text.split(/\r?\n/).find(l => l.trim()) ?? '';
  const records = parseDelimited(text, delimiter ?? detectDelimiter(firstLine));

  // Nomor baris dihitung dari baris judul = 1 (baris "sep=" tidak dihitung, sama seperti di Excel).
  const headerIdx = records.findIndex(r => r.some(c => c.trim()));
  if (headerIdx < 0) return { rows: [] };
  const headerCells = records[headerIdx].map(normalizeHeader);
  const col: Record<string, number> = {};
  for (const [name, aliases] of Object.entries(HEADER_ALIASES)) {
    col[name] = headerCells.findIndex(h => aliases.includes(h));
  }
  if (col.pertanyaan < 0 || col.a < 0 || col.b < 0 || col.jawaban < 0) {
    return {
      rows: [],
      fileError: 'Judul kolom tidak dikenali. Gunakan kolom: Pertanyaan, A, B, C, D, E, Jawaban, Jenis (kolom C–E dan Jenis boleh dikosongkan). Unduh template untuk contohnya.',
    };
  }

  const dataRecords = records.slice(headerIdx + 1)
    .map((cells, i) => ({ cells, line: headerIdx + 2 + i }))
    .filter(r => r.cells.some(c => c.trim()));
  if (dataRecords.length > MAX_IMPORT_ROWS) {
    return { rows: [], fileError: `Maksimal ${MAX_IMPORT_ROWS} soal per impor (file berisi ${dataRecords.length}). Bagi file menjadi beberapa bagian.` };
  }

  const get = (cells: string[], idx: number) => (idx >= 0 ? (cells[idx] ?? '').trim() : '');
  const seen = new Set<string>();

  const rows: ImportRow[] = dataRecords.map(({ cells, line }) => {
    const pertanyaan = get(cells, col.pertanyaan);
    const opsi = ['a', 'b', 'c', 'd', 'e'].map(k => get(cells, col[k]));
    let last = -1;
    opsi.forEach((o, k) => { if (o) last = k; });
    const pilihan = opsi.slice(0, last + 1);
    const tipeParsed = resolveTipe(get(cells, col.jenis), options.defaultTipe);
    const tipe: SoalTipe = tipeParsed ?? options.defaultTipe;
    const jawabanBenar = resolveAnswer(get(cells, col.jawaban), pilihan);

    let error: string | undefined;
    if (!pertanyaan) error = 'Pertanyaan kosong.';
    else if (pertanyaan.length > MAX_QUESTION_LENGTH) error = `Pertanyaan terlalu panjang (maksimal ${MAX_QUESTION_LENGTH} karakter).`;
    else if (pilihan.some(o => !o)) error = 'Pilihan jawaban harus berurutan; tidak boleh ada pilihan kosong di tengah.';
    else if (pilihan.length < 2) error = 'Minimal 2 pilihan jawaban.';
    else if (pilihan.some(o => o.length > MAX_OPTION_LENGTH)) error = `Pilihan jawaban terlalu panjang (maksimal ${MAX_OPTION_LENGTH} karakter).`;
    else if (!get(cells, col.jawaban)) error = 'Jawaban benar wajib diisi.';
    else if (!jawabanBenar || HURUF.indexOf(jawabanBenar) >= pilihan.length) error = 'Jawaban benar tidak sesuai dengan pilihan yang tersedia (isi huruf A–E).';
    else if (tipeParsed === null) error = 'Jenis soal tidak dikenali (gunakan pretest, postest, atau latihan).';

    let duplicate = false;
    if (!error) {
      const key = soalKey(options.eventId, tipe, pertanyaan);
      duplicate = options.existingKeys.has(key) || seen.has(key);
      seen.add(key);
    }
    return { line, pertanyaan, pilihan, jawabanBenar, tipe, error, duplicate };
  });
  return { rows };
}
