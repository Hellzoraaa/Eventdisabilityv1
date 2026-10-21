/** Template persyaratan peserta event. Mitra memilih dari daftar ini, tidak menulis bebas. */
export const PERSYARATAN_TEMPLATE: string[] = [
  'Mengisi formulir pendaftaran dengan data yang benar dan lengkap',
  'Memiliki nomor WhatsApp aktif untuk bergabung ke grup kegiatan',
  'Membawa kartu identitas diri (KTP/KK/Kartu Pelajar)',
  'Bersedia mengikuti kegiatan dari awal sampai selesai',
  'Bersedia mengikuti pretest dan postest',
  'Membawa pendamping bila diperlukan (sesuai kebutuhan peserta)',
];

export const PERSYARATAN_DEFAULT = PERSYARATAN_TEMPLATE.join('\n');

export const parsePersyaratan = (value?: string | null): string[] =>
  String(value || '').split('\n').map(v => v.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
