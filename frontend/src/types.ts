export type UserRole = 'superadmin' | 'mitra';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  organizationName?: string;
  organizationLogo?: string;
  province?: string;
  city?: string;
  createdAt: string;
  avatar?: string;
  bio?: string;
  isLocked?: boolean;
  isVerified?: boolean;
}

export interface ApplicationSettings {
  applicationName: string;
  logo: string;
  favicon: string;
  topbarColor: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  publicRoleLabel?: string;
  institutionSubtitle?: string;
  logoSize?: string;
  headerBgImage?: string;
  aboutBgImage?: string;
  headerBgOverlay?: 'dark' | 'light' | 'none';
  logoContainerBg?: 'white' | 'transparent' | 'glass';
  updatedAt?: string;
  updatedBy?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: UserRole | 'system' | 'guest';
  action: string;
  module: 'profile' | 'settings' | 'events' | 'disability' | 'participants' | 'auth' | 'system' | 'support' | string;
  details: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

export type DisabilityType =
  | 'tunanetra'
  | 'tunarungu'
  | 'tunadaksa'
  | 'intelektual_autisme'
  | 'pendamping_umum'
  | 'umum'
  | 'multi'
  | string;

export interface EventCategory {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  icon?: string;
  warnaHex?: string;
  isAktif?: boolean;
  urutan?: number;
  eventCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingProposal {
  id: string;
  mitraId: string;
  mitraIdString?: string;
  mitraName: string;
  mitraOrg: string;
  namaKegiatan: string;
  jenisEvent: string;
  /** ID/string referensi kategori event dari master kategori */
  eventCategoryIdString?: string | null;
  eventCategoryId?: string | null;
  /** ID/string referensi jenis disabilitas dari master disabilitas */
  disabilityIdString?: string | null;
  disabilityId?: string | null;
  /** Waktu mulai event, format HH:mm */
  jamMulai?: string | null;
  /** Waktu selesai event, format HH:mm */
  jamSelesai?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  deskripsiPelatihan: string;
  lokasiDanAlamat: string;
  provinsi: string;
  kota: string;
  latitude: number;
  longitude: number;
  tanggalKegiatan: string;
  targetDanKuotaPeserta: number;
  targetPeserta?: string;
  kategoriDisabilitasUtama?: string;
  kategoriDisabilitas?: string;
  metodeBelajar?: string;
  alurSeleksi?: string;
  batasPendaftaran?: string;
  benefit?: string;
  persyaratan?: string;
  batch?: string;
  kebutuhanPeserta: string[];
  status: 'menunggu_persetujuan' | 'disetujui' | 'ditolak';
  alasanPenolakan?: string;
  tanggalPersetujuan?: string;
  linkPendaftaran?: string;
  linkGrupWa?: string;
  kuotaDisetujui?: number;
  isAktif: boolean;
  createdAt: string;
  jumlahPendaftar: number;
  fotoDokumentasi?: string[];
  mitraLogo?: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface TPQProgram {
  id: string;
  mitraId: string;
  mitraName: string;
  mitraOrg: string;
  mitraLogo?: string;
  namaProgram: string;
  jenisTPQ: 'isyarat' | 'braille';
  deskripsiProgram: string;
  tujuanPembelajaran?: string;
  targetPeserta?: string;
  kuotaPeserta: number;
  materiPembelajaran?: string;
  metodePembelajaran?: string;
  kebutuhanFasilitas: string[];
  frekuensiPertemuan?: string;
  durasiProgram?: string;
  fotoDokumentasi?: string[];
  linkGrupWa?: string;
  hariPertemuan: string[];
  jamMulai?: string | null;
  jamSelesai?: string | null;
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  batasPendaftaran?: string | null;
  benefitProgram?: string;
  provinsi: string;
  kota: string;
  lokasiDanAlamat: string;
  latitude: number;
  longitude: number;
  status: 'menunggu_persetujuan' | 'disetujui' | 'ditolak';
  alasanPenolakan?: string;
  isAktif: boolean;
  izinkanPublikasi?: boolean;
  jumlahPendaftar: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DisabilityMaster {
  id: string;
  kode: string;
  nama: string;
  kategoriUtama: 'Sensorik' | 'Fisik' | 'Intelektual & Mental' | 'Ganda' | 'Pendamping';
  deskripsi: string;
  metodePembelajaran: string;
  fasilitasRekomendasi: string[];
  warnaHex: string;
  icon: string;
  isAktif: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  eventTitle?: string;
  namaLengkap: string;
  noWa: string;
  email: string;
  usia: number;
  kategoriDisabilitas: DisabilityType;
  kebutuhanFasilitas: string[];
  catatanKhusus: string;
  statusKehadiran: 'terdaftar' | 'hadir' | 'batal';
  jenisKelamin?: string;
  alamat?: string;
  nilaiPretest?: number | null;
  nilaiPostest?: number | null;
  waktuDaftar: string;
}

export interface QuranCommunity {
  id: string;
  userId?: string | number;
  mitraId?: string;
  namaMitra?: string;
  namaYayasan?: string;
  namaLembaga: string;
  kategoriDisabilitas: DisabilityType[];
  provinsi: string;
  kota: string;
  alamatLengkap: string;
  latitude: number;
  longitude: number;
  kontakWa: string;
  kontakEmail?: string;
  jumlahSantri: number;
  fasilitasTersedia: string[];
  programUnggulan: string;
  deskripsi: string;
  verified: boolean;
  activeEventsCount?: number;
  logo?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemStats {
  totalProposals: number;
  approvedEvents: number;
  pendingProposals: number;
  rejectedProposals: number;
  totalParticipants: number;
  totalCommunities: number;
  totalMitra: number;
  totalSuperAdmin: number;
}