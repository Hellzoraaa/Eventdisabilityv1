import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import type {
  User,
  TrainingProposal,
  TPQProgram,
  Participant,
  QuranCommunity,
  SystemStats,
  DisabilityMaster,
  EventCategory,
  ApplicationSettings,
  SystemLog
} from '../frontend/src/types.ts';
import { getDbPool } from './database/mysql.ts';
import { sendWaLinkEmail, sendOtpEmail, isRealEmail } from './mailer.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Autentikasi per-browser menggunakan cookie bertanda tangan (tanpa dependency tambahan).
// Untuk produksi, atur SESSION_SECRET di environment agar secret stabil dan kuat.
const SESSION_COOKIE = 'efd_session';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function signSessionValue(userId: string): string {
  const payload = Buffer.from(userId, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSessionUserId(req: express.Request): string | null {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;

  const value = cookie.slice(SESSION_COOKIE.length + 1);
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  try {
    const userId = Buffer.from(payload, 'base64url').toString('utf8');
    return userId || null;
  } catch {
    return null;
  }
}

function setSessionCookie(res: express.Response, userId: string): void {
  const value = signSessionValue(userId);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
}

function clearSessionCookie(res: express.Response): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}


// ======================== API ROUTES ========================

function jsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function mapDbUser(row: any): User {
  return {
    id: String(row.user_id_string || row.id || ''),
    name: row.name ?? '',
    email: row.email ?? '',
    role: row.role === 'superadmin' ? 'superadmin' : 'mitra',
    phone: row.phone ?? '',
    organizationName: row.organizationName ?? row.organization_name ?? undefined,
    organizationLogo: row.organizationLogo ?? row.organization_logo ?? undefined,
    isVerified: row.is_verified != null ? Boolean(row.is_verified) : true,
    province: row.province ?? undefined,
    city: row.city ?? undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    avatar: row.avatar ?? undefined,
  };
}

function mapDbDisability(row: any): DisabilityMaster {
  return {
    id: String(row.disability_id_string ?? row.id),
    kode: row.kode ?? '',
    nama: row.nama ?? '',
    kategoriUtama: row.kategori_utama ?? '',
    deskripsi: row.deskripsi ?? '',
    metodePembelajaran: row.metode_pembelajaran ?? '',
    fasilitasRekomendasi: jsonParse<string[]>(row.fasilitas_rekomendasi, []),
    warnaHex: row.warna_hex ?? '#005a71',
    icon: row.icon ?? 'accessible',
    isAktif: Boolean(Number(row.is_aktif)),
    izinkanPublikasi: Boolean(Number(row.izinkan_publikasi)),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapDbEventCategory(row: any): EventCategory {
  return {
    id: String(row.category_id_string ?? row.id),
    kode: row.kode ?? '',
    nama: row.nama ?? '',
    deskripsi: row.deskripsi ?? '',
    icon: row.icon ?? 'category',
    warnaHex: row.warna_hex ?? '#0284c7',
    isAktif: Boolean(row.is_aktif),
    urutan: Number(row.urutan ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapDbCommunity(row: any): QuranCommunity {
  return {
    id: String(row.community_id_string ?? row.id),
    namaLembaga: row.nama_lembaga ?? '',
    kategoriDisabilitas: jsonParse<string[]>(row.kategori_disabilitas, []),
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    alamatLengkap: row.alamat_lengkap ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    kontakWa: row.kontak_wa ?? '',
    kontakEmail: row.kontak_email ?? '',
    jumlahSantri: Number(row.jumlah_santri ?? 0),
    fasilitasTersedia: jsonParse<string[]>(row.fasilitas_tersedia, []),
    programUnggulan: row.program_unggulan ?? '',
    deskripsi: row.deskripsi ?? '',
    verified: Boolean(row.is_verified),
    activeEventsCount: Number(row.activeEventsCount ?? 0),
    logo: row.logo || row.user_org_logo || row.organization_logo || undefined,
  };
}


function mapDbTPQ(row: any): TPQProgram {
  return {
    id: String(row.program_id_string ?? row.id),
    mitraId: String(row.mitra_id_string ?? row.mitra_id ?? ''),
    mitraName: row.mitraName ?? row.name ?? '',
    mitraOrg: row.mitraOrg ?? row.organization_name ?? '',
    // Nomor WhatsApp penyelenggara (users.phone); dipakai tombol "Hubungi Penyelenggara" setelah peserta mendaftar.
    mitraPhone: row.mitraPhone ?? '',
    noWaLembaga: row.nomor_wa_lembaga ?? '',
    // Logo lembaga mitra penyelenggara (users.organization_logo), dipakai di kartu & halaman TPQ.
    mitraLogo: row.userOrgLogo ?? row.organization_logo ?? undefined,
    namaProgram: row.nama_program ?? '',
    jenisTPQ: row.jenis_tpq === 'braille' ? 'braille' : 'isyarat',
    deskripsiProgram: row.deskripsi_program ?? '',
    tujuanPembelajaran: row.tujuan_pembelajaran ?? '',
    targetPeserta: row.target_peserta ?? '',
    kuotaPeserta: Number(row.kuota_peserta ?? 0),
    materiPembelajaran: row.materi_pembelajaran ?? '',
    metodePembelajaran: row.metode_pembelajaran ?? '',
    kebutuhanFasilitas: jsonParse<string[]>(row.kebutuhan_fasilitas, []),
    frekuensiPertemuan: row.frekuensi_pertemuan ?? '',
    fotoDokumentasi: jsonParse<string[]>(row.foto_dokumentasi, []),
    hariPertemuan: jsonParse<string[]>(row.hari_pertemuan, []),
    jamMulai: row.jam_mulai ? String(row.jam_mulai).slice(0, 5) : null,
    jamSelesai: row.jam_selesai ? String(row.jam_selesai).slice(0, 5) : null,
    // DATE dari mysql2 bisa berupa objek Date; jangan gunakan String(date).slice()
    // karena hasil seperti 'Thu Oct 15' akan diparse browser sebagai tahun 2001.
    tanggalMulai: dateOnly(row.tanggal_mulai) || null,
    tanggalSelesai: dateOnly(row.tanggal_selesai) || null,
    batasPendaftaran: dateOnly(row.batas_pendaftaran) || null,
    benefitProgram: row.benefit_program ?? '',
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    lokasiDanAlamat: row.lokasi_dan_alamat ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    status: row.status ?? 'menunggu_persetujuan',
    alasanPenolakan: row.alasan_penolakan ?? undefined,
    isAktif: Boolean(Number(row.is_aktif)),
    izinkanPublikasi: Boolean(Number(row.izinkan_publikasi)),
    jumlahPendaftar: Number(row.jumlah_pendaftar ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

// MySQL DATE columns may arrive as JavaScript Date objects. String(date).slice(0, 10)
// produces values such as 'Tue Oct 13', which are not valid YYYY-MM-DD dates.
function dateOnly(value: any): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Pool memakai dateStrings untuk kolom DATE, jadi Date di sini hanya muncul dari sumber lain.
    // Pakai komponen tanggal lokal (bukan UTC) agar tanggal kalender tidak bergeser satu hari di WIB.
    const y = value.getFullYear(), m = String(value.getMonth() + 1).padStart(2, '0'), d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeEventDateAndTime(row: any) {
  const rawDate = dateOnly(row.tanggal_kegiatan ?? '');
  const legacy = rawDate.match(/^(\d{4}-\d{2}-\d{2})\s*\((\d{1,2}:\d{2})(?::\d{2})?\s*-\s*(\d{1,2}:\d{2})(?::\d{2})?\)$/);
  const date = legacy ? legacy[1] : rawDate;
  const start = row.waktu_mulai ?? row.waktuMulai ?? row.jamMulai ?? (legacy ? legacy[2] : null);
  const end = row.waktu_selesai ?? row.waktuSelesai ?? row.jamSelesai ?? (legacy ? legacy[3] : null);
  const toHHmm = (value: any) => value == null || value === '' ? '' : String(value).slice(0, 5);
  return { date, start: toHHmm(start), end: toHHmm(end) };
}

function mapDbEvent(row: any): TrainingProposal {
  const schedule = normalizeEventDateAndTime(row);
  return ({
    id: String(row.proposal_id_string ?? row.id),
    mitraId: row.mitra_id_string ?? undefined,
    mitraName: row.mitraName ?? undefined,
    mitraOrg: row.mitraOrg ?? row.mitra_org ?? '',
    namaKegiatan: row.nama_kegiatan ?? '',
    jenisEvent: row.jenis_event ?? '',
    deskripsiPelatihan: row.deskripsi_pelatihan ?? '',
    benefit: row.benefit ?? '',
    persyaratan: row.persyaratan ?? '',
    durasiProgram: row.durasi_program ?? '',
    batasPendaftaran: dateOnly(row.batas_pendaftaran),
    lokasiDanAlamat: row.lokasi_dan_alamat ?? '',
    provinsi: row.provinsi ?? '',
    kota: row.kota ?? '',
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    tanggalKegiatan: schedule.date,
    tanggalBerakhirKegiatan: dateOnly(row.tanggal_berakhir_kegiatan) || undefined,
    waktuMulai: schedule.start,
    waktuSelesai: schedule.end,
    jamMulai: schedule.start,
    jamSelesai: schedule.end,
    targetDanKuotaPeserta: Number(row.target_dan_kuota_peserta ?? 0),
    kuotaDisetujui: row.kuota_disetujui == null ? undefined : Number(row.kuota_disetujui),
    kebutuhanPeserta: jsonParse<string[]>(row.kebutuhan_peserta, []),
    status: row.status ?? 'menunggu_persetujuan',
    alasanPenolakan: row.alasan_penolakan ?? undefined,
    tanggalPersetujuan: row.tanggal_persetujuan ? new Date(row.tanggal_persetujuan).toISOString() : undefined,
    linkPendaftaran: row.link_pendaftaran ?? undefined,
    isAktif: Boolean(row.is_aktif),
    jumlahPendaftar: Number(row.jumlah_pendaftar ?? 0),
    mitraLogo: row.mitra_logo ?? row.mitraLogo ?? row.userOrgLogo ?? undefined,
    logoUrl: row.logo_url ?? row.logoUrl ?? row.mitra_logo ?? row.mitraLogo ?? row.userOrgLogo ?? undefined,
    isVerified: row.is_verified != null ? Boolean(row.is_verified) : true,
    isMitraResmi: row.is_mitra_resmi != null ? Boolean(row.is_mitra_resmi) : true,
    alurSeleksi: row.alur_seleksi ?? 'Seleksi Berkas & Verifikasi Khusus',
    kategoriDisabilitasUtama: row.kategori_disabilitas_utama ?? (
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('braille') || row.nama_kegiatan.toLowerCase().includes('netra'))) ? 'Tunanetra' :
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('isyarat') || row.nama_kegiatan.toLowerCase().includes('tuli') || row.nama_kegiatan.toLowerCase().includes('rungu'))) ? 'Tunarungu' :
      (row.nama_kegiatan && (row.nama_kegiatan.toLowerCase().includes('umum') || row.nama_kegiatan.toLowerCase().includes('non-disabilitas') || row.nama_kegiatan.toLowerCase().includes('pengajar'))) ? 'Umum / Non-Disabilitas' :
      (row.nama_kegiatan && row.nama_kegiatan.toLowerCase().includes('daksa')) ? 'Umum / Non-Disabilitas' :
      (row.nama_kegiatan && row.nama_kegiatan.toLowerCase().includes('autis')) ? 'Umum / Non-Disabilitas' : 'Umum / Non-Disabilitas'
    ),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    fotoDokumentasi: jsonParse<string[]>(row.foto_dokumentasi, []),
    eventCategoryId: row.event_category_id_string ?? undefined,
    disabilityId: row.disability_id_string ?? undefined,
  } as TrainingProposal);
}

function mapDbParticipant(row: any): Participant {
  return {
    id: String(row.participant_id_string ?? row.id),
    eventId: row.event_id_string ?? '',
    eventTitle: row.eventTitle ?? '',
    namaLengkap: row.nama_lengkap ?? '',
    noWa: row.no_wa ?? '',
    email: row.email ?? '',
    usia: Number(row.usia ?? 0),
    kategoriDisabilitas: row.kategori_disabilitas ?? '',
    kebutuhanFasilitas: jsonParse<string[]>(row.kebutuhan_fasilitas, []),
    catatanKhusus: row.catatan_khusus ?? '',
    statusKehadiran: row.status_kehadiran ?? 'terdaftar',
    jenisKelamin: row.jenis_kelamin ?? '',
    alamat: row.alamat ?? '',
    nilaiPretest: row.nilai_pretest == null ? null : Number(row.nilai_pretest),
    nilaiPostest: row.nilai_postest == null ? null : Number(row.nilai_postest),
    waktuDaftar: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

async function getPool() {
  const pool = await getDbPool();
  if (!pool) throw new Error('Database MySQL tidak tersedia.');
  return pool;
}

/**
 * Memastikan setiap akun Mitra mempunyai 1 record di quran_communities.
 *
 * Homepage membaca daftar Mitra dari quran_communities, bukan langsung dari users.
 * Karena itu users dan quran_communities harus selalu disinkronkan.
 */
async function ensureMitraCommunity(userIdString: string) {
  const pool = await getPool();
  const [userRows] = await pool.query(
    `SELECT id, user_id_string, name, email, phone, role,
            organization_name, organization_logo, province, city, address
       FROM users
      WHERE user_id_string = ?
      LIMIT 1`,
    [userIdString]
  );

  const user = Array.isArray(userRows) ? (userRows as any[])[0] : null;
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  if (String(user.role) !== 'mitra') return null;

  const numericUserId = Number(user.id);
  const namaLembaga = String(user.organization_name || user.name || '').trim();
  const provinsi = String(user.province || '').trim();
  const kota = String(user.city || '').trim();
  const alamat = String(user.address || '').trim() || [kota, provinsi].filter(Boolean).join(', ');
  const kontakWa = String(user.phone || '').trim();
  const kontakEmail = String(user.email || '').trim().toLowerCase();
  const logo = user.organization_logo ? String(user.organization_logo) : null;

  if (!namaLembaga) {
    throw new Error('Nama lembaga mitra belum tersedia.');
  }

  const [existingRows] = await pool.query(
    `SELECT id, community_id_string
       FROM quran_communities
      WHERE user_id = ? OR nama_lembaga = ?
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, id ASC
      LIMIT 1`,
    [numericUserId, namaLembaga, numericUserId]
  );

  const existing = Array.isArray(existingRows) ? (existingRows as any[])[0] : null;

  if (existing) {
    await pool.query(
      `UPDATE quran_communities
          SET user_id = ?,
              nama_lembaga = ?,
              provinsi = ?,
              kota = ?,
              alamat_lengkap = ?,
              kontak_wa = ?,
              kontak_email = ?,
              logo = ?,
              is_verified = TRUE,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        numericUserId,
        namaLembaga,
        provinsi,
        kota,
        alamat,
        kontakWa,
        kontakEmail || null,
        logo,
        existing.id,
      ]
    );

    return String(existing.community_id_string || existing.id);
  }

  const communityId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await pool.query(
    `INSERT INTO quran_communities
      (community_id_string, user_id, nama_lembaga, kategori_disabilitas,
       provinsi, kota, alamat_lengkap, latitude, longitude, kontak_wa,
       kontak_email, jumlah_santri, fasilitas_tersedia, program_unggulan,
       deskripsi, logo, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      communityId,
      numericUserId,
      namaLembaga,
      JSON.stringify([]),
      provinsi,
      kota,
      alamat,
      0,
      0,
      kontakWa,
      kontakEmail || null,
      0,
      JSON.stringify([]),
      '',
      `Mitra resmi ${namaLembaga}`,
      logo,
    ]
  );

  return communityId;
}

/**
 * Backfill untuk akun Mitra lama yang sudah ada di users tetapi belum mempunyai
 * record quran_communities. Aman dijalankan berulang kali karena helper di atas
 * akan memperbarui record yang sudah ada dan hanya membuat yang belum ada.
 */
async function syncAllMitraCommunities() {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string
         FROM users
        WHERE role = 'mitra'
        ORDER BY id ASC`
    );

    let synced = 0;
    for (const row of rows as any[]) {
      try {
        await ensureMitraCommunity(String(row.user_id_string));
        synced++;
      } catch (error) {
        console.warn(
          `[Mitra Sync] Gagal sinkronisasi ${row.user_id_string}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(`[Mitra Sync] ${synced}/${Array.isArray(rows) ? rows.length : 0} akun Mitra tersinkronisasi ke quran_communities.`);
  } catch (error) {
    console.error('[Mitra Sync] Gagal melakukan sinkronisasi Mitra:', error);
  }
}

async function addSystemLog(user: string, userRole: string, action: string, module: string, details: string, status: SystemLog['status'] = 'info') {
  try {
    const pool = await getPool();
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO system_logs
        (log_id_string, user, user_role, action, module, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user || 'Sistem', userRole || 'system', action, module, details, status]
    );
  } catch (error) {
    console.error('[System Log] error:', error);
  }
}

async function getUserById(userId: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT user_id_string AS id, name, email, role, phone,
            organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
            created_at AS createdAt
     FROM users WHERE user_id_string = ? OR id = ? LIMIT 1`,
    [userId, Number(userId) || 0]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return mapDbUser(rows[0]);
}

// ======================== AUTH ========================

app.get('/api/auth/current', async (req, res) => {
  try {
    const sessionUserId = readSessionUserId(req);
    if (!sessionUserId) return res.json({ user: null });
    const user = await getUserById(sessionUserId);
    if (!user) clearSessionCookie(res);
    return res.json({ user: user || null });
  } catch (error) {
    console.error('[Auth Current] error:', error);
    return res.status(500).json({ error: 'Gagal membaca sesi pengguna dari MySQL.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string AS id, name, email, password, role, phone,
              organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
              created_at AS createdAt
       FROM users WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(401).json({ error: 'Email Atau Password Salah.' });

    const dbUser = rows[0] as any;
    if (!dbUser.password || !(await bcrypt.compare(password, dbUser.password))) {
      return res.status(401).json({ error: 'Kata sandi tidak valid. Periksa kembali kata sandi Anda.' });
    }

    setSessionCookie(res, String(dbUser.id));
    const { password: _password, ...safeUser } = dbUser;
    await addSystemLog(dbUser.name, dbUser.role, 'Login', 'auth', `Pengguna ${dbUser.email} berhasil login.`, 'success');
    return res.json({ success: true, user: safeUser, message: `Selamat datang kembali, ${dbUser.name}` });
  } catch (error) {
    console.error('[Auth Login] error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat proses login.' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body ?? {};
    if (!userId) return res.status(400).json({ error: 'User ID wajib disertakan.' });
    if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'Kata sandi baru minimal harus terdiri dari 6 karakter.' });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Konfirmasi kata sandi baru tidak sesuai.' });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT user_id_string AS id, name, role, password FROM users WHERE user_id_string = ? LIMIT 1`,
      [String(userId)]
    );
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    const target = rows[0] as any;
    if (!currentPassword || !(await bcrypt.compare(currentPassword, target.password))) {
      return res.status(400).json({ error: 'Kata sandi saat ini tidak cocok.' });
    }

    const newHash = await bcrypt.hash(String(newPassword), 12);
    await pool.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id_string = ?', [newHash, String(userId)]);
    await addSystemLog(target.name, target.role, 'Perubahan Password', 'auth', `Password pengguna ${target.name} diperbarui.`, 'success');
    return res.json({ success: true, message: `Kata sandi untuk ${target.name} berhasil diperbarui.` });
  } catch (error) {
    console.error('[Auth Change Password] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
  }
});

// ======================== LUPA PASSWORD (OTP LEWAT EMAIL) ========================
// Alur: forgot-password (kirim OTP) -> verify-otp (kode benar -> dapat resetToken)
//       -> reset-password (resetToken + kata sandi baru).
// Keamanan: OTP & token disimpan sebagai HMAC (bukan teks asli), kedaluwarsa, dibatasi
// percobaan, sekali pakai, dan respons tidak membocorkan apakah email terdaftar.
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_PER_HOUR = 5;
const RESET_TOKEN_TTL_MINUTES = 10;
const MIN_PASSWORD_LENGTH = 6;
const OTP_PEPPER = process.env.OTP_PEPPER || process.env.GMAIL_APP_PASSWORD || 'ganti-OTP_PEPPER-di-env';
if (!process.env.OTP_PEPPER) {
  console.warn('[Auth] OTP_PEPPER belum diisi di .env. Isi dengan teks acak panjang sebelum online.');
}

const hmac = (value: string) => crypto.createHmac('sha256', OTP_PEPPER).update(value).digest('hex');
const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const FORGOT_SENT_MESSAGE = 'Kode OTP telah dikirim ke email Anda. Periksa kotak masuk atau folder Spam.';
const EMAIL_NOT_REGISTERED_MESSAGE = 'Email tidak terdaftar. Pastikan email sama dengan yang dipakai pada akun Mitra atau Super Admin.';
const OTP_FAIL_MESSAGE = 'Kode OTP salah atau sudah kedaluwarsa. Silakan minta kode baru bila perlu.';

// Pembatas sederhana per IP (di memori; cukup untuk satu server).
const forgotIpHits = new Map<string, { count: number; resetAt: number }>();
function isIpLimited(ip: string, max = 30, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = forgotIpHits.get(ip);
  if (!entry || entry.resetAt < now) {
    forgotIpHits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

async function ensurePasswordResetTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      otp_hash CHAR(64) NOT NULL,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME NULL,
      reset_token_hash CHAR(64) NULL,
      token_expires_at DATETIME NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pr_user (user_id, created_at),
      KEY idx_pr_token (reset_token_hash),
      CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function findUserByEmail(email: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    'SELECT id, user_id_string, name, email, role FROM users WHERE LOWER(email) = ? LIMIT 1',
    [email]
  );
  return Array.isArray(rows) && rows.length ? (rows[0] as any) : null;
}

// 1) Minta OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Masukkan alamat email yang valid.' });
    // Karena sistem memberi tahu email terdaftar/tidak, batasi percobaan per IP agar daftar email tidak bisa ditebak massal.
    if (isIpLimited(`forgot:${req.ip || 'unknown'}`, 10)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' });
    }

    const user = await findUserByEmail(email);
    if (!user || !isRealEmail(user.email)) return res.status(404).json({ error: EMAIL_NOT_REGISTERED_MESSAGE });

    const pool = await getPool();
    const [recent] = await pool.query(
      `SELECT
         SUM(created_at > (NOW() - INTERVAL ? SECOND)) AS in_cooldown,
         SUM(created_at > (NOW() - INTERVAL 1 HOUR)) AS in_hour
       FROM password_resets WHERE user_id = ?`,
      [OTP_COOLDOWN_SECONDS, user.id]
    );
    const stat = (recent as any[])[0] || {};
    if (Number(stat.in_cooldown || 0) > 0) {
      return res.status(429).json({ error: `Kode OTP baru saja dikirim. Tunggu ${OTP_COOLDOWN_SECONDS} detik sebelum meminta lagi.` });
    }
    if (Number(stat.in_hour || 0) >= OTP_MAX_PER_HOUR) {
      return res.status(429).json({ error: 'Permintaan OTP sudah mencapai batas per jam. Coba lagi nanti.' });
    }

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [user.id]);
    const [inserted] = await pool.query(
      `INSERT INTO password_resets (user_id, otp_hash, expires_at)
       VALUES (?, ?, NOW() + INTERVAL ? MINUTE)`,
      [user.id, hmac(`otp:${user.id}:${otp}`), OTP_TTL_MINUTES]
    );
    const resetId = (inserted as any).insertId;

    // Kirim email dan tunggu hasilnya (maksimal 20 detik) agar pengguna tahu bila pengiriman gagal.
    try {
      await Promise.race([
        sendOtpEmail({ to: user.email, nama: user.name, otp, minutes: OTP_TTL_MINUTES }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Pengiriman email melebihi batas waktu.')), 20000)),
      ]);
    } catch (mailError: any) {
      console.error('[Forgot Password] Gagal mengirim OTP:', mailError?.message || mailError);
      await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [resetId]);
      await addSystemLog(user.name, user.role, 'Gagal kirim OTP', 'auth', `OTP reset password untuk ${user.email} gagal dikirim.`, 'error');
      return res.status(502).json({ error: 'Email OTP gagal dikirim. Coba lagi beberapa saat lagi atau hubungi administrator.' });
    }
    await addSystemLog(user.name, user.role, 'Minta OTP reset password', 'auth', `OTP reset password dikirim ke ${user.email}.`, 'info');

    return res.json({ success: true, message: FORGOT_SENT_MESSAGE });
  } catch (error) {
    console.error('[Forgot Password] error:', error);
    return res.status(500).json({ error: 'Gagal memproses permintaan. Silakan coba lagi.' });
  }
});

// 2) Verifikasi OTP -> resetToken
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
    if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Kode OTP harus 6 digit angka.' });
    }
    if (isIpLimited(`verify:${req.ip || 'unknown'}`, 60)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: OTP_FAIL_MESSAGE });

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, otp_hash, attempts FROM password_resets
       WHERE user_id = ? AND used_at IS NULL AND verified_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    const record = Array.isArray(rows) && rows.length ? (rows[0] as any) : null;
    if (!record || Number(record.attempts) >= OTP_MAX_ATTEMPTS) {
      if (record) await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [record.id]);
      return res.status(400).json({ error: OTP_FAIL_MESSAGE });
    }

    if (!safeEqualHex(String(record.otp_hash), hmac(`otp:${user.id}:${otp}`))) {
      const attempts = Number(record.attempts) + 1;
      await pool.query(
        'UPDATE password_resets SET attempts = ?, used_at = IF(? >= ?, NOW(), used_at) WHERE id = ?',
        [attempts, attempts, OTP_MAX_ATTEMPTS, record.id]
      );
      await addSystemLog(user.name, user.role, 'OTP salah', 'auth', `OTP reset password salah untuk ${user.email}.`, 'warning');
      return res.status(400).json({ error: OTP_FAIL_MESSAGE });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `UPDATE password_resets
       SET verified_at = NOW(), reset_token_hash = ?, token_expires_at = NOW() + INTERVAL ? MINUTE
       WHERE id = ?`,
      [hmac(`token:${user.id}:${resetToken}`), RESET_TOKEN_TTL_MINUTES, record.id]
    );
    return res.json({ success: true, resetToken });
  } catch (error) {
    console.error('[Verify OTP] error:', error);
    return res.status(500).json({ error: 'Gagal memverifikasi kode OTP.' });
  }
});

// 3) Atur kata sandi baru
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
    if (!EMAIL_PATTERN.test(email) || !/^[0-9a-f]{64}$/.test(resetToken)) {
      return res.status(400).json({ error: 'Sesi reset tidak valid. Ulangi dari awal.' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Kata sandi baru minimal ${MIN_PASSWORD_LENGTH} karakter.` });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Konfirmasi kata sandi tidak sama.' });

    const user = await findUserByEmail(email);
    const expired = { error: 'Sesi reset sudah kedaluwarsa. Silakan minta kode OTP baru.' };
    if (!user) return res.status(400).json(expired);

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, reset_token_hash FROM password_resets
       WHERE user_id = ? AND used_at IS NULL AND verified_at IS NOT NULL
         AND token_expires_at > NOW() AND reset_token_hash IS NOT NULL
       ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    const record = Array.isArray(rows) && rows.length ? (rows[0] as any) : null;
    if (!record || !safeEqualHex(String(record.reset_token_hash), hmac(`token:${user.id}:${resetToken}`))) {
      return res.status(400).json(expired);
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, user.id]);
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [user.id]);
    await addSystemLog(user.name, user.role, 'Reset password (OTP)', 'auth', `Kata sandi ${user.email} berhasil diatur ulang lewat OTP email.`, 'success');
    return res.json({ success: true, message: 'Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru.' });
  } catch (error) {
    console.error('[Reset Password] error:', error);
    return res.status(500).json({ error: 'Gagal mengatur ulang kata sandi.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
});

app.post('/api/auth/switch', (_req, res) => {
  // Endpoint lama memungkinkan pergantian akun hanya dengan mengirim userId.
  // Nonaktifkan agar pengguna tidak dapat menyamar sebagai akun lain.
  return res.status(403).json({ error: 'Pergantian akun melalui endpoint ini dinonaktifkan. Silakan login kembali.' });
});

// ======================== USERS ========================

app.get('/api/users', async (req, res) => {
  try {
    const pool = await getPool();
    const role = typeof req.query.role === 'string' ? req.query.role : '';
    const params: string[] = [];
    let sql = `SELECT user_id_string AS id, name, email, role, phone,
                      organization_name AS organizationName, organization_logo AS organizationLogo, province, city, address, avatar,
                      created_at AS createdAt
               FROM users`;
    if (role === 'superadmin' || role === 'mitra') {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ users: Array.isArray(rows) ? rows.map(mapDbUser) : [] });
  } catch (error) {
    console.error('[Users GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil data pengguna dari MySQL.' });
  }
});

async function createUserAccount(req: express.Request, res: express.Response, role: User['role']) {
  try {
    const {
      name,
      email,
      phone,
      organizationName,
      organizationLogo,
      province,
      city,
      address,
    } = req.body ?? {};

    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan Email wajib diisi.' });
    }

    if (role === 'mitra' && !organizationName) {
      return res.status(400).json({ error: 'Nama lembaga mitra wajib diisi.' });
    }

    const pool = await getPool();
    const cleanEmail = String(email).trim().toLowerCase();

    const [existing] = await pool.query(
      'SELECT user_id_string FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    if (Array.isArray(existing) && existing.length) {
      return res.status(409).json({ error: 'Email sudah terdaftar dalam sistem.' });
    }

    const id = `usr_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const hash = await bcrypt.hash('password123', 12);

    await pool.query(
      `INSERT INTO users
        (user_id_string, name, email, password, role, phone,
         organization_name, organization_logo, province, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(name).trim(),
        cleanEmail,
        hash,
        role,
        phone ? String(phone).trim() : null,
        organizationName ? String(organizationName).trim() : null,
        organizationLogo ? String(organizationLogo) : null,
        province ? String(province).trim() : null,
        city ? String(city).trim() : null,
        address ? String(address).trim() : null,
      ]
    );

    // Sangat penting: akun Mitra harus mempunyai record quran_communities
    // agar langsung muncul pada Homepage Mitra.
    if (role === 'mitra') {
      await ensureMitraCommunity(id);
    }

    const user = await getUserById(id);

    await addSystemLog(
      'Super Administrator',
      'superadmin',
      'Tambah Pengguna',
      'system',
      `Akun ${user?.name ?? name} dibuat${role === 'mitra' ? ' dan profil Mitra Homepage disinkronkan' : ''}.`,
      'success'
    );

    return res.status(201).json({
      success: true,
      user,
      initialPassword: 'password123',
      message:
        role === 'mitra'
          ? 'Akun Mitra berhasil dibuat, profil Homepage berhasil dibuat, dan password awal adalah password123.'
          : 'Akun berhasil dibuat. Password awal: password123.',
    });
  } catch (error) {
    console.error('[Users POST] error:', error);
    return res.status(500).json({
      error: 'Gagal membuat akun pengguna di MySQL.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

app.post('/api/users/superadmin', (req, res) => createUserAccount(req, res, 'superadmin'));
app.post('/api/users/mitra', (req, res) => createUserAccount(req, res, 'mitra'));

app.put('/api/users/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: 'User tidak ditemukan di MySQL.' });

    const body = req.body ?? {};
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : current.email;
    const role = body.role === 'superadmin' || body.role === 'mitra' ? body.role : current.role;

    if (email && email.toLowerCase() !== (current.email || '').toLowerCase()) {
      const [dupe] = await pool.query(
        'SELECT user_id_string FROM users WHERE LOWER(email) = ? AND user_id_string <> ? LIMIT 1',
        [email, id]
      );
      if (Array.isArray(dupe) && dupe.length) return res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
    }

    const newOrgLogo = body.organizationLogo !== undefined ? body.organizationLogo : current.organizationLogo || null;

    await pool.query(
      `UPDATE users SET name=?, email=?, phone=?, organization_name=?, organization_logo=?, province=?, city=?, role=?, avatar=?, updated_at=CURRENT_TIMESTAMP
       WHERE user_id_string=?`,
      [
        body.name !== undefined ? String(body.name).trim() : current.name,
        email,
        body.phone !== undefined ? String(body.phone).trim() : current.phone || null,
        body.organizationName !== undefined ? String(body.organizationName).trim() : current.organizationName || null,
        newOrgLogo,
        body.province !== undefined ? String(body.province).trim() : current.province || null,
        body.city !== undefined ? String(body.city).trim() : current.city || null,
        role,
        body.avatar !== undefined ? body.avatar : current.avatar || null,
        id
      ]
    );

    // Sinkronkan profil Mitra ke quran_communities setelah perubahan user.
    // Ini mencakup nama lembaga, lokasi, kontak, dan logo.
    if (role === 'mitra') {
      try {
        await ensureMitraCommunity(id);
      } catch (err) {
        console.warn('[Mitra Sync] Sinkronisasi setelah update user gagal:', err);
      }
    }

    const updated = await getUserById(id);
    await addSystemLog(updated?.name || current.name, updated?.role || current.role, 'Pembaruan Data Pengguna', 'system', `Data pengguna diperbarui di MySQL.`, 'success');
    return res.json({ success: true, user: updated });
  } catch (error) {
    console.error('[Users PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui pengguna di MySQL.' });
  }
});

// Dedicated endpoint for updating organization logo quickly
const handleUserLogoUpdate = async (req: express.Request, res: express.Response) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const current = await getUserById(id);
    if (!current) return res.status(404).json({ error: 'Pengguna tidak ditemukan di MySQL.' });

    const rawLogo = req.body?.organizationLogo;
    const newLogo = rawLogo !== undefined && rawLogo !== null ? String(rawLogo) : '';

    await pool.query(
      'UPDATE users SET organization_logo = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id_string = ?',
      [newLogo || null, id]
    );


    // Pastikan logo juga tercermin pada profil Mitra di Homepage.
    if (current.role === 'mitra') {
      try {
        await ensureMitraCommunity(id);
      } catch (err) {
        console.warn('[Mitra Sync] Sinkronisasi logo ke community gagal:', err);
      }
    }

    const updated = await getUserById(id);
    await addSystemLog(
      'Super Administrator',
      'superadmin',
      'Pembaruan Logo Mitra',
      'users',
      `Logo untuk mitra "${current.organizationName || current.name}" berhasil ${newLogo ? 'diunggah' : 'dihapus'}.`,
      'success'
    );

    return res.json({ success: true, user: updated, logo: newLogo });
  } catch (error) {
    console.error('[Users Logo PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui logo mitra di MySQL.' });
  }
};

app.put('/api/users/:id/logo', handleUserLogoUpdate);
app.patch('/api/users/:id/logo', handleUserLogoUpdate);

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const target = await getUserById(id);
    if (!target) return res.status(404).json({ error: 'User tidak ditemukan di MySQL.' });

    if (target.role === 'superadmin') {
      const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE role='superadmin'`);
      const count = Number((countRows as any[])[0]?.total ?? 0);
      if (count <= 1) return res.status(400).json({ error: 'Superadmin terakhir tidak boleh dihapus.' });
    }

    // Hapus profil Homepage Mitra yang dimiliki akun ini agar tidak menjadi orphan.
    if (target.role === 'mitra') {
      try {
        const [numericRows] = await pool.query(
          'SELECT id FROM users WHERE user_id_string = ? LIMIT 1',
          [id]
        );
        const numericId = Array.isArray(numericRows) ? Number((numericRows as any[])[0]?.id || 0) : 0;
        if (numericId) {
          await pool.query('DELETE FROM quran_communities WHERE user_id = ?', [numericId]);
        }
      } catch (err) {
        console.warn('[Mitra Delete] Gagal menghapus profil community:', err);
      }
    }

    await pool.query('DELETE FROM users WHERE user_id_string = ?', [id]);
    await addSystemLog('Super Administrator', 'superadmin', 'Penghapusan Pengguna', 'system', `Pengguna ${target.name} dihapus dari MySQL.`, 'warning');
    return res.json({ success: true, message: `Pengguna ${target.name} berhasil dihapus.` });
  } catch (error) {
    console.error('[Users DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus pengguna dari MySQL.' });
  }
});

// ======================== APPLICATION SETTINGS ========================

const DEFAULT_APP_SETTINGS: ApplicationSettings = {
  applicationName: 'Alquran Disabilitas',
  logo: '/logo-quran.svg',
  favicon: '/favicon.svg',
  topbarColor: '#005a71',
  primaryColor: '#005a71',
  secondaryColor: '#ab3425',
  accentColor: '#d97706',
  publicRoleLabel: 'Peserta',
  institutionSubtitle: 'Kementerian Agama Republik Indonesia',
  logoSize: 'large',
  headerBgImage: '',
  headerBgOverlay: 'dark',
  logoContainerBg: 'white',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Super Administrator',
};

function mapDbAppSettings(row: any): ApplicationSettings {
  return {
    applicationName: row.application_name ?? DEFAULT_APP_SETTINGS.applicationName,
    logo: row.logo ?? DEFAULT_APP_SETTINGS.logo,
    favicon: row.favicon ?? DEFAULT_APP_SETTINGS.favicon,
    topbarColor: row.topbar_color ?? DEFAULT_APP_SETTINGS.topbarColor,
    primaryColor: row.primary_color ?? DEFAULT_APP_SETTINGS.primaryColor,
    secondaryColor: row.secondary_color ?? DEFAULT_APP_SETTINGS.secondaryColor,
    accentColor: row.accent_color ?? DEFAULT_APP_SETTINGS.accentColor,
    publicRoleLabel: row.public_role_label ?? DEFAULT_APP_SETTINGS.publicRoleLabel,
    institutionSubtitle: row.institution_subtitle ?? DEFAULT_APP_SETTINGS.institutionSubtitle,
    logoSize: row.logo_size ?? DEFAULT_APP_SETTINGS.logoSize,
    headerBgImage: row.header_bg_image ?? DEFAULT_APP_SETTINGS.headerBgImage,
    headerBgOverlay: row.header_bg_overlay ?? DEFAULT_APP_SETTINGS.headerBgOverlay,
    logoContainerBg: row.logo_container_bg ?? DEFAULT_APP_SETTINGS.logoContainerBg,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : DEFAULT_APP_SETTINGS.updatedAt,
    updatedBy: row.updated_by ?? DEFAULT_APP_SETTINGS.updatedBy,
  };
}

app.get('/api/app-settings', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT application_name, logo, favicon, topbar_color, primary_color, secondary_color,
              accent_color, public_role_label, institution_subtitle, logo_size,
              header_bg_image, header_bg_overlay, logo_container_bg, updated_by, updated_at
       FROM application_settings WHERE setting_key='global_config' LIMIT 1`
    );
    const settings = Array.isArray(rows) && rows.length ? mapDbAppSettings(rows[0]) : DEFAULT_APP_SETTINGS;
    return res.json({ settings });
  } catch (error) {
    console.error('[App Settings GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil Application Settings dari MySQL.' });
  }
});

app.post('/api/app-settings', async (req, res) => {
  try {
    const body = req.body ?? {};
    const applicationName = String(body.applicationName ?? '').trim();
    if (!applicationName) return res.status(400).json({ error: 'Nama aplikasi wajib diisi.' });

    const pool = await getPool();
    const values = [
      applicationName,
      body.logo ?? DEFAULT_APP_SETTINGS.logo,
      body.favicon ?? DEFAULT_APP_SETTINGS.favicon,
      body.topbarColor ?? DEFAULT_APP_SETTINGS.topbarColor,
      body.primaryColor ?? DEFAULT_APP_SETTINGS.primaryColor,
      body.secondaryColor ?? DEFAULT_APP_SETTINGS.secondaryColor,
      body.accentColor ?? DEFAULT_APP_SETTINGS.accentColor,
      body.publicRoleLabel ?? DEFAULT_APP_SETTINGS.publicRoleLabel,
      body.institutionSubtitle ?? DEFAULT_APP_SETTINGS.institutionSubtitle,
      body.logoSize ?? DEFAULT_APP_SETTINGS.logoSize,
      body.headerBgImage ?? '',
      body.headerBgOverlay ?? DEFAULT_APP_SETTINGS.headerBgOverlay,
      body.logoContainerBg ?? DEFAULT_APP_SETTINGS.logoContainerBg,
      body.updatedBy ?? 'Super Administrator',
    ];

    await pool.query(
      `INSERT INTO application_settings
        (setting_key, application_name, logo, favicon, topbar_color, primary_color, secondary_color,
         accent_color, public_role_label, institution_subtitle, logo_size, header_bg_image,
         header_bg_overlay, logo_container_bg, updated_by)
       VALUES ('global_config', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        application_name=VALUES(application_name), logo=VALUES(logo), favicon=VALUES(favicon),
        topbar_color=VALUES(topbar_color), primary_color=VALUES(primary_color),
        secondary_color=VALUES(secondary_color), accent_color=VALUES(accent_color),
        public_role_label=VALUES(public_role_label), institution_subtitle=VALUES(institution_subtitle),
        logo_size=VALUES(logo_size), header_bg_image=VALUES(header_bg_image),
        header_bg_overlay=VALUES(header_bg_overlay), logo_container_bg=VALUES(logo_container_bg),
        updated_by=VALUES(updated_by), updated_at=CURRENT_TIMESTAMP`,
      values
    );

    const [rows] = await pool.query(
      `SELECT application_name, logo, favicon, topbar_color, primary_color, secondary_color,
              accent_color, public_role_label, institution_subtitle, logo_size,
              header_bg_image, header_bg_overlay, logo_container_bg, updated_by, updated_at
       FROM application_settings WHERE setting_key='global_config' LIMIT 1`
    );
    const settings = Array.isArray(rows) && rows.length ? mapDbAppSettings(rows[0]) : DEFAULT_APP_SETTINGS;
    await addSystemLog(String(body.updatedBy || 'Super Administrator'), 'superadmin', 'Pembaruan Application Setting', 'settings', `Pengaturan aplikasi disimpan ke MySQL: ${applicationName}.`, 'success');
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('[App Settings POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan Application Settings ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== LOGS ========================

app.get('/api/logs', async (req, res) => {
  try {
    const pool = await getPool();
    const module = typeof req.query.module === 'string' ? req.query.module : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const params: any[] = [];
    let sql = `SELECT log_id_string AS id, timestamp, user, user_role AS userRole, action, module, details, status FROM system_logs`;
    const where: string[] = [];
    if (module && module !== 'all') { where.push('module = ?'); params.push(module); }
    if (status && status !== 'all') { where.push('status = ?'); params.push(status); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    const [rows] = await pool.query(sql, params);
    return res.json({ logs: rows, total: Array.isArray(rows) ? rows.length : 0 });
  } catch (error) {
    console.error('[Logs GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil log dari MySQL.' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { user, userRole, action, module, details, status } = req.body ?? {};
    if (!action || !details) return res.status(400).json({ error: 'Action and details are required' });
    const pool = await getPool();
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO system_logs (log_id_string, user, user_role, action, module, details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user || 'Pengguna', userRole || 'guest', action, module || 'system', details, status || 'info']
    );
    return res.status(201).json({ success: true, log: { id, timestamp: new Date().toISOString(), user, userRole, action, module, details, status } });
  } catch (error) {
    console.error('[Logs POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan log ke MySQL.' });
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM system_logs');
    return res.json({ success: true, message: 'Semua logs aktivitas berhasil dihapus.' });
  } catch (error) {
    console.error('[Logs DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus logs dari MySQL.' });
  }
});

app.delete('/api/logs/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM system_logs WHERE log_id_string = ?', [String(req.params.id)]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Log tidak ditemukan.' });
    return res.json({ success: true, message: 'Log berhasil dihapus.' });
  } catch (error) {
    console.error('[Logs DELETE ID] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus log dari MySQL.' });
  }
});

// ======================== EVENTS ========================

// Kolom durasi_program pada training_proposals ditambahkan otomatis sekali per proses bila database lama belum punya.
let eventDurasiColumnReady = false;
async function ensureEventDurasiColumn(pool: any) {
  if (eventDurasiColumnReady) return;
  const [cols] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_proposals' AND COLUMN_NAME = 'durasi_program'"
  );
  if (!Number((cols as any[])[0]?.n)) {
    await pool.query("ALTER TABLE training_proposals ADD COLUMN durasi_program varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER waktu_selesai");
  }
  const [endDateCols] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'training_proposals' AND COLUMN_NAME = 'tanggal_berakhir_kegiatan'"
  );
  if (!Number((endDateCols as any[])[0]?.n)) {
    await pool.query("ALTER TABLE training_proposals ADD COLUMN tanggal_berakhir_kegiatan DATE DEFAULT NULL AFTER tanggal_kegiatan");
  }
  eventDurasiColumnReady = true;
}

async function getEventById(id: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo
     FROM training_proposals tp
     LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string
     WHERE tp.proposal_id_string = ? LIMIT 1`,
    [id]
  );
  return Array.isArray(rows) && rows.length ? mapDbEvent(rows[0]) : null;
}

app.get('/api/events', async (req, res) => {
  try {
    const pool = await getPool();
    const { status, mitraId, activeOnly } = req.query;
    const params: any[] = [];
    const where: string[] = [];

    if (typeof status === 'string' && status !== 'all') { where.push('tp.status = ?'); params.push(status); }
    if (typeof mitraId === 'string' && mitraId) { where.push('tp.mitra_id_string = ?'); params.push(mitraId); }
    if (activeOnly === 'true') { where.push('tp.is_aktif = 1'); }

    let sql = `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo
               FROM training_proposals tp
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    // Urutkan di Node, bukan di MySQL, agar tidak kena ER_OUT_OF_SORTMEMORY akibat kolom base64 besar.
    const [rawRows] = await pool.query(sql, params);
    const rows = Array.isArray(rawRows) ? [...rawRows].sort((a: any, b: any) => Number(b.id) - Number(a.id)) : rawRows;
    return res.json({ events: Array.isArray(rows) ? rows.map(mapDbEvent) : [] });
  } catch (error) {
    console.error('[Events GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil event dari MySQL.' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await getEventById(String(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ event, proposal: event });
  } catch (error) {
    console.error('[Event GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil event dari MySQL.' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const body = req.body ?? {};
    const required = ['namaKegiatan', 'jenisEvent', 'deskripsiPelatihan', 'lokasiDanAlamat', 'provinsi', 'kota', 'tanggalKegiatan', 'waktuMulai', 'waktuSelesai'];
    await ensureEventDurasiColumn(await getPool());
    for (const key of required) {
      if (!body[key]) return res.status(400).json({ error: `${key} wajib diisi.` });
    }

    if (String(body.waktuSelesai) <= String(body.waktuMulai)) return res.status(400).json({ error: 'Jam selesai harus setelah jam mulai.' });
    const pool = await getPool();
    const proposalId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let mitraNumericId: number | null = null;
    let mitraIdString: string | null = body.mitraId ? String(body.mitraId) : null;
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (Array.isArray(uRows) && uRows.length) mitraNumericId = Number((uRows as any[])[0].id);
      else return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
    }

    const waLinkEvent = String(body.linkGrupWa ?? '').trim() || null;
    const durasiProgramEvent = String(body.durasiProgram ?? '').trim().slice(0, 100) || null;
    if (waLinkEvent && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLinkEvent)) return res.status(400).json({ error: 'Link WhatsApp harus berupa https://chat.whatsapp.com/...' });

    await ensureEventDurasiColumn(pool);
    await pool.query(
      `INSERT INTO training_proposals
       (proposal_id_string, mitra_id, mitra_id_string, nama_kegiatan, jenis_event,
        event_category_id_string, disability_id_string, deskripsi_pelatihan, benefit, persyaratan, batas_pendaftaran,
        lokasi_dan_alamat, provinsi, kota, latitude, longitude, tanggal_kegiatan, tanggal_berakhir_kegiatan, waktu_mulai, waktu_selesai,
        target_dan_kuota_peserta, kuota_disetujui, kebutuhan_peserta, foto_dokumentasi, status,
        alasan_penolakan, tanggal_persetujuan, link_pendaftaran, is_aktif, jumlah_pendaftar, link_grup_wa, durasi_program)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu_persetujuan', NULL, NULL, NULL, FALSE, 0, ?, ?)`,
      [
        proposalId,
        mitraNumericId,
        mitraIdString,
        body.namaKegiatan,
        body.jenisEvent,
        body.eventCategoryId ? String(body.eventCategoryId) : null,
        body.disabilityId ? String(body.disabilityId) : null,
        body.deskripsiPelatihan,
        body.benefit ?? null,
        body.persyaratan ?? null,
        body.batasPendaftaran || null,
        body.lokasiDanAlamat,
        body.provinsi,
        body.kota,
        body.latitude == null ? null : Number(body.latitude),
        body.longitude == null ? null : Number(body.longitude),
        String(body.tanggalKegiatan).split(' (')[0],
        body.tanggalBerakhirKegiatan || null,
        body.waktuMulai || body.jamMulai || null,
        body.waktuSelesai || body.jamSelesai || null,
        Number(body.targetDanKuotaPeserta || 0),
        Number(body.targetDanKuotaPeserta || 0),
        JSON.stringify(Array.isArray(body.kebutuhanPeserta) ? body.kebutuhanPeserta : []),
        JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []),
        waLinkEvent,
        durasiProgramEvent,
      ]
    );

    const event = await getEventById(proposalId);
    await addSystemLog('Pengguna', 'system', 'Tambah Event', 'events', `Event ${body.namaKegiatan} dibuat di MySQL.`, 'success');
    return res.status(201).json({ success: true, proposal: event, event });
  } catch (error) {
    console.error('[Events POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan event ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const current = await getEventById(id);
    if (!current) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    const body = req.body ?? {};
    const pool = await getPool();
    await ensureEventDurasiColumn(pool);

    let mitraNumericId: number | null = null;
    let mitraIdString = body.mitraId !== undefined ? (body.mitraId ? String(body.mitraId) : null) : (current.mitraId ?? null);
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
      mitraNumericId = Number((uRows as any[])[0].id);
    }

    const nextStart = body.waktuMulai ?? body.jamMulai ?? current.waktuMulai;
    const nextEnd = body.waktuSelesai ?? body.jamSelesai ?? current.waktuSelesai;
    if (nextStart && nextEnd && String(nextEnd).slice(0, 5) <= String(nextStart).slice(0, 5)) return res.status(400).json({ error: 'Jam selesai harus setelah jam mulai.' });
    const durasiProgramPut = body.durasiProgram !== undefined
      ? (String(body.durasiProgram ?? '').trim().slice(0, 100) || null)
      : (String((current as any).durasiProgram ?? '').trim() || null);
    const waLinkPut = body.linkGrupWa !== undefined ? (String(body.linkGrupWa).trim() || null) : null;
    if (waLinkPut && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLinkPut)) return res.status(400).json({ error: 'Link WhatsApp harus berupa https://chat.whatsapp.com/...' });
    const newStatus = ['menunggu_persetujuan', 'disetujui', 'ditolak'].includes(body.status) ? body.status : current.status;
    const foto = body.fotoDokumentasi !== undefined ? (Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : [body.fotoDokumentasi]) : current.fotoDokumentasi;

    await ensureEventDurasiColumn(pool);
    await pool.query(
      `UPDATE training_proposals SET
        mitra_id=?, mitra_id_string=?, nama_kegiatan=?, jenis_event=?,
        event_category_id_string=?, disability_id_string=?, deskripsi_pelatihan=?, benefit=?, persyaratan=?, batas_pendaftaran=?,
        lokasi_dan_alamat=?, provinsi=?, kota=?, latitude=?, longitude=?, tanggal_kegiatan=?, tanggal_berakhir_kegiatan=?, waktu_mulai=?, waktu_selesai=?,
        target_dan_kuota_peserta=?, kuota_disetujui=?, kebutuhan_peserta=?, foto_dokumentasi=?, status=?,
        alasan_penolakan=?, link_pendaftaran=?, is_aktif=?, link_grup_wa=COALESCE(?, link_grup_wa), durasi_program=?, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [
        mitraNumericId,
        mitraIdString,
        body.namaKegiatan ?? current.namaKegiatan,
        body.jenisEvent ?? current.jenisEvent,
        body.eventCategoryId !== undefined
          ? (body.eventCategoryId ? String(body.eventCategoryId) : null)
          : (current as any).eventCategoryId ?? null,
        body.disabilityId !== undefined
          ? (body.disabilityId ? String(body.disabilityId) : null)
          : (current as any).disabilityId ?? null,
        body.deskripsiPelatihan ?? current.deskripsiPelatihan,
        body.benefit !== undefined ? (body.benefit || null) : ((current as any).benefit || null),
        body.persyaratan !== undefined ? (body.persyaratan || null) : ((current as any).persyaratan || null),
        body.batasPendaftaran !== undefined ? (body.batasPendaftaran || null) : ((current as any).batasPendaftaran || null),
        body.lokasiDanAlamat ?? current.lokasiDanAlamat,
        body.provinsi ?? current.provinsi,
        body.kota ?? current.kota,
        body.latitude !== undefined ? Number(body.latitude) : current.latitude ?? null,
        body.longitude !== undefined ? Number(body.longitude) : current.longitude ?? null,
        String(body.tanggalKegiatan ?? current.tanggalKegiatan).split(' (')[0],
        body.tanggalBerakhirKegiatan !== undefined ? (body.tanggalBerakhirKegiatan || null) : ((current as any).tanggalBerakhirKegiatan || null),
        body.waktuMulai ?? body.jamMulai ?? current.waktuMulai ?? null,
        body.waktuSelesai ?? body.jamSelesai ?? current.waktuSelesai ?? null,
        body.targetDanKuotaPeserta !== undefined ? Number(body.targetDanKuotaPeserta) : current.targetDanKuotaPeserta,
        // Kuota tunggal: diatur di form event (targetDanKuotaPeserta), kuota_disetujui selalu mengikuti.
        body.targetDanKuotaPeserta !== undefined ? Number(body.targetDanKuotaPeserta) : (current.kuotaDisetujui ?? null),
        JSON.stringify(body.kebutuhanPeserta !== undefined ? body.kebutuhanPeserta : current.kebutuhanPeserta),
        JSON.stringify(foto),
        newStatus,
        newStatus === 'ditolak' ? (body.alasanPenolakan ?? current.alasanPenolakan ?? null) : null,
        body.linkPendaftaran !== undefined ? body.linkPendaftaran : current.linkPendaftaran ?? null,
        body.isAktif !== undefined ? Boolean(body.isAktif) : current.isAktif,
        waLinkPut,
        durasiProgramPut,
        id
      ]
    );

    const event = await getEventById(id);
    return res.json({ success: true, proposal: event, event });
  } catch (error) {
    console.error('[Events PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui event di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan.' });

    const [result] = await pool.query('DELETE FROM training_proposals WHERE proposal_id_string = ?', [id]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ success: true, message: `Event "${event.namaKegiatan}" berhasil dihapus`, eventId: id });
  } catch (error) {
    console.error('[Events DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus event dari MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/events/:id/approve', async (req, res) => {
  try {
    const id = String(req.params.id);
    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Permintaan pelatihan tidak ditemukan.' });

    const quota = Number(event.targetDanKuotaPeserta || req.body?.targetKuota || 0);
    const origin = req.protocol + '://' + req.get('host');
    const link = `${origin}/#daftar/${id}`;
    const pool = await getPool();

    await pool.query(
      `UPDATE training_proposals
       SET status='disetujui', kuota_disetujui=?, link_pendaftaran=?,
           tanggal_persetujuan=CURRENT_TIMESTAMP, is_aktif=TRUE,
           alasan_penolakan=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [quota, link, id]
    );
    const updated = await getEventById(id);
    await addSystemLog('Super Administrator', 'superadmin', 'Verifikasi Event Pelatihan', 'events', `Event ${updated?.namaKegiatan ?? id} disetujui.`, 'success');
    return res.json({ success: true, proposal: updated, event: updated });
  } catch (error) {
    console.error('[Events APPROVE] error:', error);
    return res.status(500).json({ error: 'Gagal menyetujui event.' });
  }
});

app.post('/api/events/:id/reject', async (req, res) => {
  try {
    const id = String(req.params.id);
    const reason = String(req.body?.alasanPenolakan ?? '').trim();
    if (!reason) return res.status(400).json({ error: 'Wajib menyertakan alasan penolakan agar mitra dapat memperbaikinya.' });

    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'Permintaan pelatihan tidak ditemukan.' });
    const pool = await getPool();

    await pool.query(
      `UPDATE training_proposals SET status='ditolak', alasan_penolakan=?, is_aktif=FALSE, updated_at=CURRENT_TIMESTAMP
       WHERE proposal_id_string=?`,
      [reason, id]
    );
    const updated = await getEventById(id);
    await addSystemLog('Super Administrator', 'superadmin', 'Penolakan Event Pelatihan', 'events', `Event ${event.namaKegiatan} ditolak.`, 'warning');
    return res.json({ success: true, proposal: updated, event: updated });
  } catch (error) {
    console.error('[Events REJECT] error:', error);
    return res.status(500).json({ error: 'Gagal menolak event.' });
  }
});

// ======================== PARTICIPANTS ========================

async function getParticipantById(id: string) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT p.*, tp.nama_kegiatan AS eventTitle
     FROM participants p
     LEFT JOIN training_proposals tp ON tp.proposal_id_string = p.event_id_string
     WHERE p.participant_id_string = ? LIMIT 1`,
    [id]
  );
  return Array.isArray(rows) && rows.length ? mapDbParticipant(rows[0]) : null;
}

// Validasi tanggal TPQ di server agar format dan rentang tanggal konsisten.
function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}
function validateTPQDates(body: any): string | null {
  // Tanggal mulai & berakhir diisi di form pendidikan. Data lama boleh kosong, jadi validasi hanya berlaku bila diisi.
  if (!body.tanggalMulai && !body.tanggalSelesai) return null;
  if (!isIsoDate(body.tanggalMulai) || !isIsoDate(body.tanggalSelesai)) return 'Tanggal mulai dan tanggal selesai harus valid.';
  if (body.tanggalSelesai < body.tanggalMulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
  if (body.batasPendaftaran && (!isIsoDate(body.batasPendaftaran) || body.batasPendaftaran > body.tanggalMulai)) return 'Batas pendaftaran harus berupa tanggal valid dan tidak boleh melewati tanggal mulai.';
  return null;
}

// Nomor WhatsApp lembaga pendidikan (tujuan tombol "Hubungi Penyelenggara"). Kolom ditambahkan otomatis bila database lama belum punya.
let tpqContactColumnReady = false;
async function ensureTpqContactColumn(pool: any) {
  if (tpqContactColumnReady) return;
  const [cols] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tpq_programs' AND COLUMN_NAME = 'nomor_wa_lembaga'"
  );
  if (Number((cols as any[])[0]?.n) === 0) {
    await pool.query("ALTER TABLE tpq_programs ADD COLUMN nomor_wa_lembaga varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER foto_dokumentasi");
  }
  tpqContactColumnReady = true;
}
// Normalisasi nomor ke format internasional tanpa tanda + (62812...). Mengembalikan '' bila tidak valid.
function normalizeWaNumber(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d.length >= 9 && d.length <= 15 ? d : '';
}

// ======================== PENDIDIKAN TPQ ========================

app.get('/api/tpq', async (req, res) => {
  try {
    const pool = await getPool();
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    const params: any[] = [];
    const where: string[] = [];
    // Permintaan "program milik mitra" tanpa sesi valid ditolak, bukan dialihkan ke katalog publik semua mitra.
    if (!sessionUser && req.query.mitraId && req.query.publicCatalog !== 'true') {
      return res.status(401).json({ error: 'Sesi login tidak valid. Silakan login ulang.' });
    }
    if (!sessionUser || req.query.publicCatalog === 'true') {
      // Katalog homepage hanya melihat program yang sudah disetujui dan aktif, juga saat Mitra login.
      where.push("LOWER(TRIM(COALESCE(tp.status, ''))) = 'disetujui'", 'CAST(COALESCE(tp.izinkan_publikasi, 0) AS UNSIGNED) = 1');
    } else if (sessionUser.role !== 'superadmin') {
      // Mitra hanya dapat membaca program miliknya, tidak berdasarkan query yang bisa dipalsukan.
      where.push('tp.mitra_id_string = ?');
      params.push(sessionUser.id);
    }
    let sql = `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo, u.phone AS mitraPhone
               FROM tpq_programs tp
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    // Tanpa ORDER BY di MySQL: baris membawa kolom besar (logo base64, foto JSON) sehingga filesort
    // memicu ER_OUT_OF_SORTMEMORY. Urutan dibuat di Node (id auto-increment = urutan input).
    const [rawRows] = await pool.query(sql, params);
    const rows = Array.isArray(rawRows) ? [...rawRows].sort((a: any, b: any) => Number(b.id) - Number(a.id)) : rawRows;
    return res.json({ programs: Array.isArray(rows) ? rows.map((row: any) => mapDbTPQ(row)) : [] });
  } catch (error) {
    console.error('[TPQ GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil program TPQ dari MySQL.' });
  }
});

app.post('/api/tpq', async (req, res) => {
  try {
    const body = req.body ?? {};
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role !== 'mitra' && sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Akses ditolak.' });
    // Mitra hanya boleh membuat program atas namanya sendiri, tidak bisa memakai id mitra lain dari body.
    if (sessionUser.role === 'mitra') body.mitraId = sessionUser.id;
    const required = ['namaProgram', 'jenisTPQ', 'deskripsiProgram', 'provinsi', 'kota'];
    for (const key of required) if (!body[key]) return res.status(400).json({ error: `${key} wajib diisi.` });
    if (!body.tanggalMulai || !body.tanggalSelesai) return res.status(400).json({ error: 'Tanggal mulai dan tanggal berakhir wajib diisi.' });
    const waLembaga = normalizeWaNumber(body.noWaLembaga);
    if (!waLembaga) return res.status(400).json({ error: 'Nomor WhatsApp lembaga wajib diisi dengan nomor yang valid, contoh 081234567890.' });
    const dateError = validateTPQDates(body);
    if (dateError) return res.status(400).json({ error: dateError });
    if (!['isyarat', 'braille'].includes(body.jenisTPQ)) return res.status(400).json({ error: 'Jenis TPQ harus Isyarat atau Braille.' });
    if (!Array.isArray(body.hariPertemuan) || body.hariPertemuan.length === 0) return res.status(400).json({ error: 'Hari pertemuan wajib dipilih.' });
    const pool = await getPool();
    await ensureTpqContactColumn(pool);
    const mitraIdString = body.mitraId ? String(body.mitraId) : null;
    let mitraNumericId: number | null = null;
    if (mitraIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string = ? LIMIT 1', [mitraIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Mitra tidak ditemukan di MySQL.' });
      mitraNumericId = Number((uRows as any[])[0].id);
    }
    const id = `tpq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(`INSERT INTO tpq_programs
      (program_id_string, mitra_id, mitra_id_string, nama_program, jenis_tpq, deskripsi_program, tujuan_pembelajaran, target_peserta, kuota_peserta, materi_pembelajaran, metode_pembelajaran, kebutuhan_fasilitas, frekuensi_pertemuan, hari_pertemuan, jam_mulai, jam_selesai, tanggal_mulai, tanggal_selesai, batas_pendaftaran, benefit_program, provinsi, kota, lokasi_dan_alamat, latitude, longitude, foto_dokumentasi, nomor_wa_lembaga, status, is_aktif, jumlah_pendaftar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu_persetujuan', 0, 0)`, [
      id, mitraNumericId, mitraIdString, body.namaProgram, body.jenisTPQ, body.deskripsiProgram, body.tujuanPembelajaran || null, body.targetPeserta || null, Number(body.kuotaPeserta || 0), body.materiPembelajaran || null, body.metodePembelajaran || null, JSON.stringify(Array.isArray(body.kebutuhanFasilitas) ? body.kebutuhanFasilitas : []), body.frekuensiPertemuan || null, JSON.stringify(body.hariPertemuan), body.jamMulai || null, body.jamSelesai || null, body.tanggalMulai, body.tanggalSelesai, body.batasPendaftaran || null, body.benefitProgram || null, body.provinsi, body.kota, body.lokasiDanAlamat, Number(body.latitude), Number(body.longitude), JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []), waLembaga
    ]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo, u.phone AS mitraPhone FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id WHERE tp.program_id_string=? LIMIT 1', [id]);
    return res.status(201).json({ program: mapDbTPQ((rows as any[])[0]) });
  } catch (error) {
    console.error('[TPQ POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan program TPQ ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/tpq/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const pool = await getPool();
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const [existing] = await pool.query('SELECT * FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const existingProgram = (existing as any[])[0];
    const isSuperadmin = sessionUser.role === 'superadmin';
    if (!isSuperadmin && String(existingProgram.mitra_id_string || '') !== String(sessionUser.id)) return res.status(403).json({ error: 'Anda hanya dapat mengubah program TPQ milik sendiri.' });
    const dateError = validateTPQDates(body);
    if (dateError) return res.status(400).json({ error: dateError });
    const waLembaga = normalizeWaNumber(body.noWaLembaga);
    if (!waLembaga) return res.status(400).json({ error: 'Nomor WhatsApp lembaga wajib diisi dengan nomor yang valid, contoh 081234567890.' });
    await ensureTpqContactColumn(pool);
    const adminEdit = isSuperadmin;
    await pool.query(`UPDATE tpq_programs SET nama_program=?, jenis_tpq=?, deskripsi_program=?, tujuan_pembelajaran=?, target_peserta=?, kuota_peserta=?, materi_pembelajaran=?, metode_pembelajaran=?, kebutuhan_fasilitas=?, frekuensi_pertemuan=?, hari_pertemuan=?, jam_mulai=?, jam_selesai=?, tanggal_mulai=?, tanggal_selesai=?, batas_pendaftaran=?, benefit_program=?, provinsi=?, kota=?, lokasi_dan_alamat=?, latitude=?, longitude=?, foto_dokumentasi=?, nomor_wa_lembaga=?, status=IF(?, status, 'menunggu_persetujuan'), is_aktif=IF(?, is_aktif, 0), izinkan_publikasi=IF(?, izinkan_publikasi, 0), updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?`, [
      body.namaProgram, body.jenisTPQ, body.deskripsiProgram, body.tujuanPembelajaran || null, body.targetPeserta || null, Number(body.kuotaPeserta || 0), body.materiPembelajaran || null, body.metodePembelajaran || null, JSON.stringify(Array.isArray(body.kebutuhanFasilitas) ? body.kebutuhanFasilitas : []), body.frekuensiPertemuan || null, JSON.stringify(Array.isArray(body.hariPertemuan) ? body.hariPertemuan : []), body.jamMulai || null, body.jamSelesai || null, body.tanggalMulai || null, body.tanggalSelesai || null, body.batasPendaftaran || null, body.benefitProgram || null, body.provinsi, body.kota, body.lokasiDanAlamat, Number(body.latitude), Number(body.longitude), JSON.stringify(Array.isArray(body.fotoDokumentasi) ? body.fotoDokumentasi : []), waLembaga, adminEdit, adminEdit, adminEdit, id
    ]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo, u.phone AS mitraPhone FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id WHERE tp.program_id_string=? LIMIT 1', [id]);
    return res.json({ program: mapDbTPQ((rows as any[])[0]) });
  } catch (error) {
    console.error('[TPQ PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui program TPQ di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/tpq/:id/approve', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat menyetujui Pendidikan TPQ.' });
    const id = String(req.params.id);
    const pool = await getPool();
    const [existing] = await pool.query('SELECT program_id_string, nama_program, status FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Pengajuan Pendidikan TPQ tidak ditemukan.' });
    await pool.query("UPDATE tpq_programs SET status='disetujui', is_aktif=0, izinkan_publikasi=0, alasan_penolakan=NULL, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?", [id]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo, u.phone AS mitraPhone FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string WHERE tp.program_id_string=? LIMIT 1', [id]);
    const program = mapDbTPQ((rows as any[])[0]);
    await addSystemLog('Super Administrator', 'superadmin', 'Persetujuan Pendidikan TPQ', 'tpq', `Program TPQ ${program.namaProgram} disetujui.`, 'success');
    return res.json({ success: true, program });
  } catch (error) {
    console.error('[TPQ APPROVE] error:', error);
    return res.status(500).json({ error: 'Gagal menyetujui program TPQ.' });
  }
});

app.post('/api/tpq/:id/publish', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat mengatur publikasi Pendidikan TPQ.' });
    const id = String(req.params.id);
    const allowed = Boolean(req.body?.izinkanPublikasi);
    const pool = await getPool();
    const [found] = await pool.query('SELECT nama_program, status FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(found) || !found.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    if (allowed && (found as any[])[0].status !== 'disetujui') return res.status(409).json({ error: 'Setujui program terlebih dahulu sebelum mengizinkan publikasi.' });
    await pool.query('UPDATE tpq_programs SET izinkan_publikasi=?, is_aktif=?, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?', [allowed ? 1 : 0, allowed ? 1 : 0, id]);
    await addSystemLog('Super Administrator', 'superadmin', allowed ? 'Izinkan Publikasi Pendidikan TPQ' : 'Cabut Publikasi Pendidikan TPQ', 'tpq', `Publikasi program TPQ ${(found as any[])[0].nama_program}: ${allowed ? 'diizinkan' : 'dinonaktifkan'}.`, 'success');
    return res.json({ success: true, izinkanPublikasi: allowed, isAktif: allowed });
  } catch (error) {
    console.error('[TPQ PUBLISH] error:', error);
    return res.status(500).json({ error: 'Gagal mengatur publikasi Pendidikan TPQ.' });
  }
});

app.post('/api/tpq/:id/reject', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser || sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Hanya Superadmin yang dapat menolak Pendidikan TPQ.' });
    const id = String(req.params.id);
    const reason = String(req.body?.alasanPenolakan ?? '').trim();
    if (!reason) return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    const pool = await getPool();
    const [existing] = await pool.query('SELECT program_id_string, nama_program FROM tpq_programs WHERE program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(existing) || !existing.length) return res.status(404).json({ error: 'Pengajuan Pendidikan TPQ tidak ditemukan.' });
    await pool.query("UPDATE tpq_programs SET status='ditolak', is_aktif=0, alasan_penolakan=?, updated_at=CURRENT_TIMESTAMP WHERE program_id_string=?", [reason, id]);
    const [rows] = await pool.query('SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg, u.organization_logo AS userOrgLogo, u.phone AS mitraPhone FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string WHERE tp.program_id_string=? LIMIT 1', [id]);
    const program = mapDbTPQ((rows as any[])[0]);
    await addSystemLog('Super Administrator', 'superadmin', 'Penolakan Pendidikan TPQ', 'tpq', `Program TPQ ${program.namaProgram} ditolak. Alasan: ${reason}`, 'warning');
    return res.json({ success: true, program });
  } catch (error) {
    console.error('[TPQ REJECT] error:', error);
    return res.status(500).json({ error: 'Gagal menolak program TPQ.' });
  }
});

// Kolom gender pada tpq_registrations ditambahkan otomatis sekali per proses bila database lama belum punya.
let tpqGenderColumnReady = false;
async function ensureTpqGenderColumn(pool: any) {
  if (tpqGenderColumnReady) return;
  const [cols] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tpq_registrations' AND COLUMN_NAME = 'gender'"
  );
  if (!Number((cols as any[])[0]?.n)) {
    await pool.query("ALTER TABLE tpq_registrations ADD COLUMN gender varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER kategori_disabilitas");
  }
  const [addr] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tpq_registrations' AND COLUMN_NAME = 'alamat'"
  );
  if (!Number((addr as any[])[0]?.n)) {
    await pool.query("ALTER TABLE tpq_registrations ADD COLUMN alamat text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER gender");
  }
  tpqGenderColumnReady = true;
}

// Daftar peserta TPQ untuk dashboard. Superadmin melihat semua; Mitra hanya peserta program TPQ miliknya.
// Harus didaftarkan SEBELUM route '/api/tpq/:id/...' agar "registrations" tidak dibaca sebagai :id.
app.get('/api/tpq/registrations', async (req, res) => {
  try {
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role !== 'mitra' && sessionUser.role !== 'superadmin') return res.status(403).json({ error: 'Akses ditolak.' });
    const pool = await getPool();
    await ensureTpqGenderColumn(pool);
    const params: any[] = [];
    let sql = `SELECT r.*, tp.nama_program AS programName, tp.mitra_id_string AS mitraId,
                      u.name AS mitraName, u.organization_name AS mitraOrg
               FROM tpq_registrations r
               JOIN tpq_programs tp ON tp.program_id_string = r.program_id_string
               LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string`;
    if (sessionUser.role === 'mitra') {
      sql += ' WHERE tp.mitra_id_string = ?';
      params.push(sessionUser.id);
    }
    sql += ' ORDER BY r.created_at DESC, r.id DESC';
    const [rows] = await pool.query(sql, params);
    const registrations = (Array.isArray(rows) ? rows : []).map((r: any) => ({
      id: String(r.registration_id_string ?? r.id),
      programId: String(r.program_id_string ?? ''),
      programName: r.programName ?? '',
      mitraName: r.mitraOrg || r.mitraName || '',
      namaLengkap: r.nama_lengkap ?? '',
      noWa: r.no_wa ?? '',
      email: r.email ?? '',
      usia: Number(r.usia ?? 0),
      kategoriDisabilitas: r.kategori_disabilitas ?? '',
      gender: r.gender ?? '',
      alamat: r.alamat ?? '',
      catatanKhusus: r.catatan_khusus ?? '',
      waktuDaftar: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
    return res.json({ registrations });
  } catch (error) {
    console.error('[TPQ registrations GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil peserta TPQ dari MySQL.' });
  }
});

// Pendaftaran peserta TPQ: peserta tidak masuk grup WhatsApp, tetapi menghubungi penyelenggara lewat tombol WhatsApp di frontend.
app.post('/api/tpq/:id/register', async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const nama = String(body.namaLengkap ?? '').trim();
    const noWa = String(body.noWa ?? '').trim();
    const email = String(body.email ?? '').trim();
    const usia = Number(body.usia);
    const disabilitas = String(body.kategoriDisabilitas ?? '').trim();
    const catatan = String(body.catatanKhusus ?? '').trim();
    const gender = String(body.gender ?? '').trim();
    const alamat = String(body.alamat ?? '').trim();
    if (!nama || !noWa || !email || !disabilitas) {
      return res.status(400).json({ error: 'Nama, nomor WhatsApp, email, dan kategori peserta wajib diisi.' });
    }
    // Usia opsional di formulir; bila diisi harus 1-120. Bila kosong disimpan 0.
    const usiaFinal = body.usia === undefined || body.usia === null || String(body.usia).trim() === '' ? 0 : usia;
    if (!Number.isInteger(usiaFinal) || usiaFinal < 0 || usiaFinal > 120) {
      return res.status(400).json({ error: 'Usia harus berupa angka antara 1 dan 120 tahun.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Format email tidak valid.' });
    if (!['Tunanetra', 'Tunarungu'].includes(disabilitas)) return res.status(400).json({ error: 'Kategori peserta harus Tunanetra atau Tunarungu.' });
    if (gender && !['Laki-laki', 'Perempuan'].includes(gender)) return res.status(400).json({ error: 'Jenis kelamin tidak valid.' });
    const pool = await getPool();
    await ensureTpqGenderColumn(pool);
    await ensureTpqContactColumn(pool);
    const [rows] = await pool.query('SELECT tp.id, tp.nama_program, tp.status, tp.izinkan_publikasi, tp.jumlah_pendaftar, tp.kuota_peserta, tp.batas_pendaftaran, tp.nomor_wa_lembaga, u.phone AS mitraPhone FROM tpq_programs tp LEFT JOIN users u ON u.id = tp.mitra_id OR u.user_id_string = tp.mitra_id_string WHERE tp.program_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    const program = (rows as any[])[0];
    if (program.status !== 'disetujui' || !Boolean(Number(program.izinkan_publikasi))) return res.status(409).json({ error: 'Pendaftaran program ini belum dibuka.' });
    if (program.batas_pendaftaran && String(program.batas_pendaftaran).slice(0, 10) < new Date().toISOString().slice(0, 10)) return res.status(409).json({ error: 'Batas pendaftaran program ini sudah lewat.' });
    const quota = Number(program.kuota_peserta || 0);
    if (quota > 0 && Number(program.jumlah_pendaftar || 0) >= quota) return res.status(409).json({ error: 'Kuota peserta program ini sudah penuh.' });
    const registrationId = `tpqr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(`INSERT INTO tpq_registrations (registration_id_string, program_id_string, nama_lengkap, no_wa, email, usia, kategori_disabilitas, gender, alamat, catatan_khusus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [registrationId, id, nama, noWa, email, usiaFinal, disabilitas, gender || null, alamat || null, catatan || null]);
    await pool.query('UPDATE tpq_programs SET jumlah_pendaftar=jumlah_pendaftar+1 WHERE program_id_string=?', [id]);
    return res.status(201).json({ success: true, message: 'Pendaftaran TPQ berhasil dikirim.', noWaLembaga: String(program.nomor_wa_lembaga || program.mitraPhone || '') });
  } catch (error) {
    console.error('[TPQ REGISTER] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan pendaftaran TPQ.' });
  }
});

app.delete('/api/tpq/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    const pool = await getPool();
    const isSuperadmin = sessionUser.role === 'superadmin';
    const [rows] = await pool.query('SELECT id, mitra_id_string FROM tpq_programs WHERE program_id_string = ? LIMIT 1', [id]);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(404).json({ error: 'Program TPQ tidak ditemukan.' });
    if (!isSuperadmin && String((rows as any[])[0].mitra_id_string || '') !== String(sessionUser.id)) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus program TPQ milik sendiri.' });
    }
    await pool.query('DELETE FROM tpq_programs WHERE program_id_string = ?', [id]);
    return res.json({ message: 'Program TPQ berhasil dihapus.' });
  } catch (error) {
    console.error('[TPQ DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus program TPQ dari MySQL.' });
  }
});

// ======================== LINK GRUP WHATSAPP EVENT ========================
// Dipakai form Kelola Event. Sengaja terpisah dari /api/events agar link tidak bocor ke halaman publik.
app.get('/api/events/:id/wa-link', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT link_grup_wa FROM training_proposals WHERE proposal_id_string=? LIMIT 1',
      [String(req.params.id)]
    );
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Event tidak ditemukan.' });
    return res.json({ waLink: (rows as any[])[0].link_grup_wa ?? '' });
  } catch (error) {
    console.error('[WA-link GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil link grup WhatsApp.' });
  }
});

app.put('/api/events/:id/wa-link', async (req, res) => {
  try {
    const id = String(req.params.id);
    const waLink = String(req.body?.waLink ?? '').trim();
    if (waLink && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(waLink)) {
      return res.status(400).json({ error: 'Harus berupa link grup WhatsApp (https://chat.whatsapp.com/...).' });
    }

    const pool = await getPool();
    const [found] = await pool.query('SELECT id FROM training_proposals WHERE proposal_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(found) || !found.length) return res.status(404).json({ error: 'Event tidak ditemukan.' });

    await pool.query('UPDATE training_proposals SET link_grup_wa=? WHERE proposal_id_string=?', [waLink || null, id]);

    // Peserta yang daftar sebelum link ada (atau emailnya gagal) dan punya email asli
    let pending: any[] = [];
    if (waLink) {
      const [rows] = await pool.query(
        `SELECT p.participant_id_string AS pid, p.nama_lengkap AS nama, p.email, tp.nama_kegiatan AS eventName
         FROM participants p
         JOIN training_proposals tp ON tp.id = p.training_proposal_id
         WHERE tp.proposal_id_string=? AND p.link_sent=0 AND p.status_kehadiran <> 'batal'
           AND p.email NOT LIKE '%@peserta.id'`,
        [id]
      );
      pending = Array.isArray(rows) ? (rows as any[]) : [];
    }

    // Balas dulu supaya form tidak menunggu; email dikirim di belakang layar.
    res.json({ success: true, antrean: pending.length });

    for (const p of pending) {
      try {
        await sendWaLinkEmail({ to: p.email, nama: p.nama, eventName: p.eventName, waLink });
        await pool.query('UPDATE participants SET link_sent=1 WHERE participant_id_string=?', [p.pid]);
      } catch (mailErr) {
        console.error('[Mail] Gagal kirim ke', p.email, mailErr);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500)); // jeda agar aman dari batas kirim Gmail
    }
  } catch (error) {
    console.error('[WA-link PUT] error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Gagal menyimpan link grup WhatsApp.' });
  }
});

// Otorisasi ubah/hapus peserta: Super Admin boleh semua; Mitra hanya peserta dari event miliknya sendiri.
async function authorizeParticipantWrite(req: any, res: any, participant: { eventId?: string }, opts: { superadminOnly?: boolean } = {}): Promise<boolean> {
  const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
  if (!sessionUser) { res.status(401).json({ error: 'Silakan login terlebih dahulu.' }); return false; }
  if (sessionUser.role === 'superadmin') return true;
  if (sessionUser.role !== 'mitra' || opts.superadminOnly) { res.status(403).json({ error: 'Akses ditolak.' }); return false; }
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT 1 FROM training_proposals tp
     WHERE tp.proposal_id_string = ?
       AND (tp.mitra_id_string = ? OR tp.mitra_id = (SELECT u.id FROM users u WHERE u.user_id_string = ? LIMIT 1))
     LIMIT 1`,
    [participant.eventId ?? '', sessionUser.id, sessionUser.id]
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(403).json({ error: 'Anda tidak memiliki akses ke peserta event mitra lain.' });
    return false;
  }
  return true;
}

// ---- Statistik publik & pencatatan pengunjung website ----
// Tabel site_visits dibuat otomatis (CREATE TABLE IF NOT EXISTS) saat server start
// dan juga dicek lagi saat endpoint dipakai. Yang disimpan hanya ID acak anonim dari
// browser; alamat IP dan identitas pengguna TIDAK disimpan.
let siteVisitsTableReady = false;
async function ensureSiteVisitsTable(pool: any) {
  if (siteVisitsTableReady) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS site_visits (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    visitor_id varchar(64) NOT NULL,
    halaman varchar(255) DEFAULT NULL,
    user_agent varchar(255) DEFAULT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sv_visitor (visitor_id, created_at),
    KEY idx_sv_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  siteVisitsTableReady = true;
}

// Mesin pencari / robot tidak dihitung sebagai pengunjung.
const BOT_USER_AGENT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|httpclient|axios|node-fetch/i;

app.post('/api/public/visit', async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId ?? '').trim();
    if (!/^[A-Za-z0-9-]{16,64}$/.test(visitorId)) {
      return res.status(400).json({ error: 'visitorId tidak valid.' });
    }
    const userAgent = String(req.headers['user-agent'] ?? '');
    if (!userAgent || BOT_USER_AGENT.test(userAgent)) {
      return res.json({ ok: true, counted: false });
    }
    if (isIpLimited(`visit:${req.ip || 'unknown'}`, 200)) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan.' });
    }

    const pool = await getPool();
    await ensureSiteVisitsTable(pool);

    // Kunjungan berulang dari pengunjung yang sama dalam 30 menit dihitung satu kali.
    const [recent] = await pool.query(
      'SELECT 1 FROM site_visits WHERE visitor_id = ? AND created_at > (NOW() - INTERVAL 30 MINUTE) LIMIT 1',
      [visitorId]
    );
    if (Array.isArray(recent) && recent.length > 0) {
      return res.json({ ok: true, counted: false });
    }

    const halaman = String(req.body?.halaman ?? '/').slice(0, 255);
    await pool.query(
      'INSERT INTO site_visits (visitor_id, halaman, user_agent) VALUES (?, ?, ?)',
      [visitorId, halaman, userAgent.slice(0, 255)]
    );
    return res.json({ ok: true, counted: true });
  } catch (error) {
    console.error('[Public Visit POST] error:', error);
    return res.status(500).json({ error: 'Gagal mencatat kunjungan.' });
  }
});

// Statistik publik untuk landing page: hanya angka total, tanpa data pribadi.
//  - totalPeserta    : peserta event yang tidak berstatus batal
//  - totalPengunjung : jumlah pengunjung unik (ID browser berbeda)
//  - totalKunjungan  : jumlah kunjungan tercatat
app.get('/api/public/stats', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM participants WHERE status_kehadiran <> 'batal'");
    const totalPeserta = Array.isArray(rows) ? Number((rows[0] as any)?.total ?? 0) : 0;

    let totalPengunjung = 0;
    let totalKunjungan = 0;
    try {
      await ensureSiteVisitsTable(pool);
      const [v] = await pool.query('SELECT COUNT(DISTINCT visitor_id) AS pengunjung, COUNT(*) AS kunjungan FROM site_visits');
      if (Array.isArray(v) && v[0]) {
        totalPengunjung = Number((v[0] as any).pengunjung ?? 0);
        totalKunjungan = Number((v[0] as any).kunjungan ?? 0);
      }
    } catch (visitError) {
      console.error('[Public Stats] site_visits error:', visitError);
    }

    res.set('Cache-Control', 'no-store');
    return res.json({ totalPeserta, totalPengunjung, totalKunjungan });
  } catch (error) {
    console.error('[Public Stats GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil statistik.' });
  }
});

app.get('/api/participants', async (req, res) => {
  try {
    const pool = await getPool();
    const params: any[] = [];
    const where: string[] = [];
    const sessionUser = readSessionUserId(req) ? await getUserById(readSessionUserId(req)!) : null;
    // Jangan izinkan Mitra mengambil daftar global. Batasi hanya event milik akun tersebut.
    if (!sessionUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    if (sessionUser.role === 'mitra') {
      // Tabel training_proposals tidak punya kolom mitra_org; pemilik dicocokkan lewat id string atau id numerik user.
      where.push('(tp.mitra_id_string = ? OR tp.mitra_id = (SELECT u.id FROM users u WHERE u.user_id_string = ? LIMIT 1))');
      params.push(sessionUser.id, sessionUser.id);
    } else if (sessionUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    if (typeof req.query.eventId === 'string' && req.query.eventId) { where.push('p.event_id_string = ?'); params.push(req.query.eventId); }
    if (typeof req.query.disability === 'string' && req.query.disability) { where.push('p.kategori_disabilitas = ?'); params.push(req.query.disability); }

    let sql = `SELECT p.*, tp.nama_kegiatan AS eventTitle
               FROM participants p
               LEFT JOIN training_proposals tp ON tp.proposal_id_string=p.event_id_string`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY p.created_at DESC, p.id DESC';

    const [rows] = await pool.query(sql, params);
    return res.json({ participants: Array.isArray(rows) ? rows.map(mapDbParticipant) : [] });
  } catch (error) {
    console.error('[Participants GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil peserta dari MySQL.' });
  }
});

app.post('/api/participants', async (req, res) => {
  try {
    const body = req.body ?? {};
    const { eventId, namaLengkap, noWa, email, usia, kategoriDisabilitas, kebutuhanFasilitas, catatanKhusus } = body;
    const jenisKelamin = ['Laki-laki', 'Perempuan'].includes(String(body.jenisKelamin ?? '')) ? String(body.jenisKelamin) : null;
    const alamatPeserta = String(body.alamat ?? '').trim() || null;
    if (!eventId || !namaLengkap || !noWa || !kategoriDisabilitas) {
      return res.status(400).json({ error: 'Nama lengkap, Nomor WhatsApp, dan Kategori Disabilitas wajib diisi' });
    }

    const pool = await getPool();
    const [eventRows] = await pool.query(
      `SELECT id, proposal_id_string, nama_kegiatan, COALESCE(kuota_disetujui, target_dan_kuota_peserta) AS maxQuota,
              jumlah_pendaftar, is_aktif, status
       FROM training_proposals WHERE proposal_id_string=? LIMIT 1`,
      [String(eventId)]
    );
    if (!Array.isArray(eventRows) || !eventRows.length) return res.status(404).json({ error: 'Event pelatihan tidak ditemukan' });

    const event = eventRows[0] as any;
    const maxQuota = Number(event.maxQuota || 0);
    if (maxQuota > 0 && Number(event.jumlah_pendaftar || 0) >= maxQuota) {
      return res.status(400).json({ error: 'Mohon maaf, kuota pendaftaran untuk pelatihan ini sudah penuh.' });
    }

    const participantId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fasilitas = Array.isArray(kebutuhanFasilitas) ? kebutuhanFasilitas : [];

    await pool.query(
      `INSERT INTO participants
       (participant_id_string, training_proposal_id, event_id_string, nama_lengkap, no_wa, email, usia,
        kategori_disabilitas, kebutuhan_fasilitas, catatan_khusus, jenis_kelamin, alamat, status_kehadiran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terdaftar')`,
      [
        participantId, Number(event.id), String(eventId), String(namaLengkap).trim(), String(noWa).trim(),
        email ? String(email).trim() : `${String(noWa).trim()}@peserta.id`,
        Number(usia || 0), String(kategoriDisabilitas), JSON.stringify(fasilitas), catatanKhusus || null, jenisKelamin, alamatPeserta
      ]
    );
    await pool.query('UPDATE training_proposals SET jumlah_pendaftar = jumlah_pendaftar + 1 WHERE id = ?', [Number(event.id)]);

    // Link grup WA hanya diberikan setelah pendaftaran berhasil, dan hanya untuk event yang disetujui & aktif.
    // Link TIDAK pernah ikut di GET /api/events (mapDbEvent memakai daftar field tetap).
    const [waRows] = await pool.query(
      `SELECT link_grup_wa FROM training_proposals
       WHERE id=? AND status='disetujui' AND is_aktif=1 LIMIT 1`,
      [Number(event.id)]
    );
    const waLink: string | null = (waRows as any[])[0]?.link_grup_wa || null;

    // Email = cadangan kalau peserta menutup halaman. Kalau gagal, pendaftaran tetap sukses.
    const cleanEmail = email ? String(email).trim() : '';
    if (waLink && isRealEmail(cleanEmail)) {
      sendWaLinkEmail({
        to: cleanEmail,
        nama: String(namaLengkap).trim(),
        eventName: String(event.nama_kegiatan),
        waLink,
      })
        .then(() => pool.query('UPDATE participants SET link_sent=1 WHERE participant_id_string=?', [participantId]))
        .catch((mailErr: unknown) => console.error('[Mail] Gagal kirim link WA:', mailErr));
    }

    const participant = await getParticipantById(participantId);
    const updatedEvent = await getEventById(String(eventId));
    return res.status(201).json({
      success: true,
      participant,
      event: updatedEvent,
      jumlahPendaftar: updatedEvent?.jumlahPendaftar ?? 0,
      waLink,
    });
  } catch (error) {
    console.error('[Participants POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan peserta ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.patch('/api/participants/:id/status', async (req, res) => {
  try {
    const id = String(req.params.id);
    const status = req.body?.statusKehadiran;
    if (!['terdaftar', 'hadir', 'batal'].includes(status)) return res.status(400).json({ error: 'Status kehadiran tidak valid.' });

    const pool = await getPool();
    const participant = await getParticipantById(id);
    if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    if (!(await authorizeParticipantWrite(req, res, participant))) return;
    await pool.query('UPDATE participants SET status_kehadiran=?, updated_at=CURRENT_TIMESTAMP WHERE participant_id_string=?', [status, id]);
    return res.json({ success: true, participant: await getParticipantById(id) });
  } catch (error) {
    console.error('[Participants STATUS] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui status peserta.' });
  }
});

app.put('/api/participants/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const current = await getParticipantById(id);
    if (!current) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    if (!(await authorizeParticipantWrite(req, res, current))) return;
    const body = req.body ?? {};
    const pool = await getPool();

    await pool.query(
      `UPDATE participants SET
        nama_lengkap=?, no_wa=?, email=?, usia=?, kategori_disabilitas=?,
        kebutuhan_fasilitas=?, catatan_khusus=?, status_kehadiran=?, jenis_kelamin=?, alamat=?, nilai_pretest=?, nilai_postest=?, updated_at=CURRENT_TIMESTAMP
       WHERE participant_id_string=?`,
      [
        body.namaLengkap ?? current.namaLengkap,
        body.noWa ?? current.noWa,
        body.email ?? current.email,
        body.usia !== undefined ? Number(body.usia) : current.usia,
        body.kategoriDisabilitas ?? current.kategoriDisabilitas,
        JSON.stringify(body.kebutuhanFasilitas !== undefined ? body.kebutuhanFasilitas : current.kebutuhanFasilitas),
        body.catatanKhusus !== undefined ? body.catatanKhusus : current.catatanKhusus,
        body.statusKehadiran ?? current.statusKehadiran,
        body.jenisKelamin !== undefined ? (body.jenisKelamin || null) : (current.jenisKelamin || null),
        body.alamat !== undefined ? (body.alamat || null) : (current.alamat || null),
        body.nilaiPretest !== undefined ? (body.nilaiPretest === '' || body.nilaiPretest === null ? null : Number(body.nilaiPretest)) : (current.nilaiPretest ?? null),
        body.nilaiPostest !== undefined ? (body.nilaiPostest === '' || body.nilaiPostest === null ? null : Number(body.nilaiPostest)) : (current.nilaiPostest ?? null),
        id
      ]
    );
    return res.json({ success: true, participant: await getParticipantById(id) });
  } catch (error) {
    console.error('[Participants PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui peserta di MySQL.' });
  }
});

app.delete('/api/participants/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const participant = await getParticipantById(id);
    if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan.' });
    if (!(await authorizeParticipantWrite(req, res, participant, { superadminOnly: true }))) return;

    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM participants WHERE participant_id_string=?', [id]);
    if ((result as any).affectedRows) {
      await pool.query(
        `UPDATE training_proposals SET jumlah_pendaftar=GREATEST(jumlah_pendaftar - 1, 0)
         WHERE proposal_id_string=?`,
        [participant.eventId]
      );
    }
    return res.json({ success: true, message: `Peserta ${participant.namaLengkap} berhasil dihapus`, participantId: id });
  } catch (error) {
    console.error('[Participants DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus peserta dari MySQL.' });
  }
});

// ======================== DISABILITIES ========================

app.get('/api/disabilities', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, disability_id_string, kode, nama, kategori_utama, deskripsi,
              metode_pembelajaran, fasilitas_rekomendasi, warna_hex, icon, is_aktif, created_at
       FROM disabilities ORDER BY created_at DESC, id DESC`
    );
    const disabilities = Array.isArray(rows) ? rows.map(mapDbDisability) : [];
    return res.json({ disabilities, data: disabilities });
  } catch (error) {
    console.error('[Disabilities GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil kategori disabilitas dari MySQL.' });
  }
});

app.post('/api/disabilities', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.kode || !body.nama) return res.status(400).json({ error: 'Kode dan Nama Kategori Disabilitas wajib diisi' });

    const pool = await getPool();
    const kode = String(body.kode).trim().toLowerCase().replace(/\s+/g, '_');
    const [existing] = await pool.query('SELECT id FROM disabilities WHERE LOWER(kode)=? LIMIT 1', [kode]);
    if (Array.isArray(existing) && existing.length) return res.status(409).json({ error: `Kode disabilitas "${kode}" sudah ada dalam master data` });

    const id = `dis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO disabilities
       (disability_id_string, kode, nama, kategori_utama, deskripsi, metode_pembelajaran,
        fasilitas_rekomendasi, warna_hex, icon, is_aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id, kode, String(body.nama).trim(), body.kategoriUtama || 'Sensorik',
        body.deskripsi || '', body.metodePembelajaran || 'Metode pembelajaran ramah disabilitas standar Kemenag RI',
        JSON.stringify(Array.isArray(body.fasilitasRekomendasi) ? body.fasilitasRekomendasi : []),
        body.warnaHex || '#005a71', body.icon || 'accessible'
      ]
    );
    const [rows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    const disability = Array.isArray(rows) && rows.length ? mapDbDisability(rows[0]) : null;
    return res.status(201).json({ success: true, disability, item: disability });
  } catch (error) {
    console.error('[Disabilities POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan kategori disabilitas ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/disabilities/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [currentRows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(currentRows) || !currentRows.length) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });

    const current = currentRows[0] as any;
    const body = req.body ?? {};
    const kode = body.kode !== undefined ? String(body.kode).trim().toLowerCase().replace(/\s+/g, '_') : current.kode;

    const [dupe] = await pool.query('SELECT id FROM disabilities WHERE LOWER(kode)=? AND disability_id_string<>? LIMIT 1', [kode, id]);
    if (Array.isArray(dupe) && dupe.length) return res.status(409).json({ error: `Kode disabilitas "${kode}" sudah digunakan.` });

    await pool.query(
      `UPDATE disabilities SET
       kode=?, nama=?, kategori_utama=?, deskripsi=?, metode_pembelajaran=?,
       fasilitas_rekomendasi=?, warna_hex=?, icon=?, is_aktif=?, updated_at=CURRENT_TIMESTAMP
       WHERE disability_id_string=?`,
      [
        kode,
        body.nama ?? current.nama,
        body.kategoriUtama ?? current.kategori_utama,
        body.deskripsi !== undefined ? body.deskripsi : current.deskripsi,
        body.metodePembelajaran ?? current.metode_pembelajaran,
        JSON.stringify(body.fasilitasRekomendasi !== undefined ? body.fasilitasRekomendasi : jsonParse<string[]>(current.fasilitas_rekomendasi, [])),
        body.warnaHex ?? current.warna_hex,
        body.icon ?? current.icon,
        body.isAktif !== undefined ? Boolean(body.isAktif) : Boolean(current.is_aktif),
        id
      ]
    );
    const [rows] = await pool.query('SELECT * FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    const disability = Array.isArray(rows) && rows.length ? mapDbDisability(rows[0]) : null;
    return res.json({ success: true, disability, item: disability });
  } catch (error) {
    console.error('[Disabilities PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kategori disabilitas di MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/disabilities/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [rows] = await pool.query('SELECT nama FROM disabilities WHERE disability_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });

    try {
      const [result] = await pool.query('DELETE FROM disabilities WHERE disability_id_string=?', [id]);
      if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Data disabilitas tidak ditemukan' });
      return res.json({ success: true, message: `Kategori disabilitas "${(rows[0] as any).nama}" berhasil dihapus`, id });
    } catch (dbError: any) {
      if (dbError?.code === 'ER_ROW_IS_REFERENCED_2' || dbError?.code === 'ER_ROW_IS_REFERENCED') {
        return res.status(409).json({
          error: 'Kategori disabilitas masih digunakan oleh data lain sehingga tidak dapat dihapus. Nonaktifkan kategori tersebut terlebih dahulu.',
          code: dbError.code
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('[Disabilities DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kategori disabilitas dari MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== EVENT CATEGORIES ========================

app.get('/api/event-categories', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id, category_id_string, kode, nama, deskripsi, icon, warna_hex, is_aktif, urutan, created_at, updated_at
       FROM event_categories ORDER BY urutan ASC, id ASC`
    );
    const [evRows] = await pool.query('SELECT jenis_event, nama_kegiatan, event_category_id_string FROM training_proposals');
    const events = Array.isArray(evRows) ? evRows : [];

    const categories = Array.isArray(rows) ? rows.map(mapDbEventCategory).map((cat) => {
      const count = events.filter((e: any) => {
        const j = String(e.jenis_event || '').toLowerCase();
        const n = cat.nama.toLowerCase();
        const k = cat.kode.toLowerCase();
        return j === n || j === k || (k.length > 2 && j.includes(k)) || (cat.kode === 'Orang Umum' && j.includes('umum'));
      }).length;
      return { ...cat, eventCount: count };
    }) : [];

    return res.json({ categories, data: categories });
  } catch (error) {
    console.error('[EventCategories GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil kategori event.' });
  }
});

app.post('/api/event-categories', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.nama) return res.status(400).json({ error: 'Nama Kategori Event wajib diisi.' });

    const pool = await getPool();
    const rawKode = body.kode ? String(body.kode).trim() : String(body.nama).trim();
    const kode = rawKode.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();

    const [existing] = await pool.query('SELECT id FROM event_categories WHERE LOWER(kode)=? LIMIT 1', [kode.toLowerCase()]);
    if (Array.isArray(existing) && existing.length) {
      return res.status(409).json({ error: `Kode/nama kategori "${kode}" sudah ada.` });
    }

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const [all] = await pool.query('SELECT id FROM event_categories');
    const urutan = Number(body.urutan || (Array.isArray(all) ? all.length + 1 : 1));

    await pool.query(
      `INSERT INTO event_categories
       (category_id_string, kode, nama, deskripsi, icon, warna_hex, is_aktif, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        kode,
        String(body.nama).trim(),
        body.deskripsi || '',
        body.icon || 'category',
        body.warnaHex || '#0284c7',
        body.isAktif !== undefined ? Boolean(body.isAktif) : true,
        urutan,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    const category = Array.isArray(rows) && rows.length ? mapDbEventCategory(rows[0]) : null;
    await addSystemLog('Super Admin', 'superadmin', 'Tambah Kategori Event', 'Kategori Event', `Menambahkan kategori "${body.nama}"`);
    return res.status(201).json({ success: true, category, item: category });
  } catch (error) {
    console.error('[EventCategories POST] error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/event-categories/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [currentRows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(currentRows) || !currentRows.length) {
      return res.status(404).json({ error: 'Kategori event tidak ditemukan.' });
    }

    const current = currentRows[0] as any;
    const body = req.body ?? {};
    const oldName = current.nama;
    const oldKode = current.kode;
    const newName = body.nama !== undefined ? String(body.nama).trim() : oldName;
    const newKode = body.kode !== undefined ? String(body.kode).trim() : oldKode;

    // Check duplicate code if changed
    if (newKode.toLowerCase() !== oldKode.toLowerCase()) {
      const [dupe] = await pool.query(
        'SELECT id FROM event_categories WHERE LOWER(kode)=? AND category_id_string<>? LIMIT 1',
        [newKode.toLowerCase(), id]
      );
      if (Array.isArray(dupe) && dupe.length) {
        return res.status(409).json({ error: `Kode kategori "${newKode}" sudah digunakan.` });
      }
    }

    // Cascade update: If name or code changed, cascade edit to all associated events!
    if (newName && (newName !== oldName || newKode !== oldKode)) {
      try {
        await pool.query(
          'UPDATE training_proposals SET jenis_event=? WHERE jenis_event=? OR jenis_event=?',
          [newName, oldName, oldKode]
        );
      } catch (cascadeErr) {
        console.warn('[Cascade Update Warning]', cascadeErr);
      }
    }

    await pool.query(
      `UPDATE event_categories SET
       kode=?, nama=?, deskripsi=?, icon=?, warna_hex=?, is_aktif=?, urutan=?, updated_at=CURRENT_TIMESTAMP
       WHERE category_id_string=?`,
      [
        newKode,
        newName,
        body.deskripsi !== undefined ? body.deskripsi : current.deskripsi,
        body.icon ?? current.icon,
        body.warnaHex ?? current.warna_hex,
        body.isAktif !== undefined ? Boolean(body.isAktif) : Boolean(current.is_aktif),
        body.urutan !== undefined ? Number(body.urutan) : Number(current.urutan || 0),
        id,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    const category = Array.isArray(rows) && rows.length ? mapDbEventCategory(rows[0]) : null;
    await addSystemLog('Super Admin', 'superadmin', 'Edit Kategori Event', 'Kategori Event', `Memperbarui kategori "${newName}" (sinkronisasi event berhasil)`);
    return res.json({ success: true, category, item: category });
  } catch (error) {
    console.error('[EventCategories PUT] error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/event-categories/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const pool = await getPool();
    const [rows] = await pool.query('SELECT nama, kode FROM event_categories WHERE category_id_string=? LIMIT 1', [id]);
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ error: 'Kategori event tidak ditemukan.' });
    }

    const oldName = (rows[0] as any).nama;
    const oldKode = (rows[0] as any).kode;

    // Putuskan relasi kategori baru agar tidak menyisakan ID kategori yang sudah dihapus.
    try {
      await pool.query(
        'UPDATE training_proposals SET event_category_id_string=NULL WHERE event_category_id_string=?',
        [id]
      );
    } catch (cascadeErr) {
      console.warn('[Cascade Delete Warning] event_category_id_string:', cascadeErr);
    }

    // Cascade legacy untuk event lama yang masih memakai jenis_event.
    try {
      await pool.query(
        'UPDATE training_proposals SET jenis_event=? WHERE jenis_event=? OR jenis_event=?',
        ['Pelatihan Al-Quran', oldName, oldKode]
      );
    } catch (cascadeErr) {
      console.warn('[Cascade Delete Warning]', cascadeErr);
    }

    await pool.query('DELETE FROM event_categories WHERE category_id_string=?', [id]);
    await addSystemLog('Super Admin', 'superadmin', 'Hapus Kategori Event', 'Kategori Event', `Menghapus kategori "${oldName}"`);
    return res.json({ success: true, message: `Kategori event "${oldName}" berhasil dihapus.`, id });
  } catch (error) {
    console.error('[EventCategories DELETE] error:', error);
    return res.status(500).json({ error: 'Gagal menghapus kategori event.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== COMMUNITIES ========================

app.get('/api/communities', async (req, res) => {
  try {
    const pool = await getPool();
    const params: any[] = [];
    const where: string[] = [];
    if (typeof req.query.category === 'string' && req.query.category) {
      where.push('JSON_CONTAINS(kategori_disabilitas, ?)');
      params.push(JSON.stringify(String(req.query.category)));
    }
    if (typeof req.query.province === 'string' && req.query.province) {
      where.push('LOWER(provinsi)=LOWER(?)');
      params.push(req.query.province);
    }

    let sql = `SELECT qc.*, users.organization_logo AS user_org_logo, COUNT(tp.id) AS activeEventsCount
               FROM quran_communities qc
               LEFT JOIN users ON users.id = qc.user_id
               LEFT JOIN training_proposals tp ON tp.provinsi=qc.provinsi AND tp.is_aktif=1`;
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY qc.id ORDER BY qc.created_at DESC, qc.id DESC`;

    const [rows] = await pool.query(sql, params);
    return res.json({ communities: Array.isArray(rows) ? rows.map(mapDbCommunity) : [] });
  } catch (error) {
    console.error('[Communities GET] error:', error);
    return res.status(500).json({ error: 'Gagal mengambil komunitas dari MySQL.' });
  }
});

app.post('/api/communities', async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.namaLembaga || !body.alamatLengkap || !body.provinsi || !body.kota) {
      return res.status(400).json({ error: 'Nama Lembaga, Alamat, Provinsi, dan Kota wajib diisi' });
    }

    const pool = await getPool();
    let numericUserId: number | null = null;
    const userIdString = body.userId ? String(body.userId) : null;
    if (userIdString) {
      const [uRows] = await pool.query('SELECT id FROM users WHERE user_id_string=? LIMIT 1', [userIdString]);
      if (!Array.isArray(uRows) || !uRows.length) return res.status(400).json({ error: 'Pengguna pemilik komunitas tidak ditemukan.' });
      numericUserId = Number((uRows as any[])[0].id);
    }

    const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO quran_communities
       (community_id_string, user_id, nama_lembaga, kategori_disabilitas, provinsi, kota,
        alamat_lengkap, latitude, longitude, kontak_wa, kontak_email, jumlah_santri,
        fasilitas_tersedia, program_unggulan, deskripsi, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id, numericUserId, String(body.namaLembaga).trim(),
        JSON.stringify(Array.isArray(body.kategoriDisabilitas) ? body.kategoriDisabilitas : []),
        String(body.provinsi), String(body.kota), String(body.alamatLengkap),
        Number(body.latitude || 0), Number(body.longitude || 0),
        String(body.kontakWa || ''), body.kontakEmail || null, Number(body.jumlahSantri || 0),
        JSON.stringify(Array.isArray(body.fasilitasTersedia) ? body.fasilitasTersedia : []),
        String(body.programUnggulan || ''), String(body.deskripsi || '')
      ]
    );
    const [rows] = await pool.query('SELECT * FROM quran_communities WHERE community_id_string=? LIMIT 1', [id]);
    const community = Array.isArray(rows) && rows.length ? mapDbCommunity(rows[0]) : null;
    return res.status(201).json({ success: true, community });
  } catch (error) {
    console.error('[Communities POST] error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan komunitas ke MySQL.', details: error instanceof Error ? error.message : String(error) });
  }
});

// ======================== REPORTS ========================

app.get('/api/reports/summary', async (req, res) => {
  try {
    const pool = await getPool();

    const [statsRows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM training_proposals) AS totalProposals,
        (SELECT COUNT(*) FROM training_proposals WHERE status='disetujui') AS approvedEvents,
        (SELECT COUNT(*) FROM training_proposals WHERE status='menunggu_persetujuan') AS pendingProposals,
        (SELECT COUNT(*) FROM training_proposals WHERE status='ditolak') AS rejectedProposals,
        (SELECT COUNT(*) FROM participants) AS totalParticipants,
        (SELECT COUNT(*) FROM quran_communities) AS totalCommunities,
        (SELECT COUNT(*) FROM users WHERE role='mitra') AS totalMitra,
        (SELECT COUNT(*) FROM users WHERE role='superadmin') AS totalSuperAdmin`
    );
    const statsRow = (statsRows as any[])[0] ?? {};

    const [participantsRows] = await pool.query(
      `SELECT p.*, tp.nama_kegiatan AS eventTitle
       FROM participants p LEFT JOIN training_proposals tp ON tp.proposal_id_string=p.event_id_string
       ORDER BY p.created_at DESC`
    );
    const reportParticipants = Array.isArray(participantsRows) ? participantsRows.map(mapDbParticipant) : [];

    const [eventsRows] = await pool.query(
      `SELECT tp.*, u.name AS mitraName, u.organization_name AS mitraOrg
       FROM training_proposals tp LEFT JOIN users u ON u.id=tp.mitra_id
       ORDER BY tp.created_at DESC`
    );
    const reportEvents = Array.isArray(eventsRows) ? eventsRows.map(mapDbEvent) : [];

    const [communityRows] = await pool.query(`SELECT provinsi, COUNT(*) AS total FROM quran_communities GROUP BY provinsi`);
    const regionBreakdown: Record<string, number> = {};
    for (const row of communityRows as any[]) regionBreakdown[row.provinsi] = Number(row.total);

    const disabilityRows = await pool.query(
      `SELECT kategori_disabilitas, COUNT(*) AS total FROM participants GROUP BY kategori_disabilitas`
    );
    const disabilityCounts: Record<string, number> = {};
    for (const row of disabilityRows[0] as any[]) disabilityCounts[row.kategori_disabilitas] = Number(row.total);

    const funnelStages = {
      totalPendaftar: reportParticipants.length,
      terverifikasi: reportParticipants.filter(p => p.kebutuhanFasilitas.length > 0 || Boolean(p.noWa)).length,
      assessment: reportParticipants.filter(p => p.statusKehadiran !== 'batal').length,
      pelatihanAktif: reportParticipants.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length,
      lulusSertifikasi: reportParticipants.filter(p => p.statusKehadiran === 'hadir').length,
    };

    const stats: SystemStats = {
      totalProposals: Number(statsRow.totalProposals || 0),
      approvedEvents: Number(statsRow.approvedEvents || 0),
      pendingProposals: Number(statsRow.pendingProposals || 0),
      rejectedProposals: Number(statsRow.rejectedProposals || 0),
      totalParticipants: Number(statsRow.totalParticipants || 0),
      totalCommunities: Number(statsRow.totalCommunities || 0),
      totalMitra: Number(statsRow.totalMitra || 0),
      totalSuperAdmin: Number(statsRow.totalSuperAdmin || 0),
    };

    return res.json({ stats, disabilityCounts, funnelStages, regionBreakdown, participants: reportParticipants, events: reportEvents });
  } catch (error) {
    console.error('[Reports Summary] error:', error);
    return res.status(500).json({ error: 'Gagal membuat ringkasan laporan.' });
  }
});

async function ensureInitialPasswords() {
  try {
    const pool = await getPool();
    const initialHash = await bcrypt.hash('password123', 12);
    const [rows] = await pool.query(
      `SELECT user_id_string, password FROM users
       WHERE password IS NULL OR password='' OR password LIKE '%REPLACE_WITH_%' OR password NOT LIKE '$2%'`
    );
    for (const row of rows as any[]) {
      await pool.query('UPDATE users SET password=? WHERE user_id_string=?', [initialHash, row.user_id_string]);
      console.log(`[Auth] Password awal password123 diterapkan ke akun ${row.user_id_string}.`);
    }
  } catch (error) {
    console.error('[Auth] Gagal memeriksa password awal:', error);
  }
}

// ======================== SERVER & VITE INTEGRATION ========================
// ======================== SKEMA TAMBAHAN (revisi) ========================
async function ensureColumn(pool: any, table: string, column: string, ddl: string) {
  const [cols] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  if (!Number((cols as any[])[0]?.n)) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
}

async function ensureRevisionSchema() {
  const pool = await getPool();
  await ensureColumn(pool, 'participants', 'jenis_kelamin', 'varchar(20) NULL');
  await ensureColumn(pool, 'participants', 'alamat', 'text NULL');
  await ensureColumn(pool, 'participants', 'nilai_pretest', 'decimal(5,2) NULL');
  await ensureColumn(pool, 'participants', 'nilai_postest', 'decimal(5,2) NULL');
  await ensureColumn(pool, 'tpq_registrations', 'alamat', 'text NULL');
  await ensureColumn(pool, 'tpq_programs', 'jenis_pendidikan', "varchar(100) NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS bank_soal (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    soal_id_string varchar(50) NOT NULL,
    mitra_id_string varchar(50) DEFAULT NULL,
    event_id_string varchar(50) DEFAULT NULL,
    tipe enum('pretest','postest','latihan') NOT NULL DEFAULT 'latihan',
    pertanyaan text NOT NULL,
    pilihan json NOT NULL,
    jawaban_benar varchar(5) DEFAULT NULL,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY soal_id_string (soal_id_string)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS kosakata_isyarat (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    kata_id_string varchar(50) NOT NULL,
    kata varchar(150) NOT NULL,
    kategori varchar(100) DEFAULT NULL,
    deskripsi text,
    video_url varchar(500) DEFAULT NULL,
    created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY kata_id_string (kata_id_string)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function requireStaff(req: any, res: any) {
  const uid = readSessionUserId(req);
  const user = uid ? await getUserById(uid) : null;
  if (!user) { res.status(401).json({ error: 'Silakan login terlebih dahulu.' }); return null; }
  if (user.role !== 'mitra' && user.role !== 'superadmin') { res.status(403).json({ error: 'Akses ditolak.' }); return null; }
  return user;
}

// Bank soal bersifat terpusat: hanya Super Admin yang boleh membaca/mengelola lewat dashboard.
async function requireSuperadminOnly(req: any, res: any) {
  const user = await requireStaff(req, res);
  if (!user) return null;
  if (user.role !== 'superadmin') { res.status(403).json({ error: 'Bank soal hanya dapat dikelola Super Admin.' }); return null; }
  return user;
}

// ---- Bank Soal ----
app.get('/api/bank-soal', async (req, res) => {
  try {
    const user = await requireSuperadminOnly(req, res); if (!user) return;
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM bank_soal ORDER BY id DESC');
    return res.json({ soal: (rows as any[]).map(r => ({
      id: r.soal_id_string, eventId: r.event_id_string ?? '', tipe: r.tipe, pertanyaan: r.pertanyaan,
      pilihan: jsonParse<string[]>(r.pilihan, []), jawabanBenar: r.jawaban_benar ?? '',
    })) });
  } catch (e) { console.error('[BankSoal GET]', e); return res.status(500).json({ error: 'Gagal mengambil bank soal.' }); }
});

app.post('/api/bank-soal', async (req, res) => {
  try {
    const user = await requireSuperadminOnly(req, res); if (!user) return;
    const b = req.body ?? {};
    const pilihan = Array.isArray(b.pilihan) ? b.pilihan.map((x: any) => String(x).trim()).filter(Boolean) : [];
    if (!String(b.pertanyaan ?? '').trim() || pilihan.length < 2) return res.status(400).json({ error: 'Pertanyaan dan minimal 2 pilihan jawaban wajib diisi.' });
    const tipe = ['pretest', 'postest', 'latihan'].includes(b.tipe) ? b.tipe : 'latihan';
    const jawabanBenar = String(b.jawabanBenar ?? '').trim().toUpperCase();
    if (!/^[A-E]$/.test(jawabanBenar) || jawabanBenar.charCodeAt(0) - 65 >= pilihan.length) return res.status(400).json({ error: 'Pilih jawaban benar yang sesuai dengan pilihan jawaban.' });
    const pool = await getPool();
    const id = `soal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query('INSERT INTO bank_soal (soal_id_string, mitra_id_string, event_id_string, tipe, pertanyaan, pilihan, jawaban_benar) VALUES (?,?,?,?,?,?,?)',
      [id, String(user.id), b.eventId || null, tipe, String(b.pertanyaan).trim(), JSON.stringify(pilihan), jawabanBenar]);
    return res.status(201).json({ success: true, id });
  } catch (e) { console.error('[BankSoal POST]', e); return res.status(500).json({ error: 'Gagal menyimpan soal.' }); }
});

// Impor soal massal (dari file CSV/Excel yang dibaca di browser). Semua baris divalidasi ulang di server;
// soal yang sama (event + jenis + pertanyaan) dilewati, dan penyimpanan memakai transaksi (semua atau tidak sama sekali).
app.post('/api/bank-soal/import', async (req, res) => {
  let conn: any = null;
  try {
    const user = await requireSuperadminOnly(req, res); if (!user) return;
    const b = req.body ?? {};
    const items: any[] = Array.isArray(b.items) ? b.items : [];
    if (items.length === 0) return res.status(400).json({ error: 'Tidak ada soal untuk diimpor.' });
    if (items.length > 500) return res.status(400).json({ error: 'Maksimal 500 soal per impor.' });

    const eventId = b.eventId ? String(b.eventId) : null;
    const pool = await getPool();
    if (eventId) {
      const [ev] = await pool.query('SELECT 1 FROM training_proposals WHERE proposal_id_string = ? LIMIT 1', [eventId]);
      if (!Array.isArray(ev) || ev.length === 0) return res.status(400).json({ error: 'Event yang dipilih tidak ditemukan.' });
    }

    const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();
    const clean: { tipe: string; pertanyaan: string; pilihan: string[]; jawabanBenar: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i] ?? {};
      const row = i + 1;
      const pertanyaan = String(it.pertanyaan ?? '').trim();
      const pilihan = Array.isArray(it.pilihan) ? it.pilihan.map((x: any) => String(x ?? '').trim()) : [];
      const jawabanBenar = String(it.jawabanBenar ?? '').trim().toUpperCase();
      const tipe = ['pretest', 'postest', 'latihan'].includes(it.tipe) ? it.tipe : null;
      if (!pertanyaan || pertanyaan.length > 2000) return res.status(400).json({ error: `Soal ke-${row}: pertanyaan wajib diisi (maksimal 2000 karakter).` });
      if (pilihan.length < 2 || pilihan.length > 5 || pilihan.some(p => !p || p.length > 500)) return res.status(400).json({ error: `Soal ke-${row}: pilihan jawaban harus 2 sampai 5 dan tidak boleh kosong.` });
      if (!/^[A-E]$/.test(jawabanBenar) || jawabanBenar.charCodeAt(0) - 65 >= pilihan.length) return res.status(400).json({ error: `Soal ke-${row}: jawaban benar tidak sesuai dengan pilihan jawaban.` });
      if (!tipe) return res.status(400).json({ error: `Soal ke-${row}: jenis soal harus pretest, postest, atau latihan.` });
      clean.push({ tipe, pertanyaan, pilihan, jawabanBenar });
    }

    // Lewati soal yang sudah ada di database untuk event yang sama, dan duplikat di dalam file.
    const [existingRows] = eventId
      ? await pool.query('SELECT tipe, pertanyaan FROM bank_soal WHERE event_id_string = ?', [eventId])
      : await pool.query("SELECT tipe, pertanyaan FROM bank_soal WHERE event_id_string IS NULL OR event_id_string = ''");
    const seen = new Set((existingRows as any[]).map(r => `${r.tipe}|${normalize(String(r.pertanyaan ?? ''))}`));
    const toInsert = clean.filter(it => {
      const key = `${it.tipe}|${normalize(it.pertanyaan)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (toInsert.length > 0) {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const stamp = Date.now();
      for (let i = 0; i < toInsert.length; i++) {
        const it = toInsert[i];
        const id = `soal_${stamp}_${i}_${Math.random().toString(36).slice(2, 6)}`;
        await conn.query(
          'INSERT INTO bank_soal (soal_id_string, mitra_id_string, event_id_string, tipe, pertanyaan, pilihan, jawaban_benar) VALUES (?,?,?,?,?,?,?)',
          [id, String(user.id), eventId, it.tipe, it.pertanyaan, JSON.stringify(it.pilihan), it.jawabanBenar]
        );
      }
      await conn.commit();
    }

    await addSystemLog('Pengguna', 'system', 'Import Soal', 'bank_soal', `${toInsert.length} soal diimpor ke bank soal (${clean.length - toInsert.length} dilewati karena sudah ada).`, 'success');
    return res.status(201).json({ success: true, inserted: toInsert.length, skipped: clean.length - toInsert.length });
  } catch (e) {
    if (conn) { try { await conn.rollback(); } catch { /* abaikan */ } }
    console.error('[BankSoal IMPORT]', e);
    return res.status(500).json({ error: 'Gagal mengimpor soal.' });
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/bank-soal/:id', async (req, res) => {
  try {
    const user = await requireSuperadminOnly(req, res); if (!user) return;
    const pool = await getPool();
    await pool.query('DELETE FROM bank_soal WHERE soal_id_string=?', [String(req.params.id)]);
    return res.json({ success: true });
  } catch (e) { console.error('[BankSoal DELETE]', e); return res.status(500).json({ error: 'Gagal menghapus soal.' }); }
});

// ---- Test Pretest / Postest untuk peserta (publik, divalidasi lewat email yang terdaftar di event) ----
// Kunci jawaban tidak pernah dikirim ke browser; penilaian dilakukan di server lalu disimpan ke
// participants.nilai_pretest / nilai_postest (kolom yang sama dengan yang tampil di data peserta).
const testHits = new Map<string, { n: number; reset: number }>();
function testRateLimited(req: any, res: any): boolean {
  const key = String(req.ip || 'unknown');
  const now = Date.now();
  if (testHits.size > 5000) testHits.clear();
  const cur = testHits.get(key);
  if (!cur || now > cur.reset) { testHits.set(key, { n: 1, reset: now + 60_000 }); return false; }
  cur.n += 1;
  if (cur.n > 40) { res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam satu menit.' }); return true; }
  return false;
}
const parseTestTipe = (v: unknown): 'pretest' | 'postest' | null => (v === 'pretest' || v === 'postest' ? v : null);
const cleanTestEmail = (v: unknown): string => {
  const e = String(v ?? '').trim().toLowerCase();
  return e.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
};

// Event yang diikuti email ini (tanpa duplikat, tanpa yang batal / event ditolak).
async function getTestRegistrations(pool: any, email: string, tipe: 'pretest' | 'postest') {
  const [rows] = await pool.query(
    `SELECT p.event_id_string, p.nilai_pretest, p.nilai_postest, tp.nama_kegiatan
       FROM participants p
       JOIN training_proposals tp ON tp.proposal_id_string = p.event_id_string
      WHERE LOWER(TRIM(p.email)) = ? AND p.status_kehadiran <> 'batal' AND tp.status <> 'ditolak'
      ORDER BY p.id DESC`, [email]);
  const col = tipe === 'pretest' ? 'nilai_pretest' : 'nilai_postest';
  const byEvent = new Map<string, { eventId: string; namaKegiatan: string; sudahMengerjakan: boolean }>();
  for (const r of rows as any[]) {
    const id = String(r.event_id_string);
    const done = r[col] != null;
    const cur = byEvent.get(id);
    if (!cur) byEvent.set(id, { eventId: id, namaKegiatan: String(r.nama_kegiatan ?? ''), sudahMengerjakan: done });
    else if (done) cur.sudahMengerjakan = true;
  }
  return Array.from(byEvent.values());
}

// Soal khusus event dipakai bila ada; jika tidak ada, dipakai soal umum (tanpa event). Soal tanpa kunci jawaban dilewati.
async function getTestQuestions(pool: any, eventId: string, tipe: 'pretest' | 'postest') {
  const cols = 'soal_id_string, pertanyaan, pilihan, jawaban_benar';
  const keyOk = "jawaban_benar IS NOT NULL AND jawaban_benar <> ''";
  const [specific] = await pool.query(`SELECT ${cols} FROM bank_soal WHERE tipe=? AND event_id_string=? AND ${keyOk} ORDER BY id ASC`, [tipe, eventId]);
  if ((specific as any[]).length) return specific as any[];
  const [general] = await pool.query(`SELECT ${cols} FROM bank_soal WHERE tipe=? AND (event_id_string IS NULL OR event_id_string='') AND ${keyOk} ORDER BY id ASC`, [tipe]);
  return general as any[];
}
const publicSoal = (r: any) => ({ id: r.soal_id_string, pertanyaan: r.pertanyaan, pilihan: jsonParse<string[]>(r.pilihan, []) });

// 1) Validasi email -> daftar event yang diikuti
app.post('/api/test/lookup', async (req, res) => {
  try {
    if (testRateLimited(req, res)) return;
    const tipe = parseTestTipe(req.body?.tipe);
    const email = cleanTestEmail(req.body?.email);
    if (!tipe) return res.status(400).json({ error: 'Jenis test tidak valid.' });
    if (!email) return res.status(400).json({ error: 'Masukkan alamat email yang valid.' });
    const pool = await getPool();
    const events = await getTestRegistrations(pool, email, tipe);
    const withCount = await Promise.all(events.map(async ev => ({ ...ev, jumlahSoal: (await getTestQuestions(pool, ev.eventId, tipe)).length })));
    return res.json({ events: withCount });
  } catch (e) { console.error('[Test lookup]', e); return res.status(500).json({ error: 'Gagal memeriksa email. Coba lagi.' }); }
});

// 2) Ambil soal untuk satu event (tanpa kunci jawaban)
app.post('/api/test/start', async (req, res) => {
  try {
    if (testRateLimited(req, res)) return;
    const tipe = parseTestTipe(req.body?.tipe);
    const email = cleanTestEmail(req.body?.email);
    const eventId = String(req.body?.eventId ?? '');
    if (!tipe || !email || !eventId) return res.status(400).json({ error: 'Data tidak lengkap.' });
    const pool = await getPool();
    const ev = (await getTestRegistrations(pool, email, tipe)).find(x => x.eventId === eventId);
    if (!ev) return res.status(403).json({ error: 'Email ini tidak terdaftar pada event tersebut.' });
    if (ev.sudahMengerjakan) return res.status(409).json({ error: `Anda sudah mengerjakan ${tipe === 'pretest' ? 'pretest' : 'postest'} untuk event ini.` });
    const soal = await getTestQuestions(pool, eventId, tipe);
    if (!soal.length) return res.status(404).json({ error: `Soal ${tipe === 'pretest' ? 'pretest' : 'postest'} untuk event ini belum tersedia.` });
    return res.json({ namaKegiatan: ev.namaKegiatan, soal: soal.map(publicSoal) });
  } catch (e) { console.error('[Test start]', e); return res.status(500).json({ error: 'Gagal memuat soal. Coba lagi.' }); }
});

// 3) Kirim jawaban -> dinilai di server, nilai disimpan ke data peserta (sekali per jenis test)
app.post('/api/test/submit', async (req, res) => {
  try {
    if (testRateLimited(req, res)) return;
    const tipe = parseTestTipe(req.body?.tipe);
    const email = cleanTestEmail(req.body?.email);
    const eventId = String(req.body?.eventId ?? '');
    const jawaban = req.body?.jawaban && typeof req.body.jawaban === 'object' ? req.body.jawaban as Record<string, unknown> : {};
    if (!tipe || !email || !eventId) return res.status(400).json({ error: 'Data tidak lengkap.' });
    const pool = await getPool();
    const ev = (await getTestRegistrations(pool, email, tipe)).find(x => x.eventId === eventId);
    if (!ev) return res.status(403).json({ error: 'Email ini tidak terdaftar pada event tersebut.' });
    if (ev.sudahMengerjakan) return res.status(409).json({ error: 'Test ini sudah pernah dikerjakan.' });
    const soal = await getTestQuestions(pool, eventId, tipe);
    if (!soal.length) return res.status(404).json({ error: 'Soal belum tersedia.' });
    const benar = soal.filter(r => String(jawaban[r.soal_id_string] ?? '').trim().toUpperCase() === String(r.jawaban_benar).trim().toUpperCase()).length;
    const nilai = Math.round((benar / soal.length) * 10000) / 100;
    const col = tipe === 'pretest' ? 'nilai_pretest' : 'nilai_postest';
    const [result] = await pool.query(`UPDATE participants SET ${col}=? WHERE LOWER(TRIM(email))=? AND event_id_string=? AND ${col} IS NULL`, [nilai, email, eventId]);
    if (!(result as any).affectedRows) return res.status(409).json({ error: 'Test ini sudah pernah dikerjakan.' });
    return res.json({ success: true, nilai, benar, total: soal.length });
  } catch (e) { console.error('[Test submit]', e); return res.status(500).json({ error: 'Gagal mengirim jawaban. Coba lagi.' }); }
});

// ---- Kosakata Isyarat Keislaman (publik dibaca, staff mengelola) ----
app.get('/api/kosakata-isyarat', async (_req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM kosakata_isyarat ORDER BY kata ASC');
    return res.json({ kosakata: (rows as any[]).map(r => ({ id: r.kata_id_string, kata: r.kata, kategori: r.kategori ?? '', deskripsi: r.deskripsi ?? '', videoUrl: r.video_url ?? '' })) });
  } catch (e) { console.error('[Kosakata GET]', e); return res.status(500).json({ error: 'Gagal mengambil kosakata isyarat.' }); }
});

app.post('/api/kosakata-isyarat', async (req, res) => {
  try {
    const user = await requireStaff(req, res); if (!user) return;
    const b = req.body ?? {};
    if (!String(b.kata ?? '').trim()) return res.status(400).json({ error: 'Kata wajib diisi.' });
    const videoUrl = String(b.videoUrl ?? '').trim();
    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) return res.status(400).json({ error: 'Tautan video harus diawali http:// atau https://' });
    const pool = await getPool();
    const id = `kata_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await pool.query('INSERT INTO kosakata_isyarat (kata_id_string, kata, kategori, deskripsi, video_url) VALUES (?,?,?,?,?)',
      [id, String(b.kata).trim(), b.kategori || null, b.deskripsi || null, videoUrl || null]);
    return res.status(201).json({ success: true, id });
  } catch (e) { console.error('[Kosakata POST]', e); return res.status(500).json({ error: 'Gagal menyimpan kosakata.' }); }
});

app.delete('/api/kosakata-isyarat/:id', async (req, res) => {
  try {
    const user = await requireStaff(req, res); if (!user) return;
    const pool = await getPool();
    await pool.query('DELETE FROM kosakata_isyarat WHERE kata_id_string=?', [String(req.params.id)]);
    return res.json({ success: true });
  } catch (e) { console.error('[Kosakata DELETE]', e); return res.status(500).json({ error: 'Gagal menghapus kosakata.' }); }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const frontendRoot = path.resolve(process.cwd(), '../frontend');
    const vite = await createViteServer({
      root: frontendRoot,
      configFile: path.join(frontendRoot, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), '../frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await getDbPool();
      await syncAllMitraCommunities();
      await ensureInitialPasswords();
      await ensurePasswordResetTable();
      await ensureRevisionSchema();
      await ensureSiteVisitsTable(await getPool());
      console.log('[MySQL] Database siap dan tersinkronisasi.');
    } catch (err) {
      console.error('[MySQL] Koneksi database gagal:', err);
    }
  });
}

startServer();