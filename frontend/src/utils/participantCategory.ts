/**
 * Pilihan "Kategori Peserta" pada formulir pendaftaran mengikuti kategori event/program:
 *  - 1 kategori (mis. Umum)                  -> hanya 1 pilihan (Umum)
 *  - 2 kategori (mis. Tunanetra + Tunarungu) -> 3 pilihan: Tunanetra, Tunarungu, Tunanetra dan Tunarungu
 */
export interface ParticipantCategoryOption {
  value: string;
  label: string;
}

interface MasterLike {
  id?: string;
  kode: string;
  nama: string;
  isAktif?: boolean;
}

export const COMBINED_SEPARATOR = '+';

const GENERAL_RE = /umum|semua kategori|non[- ]?disabilitas/i;
export const isGeneralLabel = (text: string) => GENERAL_RE.test(String(text || ''));

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Nama tampilan sebuah nilai kategori peserta yang tersimpan (mendukung nilai gabungan "a+b"). */
export const formatParticipantCategory = (value: string, masters: MasterLike[] = []): string => {
  const parts = String(value || '').split(COMBINED_SEPARATOR).map((v) => v.trim()).filter(Boolean);
  const names = parts.map((p) => masters.find((m) => m.kode === p)?.nama || p.replace(/_/g, ' '));
  return names.join(' dan ');
};

/**
 * @param categoryLabel teks kategori event, mis. "Tunanetra", "Umum / Non-Disabilitas",
 *                      "Tunanetra dan Tunarungu" atau "Tunanetra, Tunarungu"
 * @param masters       master jenis disabilitas (hanya yang aktif dipakai)
 */
export function getParticipantCategoryOptions(
  categoryLabel: string,
  masters: MasterLike[] = [],
  generalFallback: ParticipantCategoryOption = { value: 'umum', label: 'Umum / Non-Disabilitas' },
): ParticipantCategoryOption[] {
  const label = String(categoryLabel || '').trim();
  const active = masters.filter((m) => m.isAktif !== false);
  const general = active.find((m) => isGeneralLabel(`${m.kode} ${m.nama}`));
  const generalOption = general ? { value: general.kode, label: general.nama } : generalFallback;

  if (!label) return [generalOption];

  const text = label.toLowerCase();
  const matched = active.filter((m) => {
    if (isGeneralLabel(`${m.kode} ${m.nama}`)) return false;
    const names = [m.nama, m.kode.replace(/_/g, ' ')].map((n) => n.trim().toLowerCase()).filter(Boolean);
    return names.some((n) => new RegExp(`(^|[^a-z])${escapeRe(n)}($|[^a-z])`).test(text));
  });

  if (matched.length === 0) {
    // Tidak ada kategori disabilitas yang dikenali -> kategori Umum.
    return isGeneralLabel(label) ? [generalOption] : [{ value: label, label }];
  }
  if (matched.length === 1) return [{ value: matched[0].kode, label: matched[0].nama }];

  return [
    ...matched.map((m) => ({ value: m.kode, label: m.nama })),
    {
      value: matched.map((m) => m.kode).join(COMBINED_SEPARATOR),
      label: matched.map((m) => m.nama).join(' dan '),
    },
  ];
}
