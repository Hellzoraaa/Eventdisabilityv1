import bcrypt from 'bcryptjs';

export interface MockDatabase {
  users: any[];
  disabilities: any[];
  event_categories: any[];
  quran_communities: any[];
  training_proposals: any[];
  participants: any[];
  application_settings: any[];
  system_logs: any[];
}

export function createInitialDatabase(): MockDatabase {
  const defaultPasswordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 1,
        user_id_string: 'usr_superadmin',
        name: 'Ustadz Ahmad Fauzi',
        email: 'admin@quran.id',
        password: defaultPasswordHash,
        role: 'superadmin',
        phone: '081234567890',
        organization_name: 'Kementerian Agama Republik Indonesia',
        province: 'DKI Jakarta',
        city: 'Jakarta Pusat',
        address: 'Jl. Lapangan Banteng Barat No. 3-4',
        avatar: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        user_id_string: 'usr_mitra_1',
        name: 'Nurul Hidayah',
        email: 'mitra1@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '085712345678',
        organization_name: 'Yayasan Sahabat Netra Mengaji',
        organization_logo: '',
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        address: 'Jl. Tebet Barat Raya No. 45',
        avatar: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        user_id_string: 'usr_mitra_2',
        name: 'Budi Prasetyo',
        email: 'mitra2@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '081398765432',
        organization_name: 'Komunitas Tuli Mengaji Nusantara',
        organization_logo: '',
        province: 'Jawa Barat',
        city: 'Bandung',
        address: 'Jl. R.E. Martadinata No. 88',
        avatar: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        user_id_string: 'usr_mitra_3',
        name: 'Ustadzah Fatimah Azzahra',
        email: 'amanahbunda@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '081298761234',
        organization_name: 'Yayasan Amanah Bunda',
        province: 'DKI Jakarta',
        city: 'Jakarta Pusat',
        address: 'Jl. Menteng Raya No. 24',
        avatar: '',
        organization_logo: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        user_id_string: 'usr_mitra_autisme',
        name: 'Ustadz Ridwan Malik, M.Pd',
        email: 'rqautisme.sby@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '082155443322',
        organization_name: 'Rumah Quran Ramah Autisme Surabaya',
        province: 'Jawa Timur',
        city: 'Surabaya',
        address: 'Jl. Raya Darmo Permai II No. 12',
        avatar: '',
        organization_logo: '',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        user_id_string: 'usr_mitra_amanah_peduli',
        name: 'Drs. H. Mulyadi Kartasasmita',
        email: 'amanahpeduli@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '081234599881',
        organization_name: 'Yayasan Amanah Peduli Ummat',
        province: 'Jawa Barat',
        city: 'Bogor',
        address: 'Jl. Raya Tajur No. 88, Bogor',
        avatar: '',
        organization_logo: '/assets/logos/amanah-peduli-ummat.svg',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        user_id_string: 'usr_mitra_amanah_berbagi',
        name: 'Hj. Dewi Sartika, M.Si',
        email: 'amanahberbagi@quran.id',
        password: defaultPasswordHash,
        role: 'mitra',
        phone: '081398877665',
        organization_name: 'amanah BERBAGI',
        province: 'DI Yogyakarta',
        city: 'Yogyakarta',
        address: 'Jl. Kusumanegara No. 42, Umbulharjo',
        avatar: '',
        organization_logo: '/assets/logos/amanah-berbagi.svg',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    disabilities: [
      {
        id: 1,
        disability_id_string: 'dis_tunanetra',
        kode: 'tunanetra',
        nama: 'Tunanetra',
        kategori_utama: 'Sensorik',
        deskripsi: 'Peserta didik dengan hambatan penglihatan.',
        metode_pembelajaran: 'Al-Quran Braille, audio, dan pendampingan membaca.',
        fasilitas_rekomendasi: '["Al-Quran Braille","Audio Al-Quran","Pendamping"]',
        warna_hex: '#005a71',
        icon: 'visibility',
        is_aktif: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        disability_id_string: 'dis_tunarungu',
        kode: 'tunarungu',
        nama: 'Tunarungu',
        kategori_utama: 'Sensorik',
        deskripsi: 'Peserta didik dengan hambatan pendengaran.',
        metode_pembelajaran: 'Bahasa isyarat, visual, dan materi tertulis.',
        fasilitas_rekomendasi: '["Penerjemah Bahasa Isyarat","Materi Visual","Materi Tertulis"]',
        warna_hex: '#2563eb',
        icon: 'ear-off',
        is_aktif: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        disability_id_string: 'dis_tunadaksa',
        kode: 'tunadaksa',
        nama: 'Tunadaksa',
        kategori_utama: 'Fisik',
        deskripsi: 'Peserta didik dengan hambatan mobilitas atau gerak.',
        metode_pembelajaran: 'Pembelajaran aksesibel dan penyesuaian posisi belajar.',
        fasilitas_rekomendasi: '["Ruang Aksesibel","Ramp","Meja Kursi Adaptif"]',
        warna_hex: '#16a34a',
        icon: 'accessibility',
        is_aktif: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        disability_id_string: 'dis_intelektual_autisme',
        kode: 'intelektual_autisme',
        nama: 'Intelektual / Autisme',
        kategori_utama: 'Intelektual',
        deskripsi: 'Peserta didik dengan kebutuhan dukungan intelektual atau spektrum autisme.',
        metode_pembelajaran: 'Pembelajaran bertahap, terstruktur, berulang, dan visual.',
        fasilitas_rekomendasi: '["Media Visual","Pendamping Khusus","Ruang Tenang"]',
        warna_hex: '#d97706',
        icon: 'brain',
        is_aktif: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        disability_id_string: 'dis_umum',
        kode: 'umum',
        nama: 'Kategori Umum / Non-Disabilitas',
        kategori_utama: 'Umum',
        deskripsi: 'Peserta umum, masyarakat luas, relawan pendamping, ustadz/guru, dan pegiat Al-Quran.',
        metode_pembelajaran: 'Tatap muka reguler, pengantar inklusi, pembelajaran interaktif, dan tahsin/tahfidz umum.',
        fasilitas_rekomendasi: '["Mushaf Standar", "Buku Panduan / Modul", "Sertifikat Pelatihan", "Materi Edukasi Inklusi"]',
        warna_hex: '#0284c7',
        icon: 'group',
        is_aktif: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    event_categories: [
      {
        id: 1,
        category_id_string: 'cat_teknologi',
        kode: 'Teknologi',
        nama: 'Teknologi & Digital',
        deskripsi: 'Pelatihan adaptasi perangkat digital, screen reader, dan aplikasi Al-Quran cerdas.',
        icon: 'devices',
        warna_hex: '#0284c7',
        is_aktif: 1,
        urutan: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        category_id_string: 'cat_tahfidz',
        kode: 'Tahfidz',
        nama: 'Tahfidz & Quran',
        deskripsi: 'Program tahfidz dan tahsin Al-Quran Braille, Isyarat, serta stimulasi sensori.',
        icon: 'menu_book',
        warna_hex: '#16a34a',
        is_aktif: 1,
        urutan: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        category_id_string: 'cat_vokasional',
        kode: 'Vokasional',
        nama: 'Kriya & Vokasional',
        deskripsi: 'Keterampilan kemandirian santri, kriya mushaf, kaligrafi taktil, dan wirausaha.',
        icon: 'handyman',
        warna_hex: '#d97706',
        is_aktif: 1,
        urutan: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        category_id_string: 'cat_bahasa',
        kode: 'Bahasa',
        nama: 'Bahasa & Isyarat',
        deskripsi: 'Penguasaan bahasa isyarat Quran (BISINDO/SIBI) dan kaidah linguistik hijaiyah.',
        icon: 'sign_language',
        warna_hex: '#9333ea',
        is_aktif: 1,
        urutan: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        category_id_string: 'cat_umum',
        kode: 'Orang Umum',
        nama: 'Orang Umum / Publik',
        deskripsi: 'Pelatihan terbuka untuk relawan, ustadz/ustadzah, dan masyarakat umum non-disabilitas.',
        icon: 'groups',
        warna_hex: '#475569',
        is_aktif: 1,
        urutan: 5,
        created_at: now,
        updated_at: now,
      },
    ],
    quran_communities: [
      {
        id: 1,
        community_id_string: 'com_1',
        user_id: 2,
        nama_lembaga: 'Yayasan Sahabat Netra Mengaji',
        kategori_disabilitas: '["Tunanetra"]',
        provinsi: 'DKI Jakarta',
        kota: 'Jakarta Selatan',
        alamat_lengkap: 'Jl. Tebet Raya No. 45, Tebet Barat',
        latitude: -6.2341,
        longitude: 106.8524,
        kontak_wa: '085712345678',
        kontak_email: 'sahabatnetra@quran.id',
        jumlah_santri: 85,
        fasilitas_tersedia: '["Al-Quran Braille", "Studio Rekaman Audio", "Asrama Ramah Disabilitas"]',
        program_unggulan: 'Tahfidz Braille Intensif 30 Juz & Pelatihan Guru Netra',
        deskripsi: 'Lembaga pendidikan Islam ramah tunanetra pertama di kawasan Jakarta Selatan dengan bimbingan ustadz berlisensi Braille Kemenag.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        community_id_string: 'com_2',
        user_id: 3,
        nama_lembaga: 'Komunitas Tuli Mengaji Nusantara',
        kategori_disabilitas: '["Tunarungu"]',
        provinsi: 'Jawa Barat',
        kota: 'Bandung',
        alamat_lengkap: 'Jl. R.E. Martadinata No. 88, Citarum',
        latitude: -6.9034,
        longitude: 107.6186,
        kontak_wa: '081398765432',
        kontak_email: 'tulimengaji@quran.id',
        jumlah_santri: 120,
        fasilitas_tersedia: '["Penerjemah Bahasa Isyarat", "Layar Interaktif Proyektor", "Mushaf Isyarat Standar Kemenag"]',
        program_unggulan: 'Belajar Makhorijul Huruf & Terjemahan Isyarat Tematik',
        deskripsi: 'Komunitas pembinaan literasi Al-Quran berbahasa isyarat bagi teman tuli usia anak hingga dewasa se-Bandung Raya.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        community_id_string: 'com_3',
        user_id: null,
        nama_lembaga: 'Pesantren Tahfidz Inklusif Al-Basyir',
        kategori_disabilitas: '["Tunadaksa", "Tunanetra"]',
        provinsi: 'DI Yogyakarta',
        kota: 'Yogyakarta',
        alamat_lengkap: 'Jl. Kaliurang Km 9.3, Ngaglik, Sleman',
        latitude: -7.7312,
        longitude: 110.3921,
        kontak_wa: '081290887766',
        kontak_email: 'albasyir.jogja@quran.id',
        jumlah_santri: 60,
        fasilitas_tersedia: '["Ramp Kursi Roda", "Kamar Mandi Difabel", "Meja Baca Elektrik"]',
        program_unggulan: 'Kaderisasi Da\'i dan Penghafal Quran Difabel Mandiri',
        deskripsi: 'Pusat pendidikan tahfidz Al-Quran yang 100% bebas hambatan arsitektur dan fasilitas untuk santri pengguna kursi roda.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        community_id_string: 'com_4',
        user_id: null,
        nama_lembaga: 'Rumah Quran Ramah Autisme Surabaya',
        kategori_disabilitas: '["Intelektual / Autisme"]',
        provinsi: 'Jawa Timur',
        kota: 'Surabaya',
        alamat_lengkap: 'Jl. Raya Darmo Permai II No. 12',
        latitude: -7.2721,
        longitude: 112.6953,
        kontak_wa: '082155443322',
        kontak_email: 'rqautisme.sby@quran.id',
        jumlah_santri: 45,
        fasilitas_tersedia: '["Ruang Tenang Sensori", "Kartu Flashcard Hijaiyah", "Terapis Perilaku"]',
        program_unggulan: 'Metode Pembelajaran Quran Visual Terstruktur (TEACCH)',
        deskripsi: 'Membantu anak-anak dalam spektrum autisme menghafal surat-surat pendek dan melantunkan ayat suci dengan penuh ketenangan.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        community_id_string: 'com_5',
        user_id: 4,
        nama_lembaga: 'Yayasan Amanah Bunda',
        kategori_disabilitas: '["Tunanetra", "Tunadaksa"]',
        provinsi: 'DKI Jakarta',
        kota: 'Jakarta Pusat',
        alamat_lengkap: 'Jl. Menteng Raya No. 24, Kebon Sirih, Jakarta Pusat',
        latitude: -6.1856,
        longitude: 106.8361,
        kontak_wa: '081298761234',
        kontak_email: 'amanahbunda@quran.id',
        jumlah_santri: 85,
        fasilitas_tersedia: '["Al-Quran Braille Standar Kemenag", "Audio Pembelajaran Mandiri", "Akses Ramp & Ruang Ramah Disabilitas"]',
        program_unggulan: 'Tahfidz Quran Braille & Bimbingan Keluarga Ramah Anak Difabel',
        deskripsi: 'Lembaga sosial dan dakwah inklusif yang berdedikasi membina literasi Al-Quran bagi santri tunanetra dan anak berkebutuhan khusus sejak 2018.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        community_id_string: 'com_6',
        user_id: null,
        nama_lembaga: 'Pusat Literasi Quran Nusantara (Umum & Inklusi)',
        kategori_disabilitas: '["Umum", "Tunanetra", "Tunarungu"]',
        provinsi: 'Jawa Barat',
        kota: 'Bogor',
        alamat_lengkap: 'Jl. Pajajaran No. 102, Bogor Timur',
        latitude: -6.6012,
        longitude: 106.8054,
        kontak_wa: '081122334455',
        kontak_email: 'literasiquran@kemenag.go.id',
        jumlah_santri: 150,
        fasilitas_tersedia: '["Mushaf Standar & Braille", "Studio Audio", "Auditorium Ramah Akses"]',
        program_unggulan: 'Daurah Tahsin Terbuka untuk Umum & Pelatihan Guru Quran Inklusif',
        deskripsi: 'Sentra pembelajaran Al-Quran terbuka untuk masyarakat luas, mahasiswa, relawan, sekaligus menyelenggarakan program pembelajaran inklusif bagi sahabat disabilitas.',
        is_verified: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    training_proposals: [
      {
        id: 1,
        proposal_id_string: 'ev_001',
        mitra_id: 5,
        mitra_id_string: 'usr_mitra_autisme',
        mitra_org: 'Rumah Quran Ramah Autisme Surabaya',
        mitraName: 'Ustadz Ridwan Malik, M.Pd',
        nama_kegiatan: 'Pelatihan Membaca Al-Quran Braille Tingkat Pemula',
        jenis_event: 'Pelatihan Al-Quran',
        deskripsi_pelatihan: 'Pelatihan intensif membaca Al-Quran Braille standar Kementerian Agama yang diselenggarakan oleh Rumah Quran Ramah Autisme Surabaya bagi santri disabilitas, dilengkapi bimbingan modul Braille dan stimulasi sensori inklusif.',
        lokasi_dan_alamat: 'Sentra Belajar Rumah Quran Ramah Autisme, Jl. Raya Darmo Permai II No. 12',
        provinsi: 'Jawa Timur',
        kota: 'Surabaya',
        latitude: -7.2721,
        longitude: 112.6953,
        tanggal_kegiatan: '2026-10-15',
        target_dan_kuota_peserta: 30,
        kuota_disetujui: 30,
        kebutuhan_peserta: '["Al-Quran Braille", "Tongkat Penunjuk", "Pendamping Acara"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_001',
        is_aktif: 1,
        jumlah_pendaftar: 24,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        proposal_id_string: 'ev_002',
        mitra_id: 3,
        mitra_id_string: 'usr_mitra_2',
        nama_kegiatan: 'Workshop Tilawah & Tahsin Bahasa Isyarat Quran',
        jenis_event: 'Workshop & Sertifikasi',
        deskripsi_pelatihan: 'Pelatihan kaidah tajwid visual dan pelafalan huruf hijaiyah melalui bahasa isyarat baku Indonesia bersama ustadz pembina tuli nasional.',
        lokasi_dan_alamat: 'Islamic Center Kota Bandung, Jl. R.E. Martadinata',
        provinsi: 'Jawa Barat',
        kota: 'Bandung',
        latitude: -6.9034,
        longitude: 107.6186,
        tanggal_kegiatan: '2026-10-22',
        target_dan_kuota_peserta: 40,
        kuota_disetujui: 40,
        kebutuhan_peserta: '["Penerjemah Isyarat", "Buku Tajwid Visual", "Snack Ramah Alergi"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_002',
        is_aktif: 1,
        jumlah_pendaftar: 35,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        proposal_id_string: 'ev_003',
        mitra_id: 2,
        mitra_id_string: 'usr_mitra_1',
        nama_kegiatan: 'Daurah Menghafal Al-Quran Ramah Tunadaksa',
        jenis_event: 'Daurah Tahfidz',
        deskripsi_pelatihan: 'Program karantina tahfidz Juz 30 khusus sahabat daksa dengan bimbingan personal dan fasilitas ruangan 100% ramah kursi roda.',
        lokasi_dan_alamat: 'Pondok Pesantren Al-Basyir Sleman, Yogyakarta',
        provinsi: 'DI Yogyakarta',
        kota: 'Yogyakarta',
        latitude: -7.7312,
        longitude: 110.3921,
        tanggal_kegiatan: '2026-11-05',
        target_dan_kuota_peserta: 25,
        kuota_disetujui: 25,
        kebutuhan_peserta: '["Ruang Aksesibel", "Ramp", "Tempat Wudhu Duduk"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_003',
        is_aktif: 1,
        jumlah_pendaftar: 18,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        proposal_id_string: 'ev_004',
        mitra_id: 3,
        mitra_id_string: 'usr_mitra_2',
        mitra_org: 'Majelis Quran Tuli & Inklusi Al-Fattah',
        mitraName: 'Ustadzah Fatimah Azzahra',
        nama_kegiatan: 'Pelatihan Pengajar Quran Inklusif & Komunitas (Umum / Non-Disabilitas)',
        jenis_event: 'Pelatihan Pengajar & Umum',
        deskripsi_pelatihan: 'Training of Trainers bagi para ustadz, relawan, dan santri umum non-disabilitas untuk menguasai metode dakwah dan pendampingan Al-Quran ramah disabilitas.',
        lokasi_dan_alamat: 'Gedung Balai Diklat Keagamaan Surabaya, Jl. Ketintang No. 45',
        provinsi: 'Jawa Timur',
        kota: 'Surabaya',
        latitude: -7.3150,
        longitude: 112.7280,
        tanggal_kegiatan: '2026-11-18',
        target_dan_kuota_peserta: 50,
        kuota_disetujui: 50,
        kebutuhan_peserta: '["Modul Pengajaran Inklusif", "Sertifikat Kemenag", "Buku Panduan Relawan"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_004',
        is_aktif: 1,
        jumlah_pendaftar: 42,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        proposal_id_string: 'ev_005',
        mitra_id: 4,
        mitra_id_string: 'usr_mitra_3',
        nama_kegiatan: 'Pelatihan Tahfidz Al-Quran Braille Tingkat Dasar - Sahabat Tunanetra',
        jenis_event: 'Tahsin & Tahfidz Braille',
        deskripsi_pelatihan: 'Program pembelajaran intensif membaca dan menghafal Al-Quran Braille Juz 30 khusus sahabat tunanetra bersama Yayasan Amanah Bunda. Dilengkapi mushaf Braille resmi Kementerian Agama, audio makhorijul huruf, dan sertifikat kelulusan resmi.',
        lokasi_dan_alamat: 'Pusat Diklat Inklusi Yayasan Amanah Bunda, Jl. Menteng Raya No. 24, Jakarta Pusat',
        provinsi: 'DKI Jakarta',
        kota: 'Jakarta Pusat',
        latitude: -6.1856,
        longitude: 106.8361,
        tanggal_kegiatan: '29 Juni – 31 Desember 2026',
        target_dan_kuota_peserta: 35,
        kuota_disetujui: 35,
        kebutuhan_peserta: '["Al-Quran Braille", "Tongkat Adaptif", "Pendamping Acara", "Makan Siang Ramah Alergi"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_005',
        is_aktif: 1,
        jumlah_pendaftar: 28,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        proposal_id_string: 'ev_006',
        mitra_id: 5,
        mitra_id_string: 'usr_mitra_autisme',
        mitra_org: 'Rumah Quran Ramah Autisme Surabaya',
        mitraName: 'Ustadz Ridwan Malik, M.Pd',
        nama_kegiatan: 'Daurah Tahsin & Tilawah Al-Quran Komunitas (Umum / Non-Disabilitas)',
        jenis_event: 'Daurah Tahsin Umum',
        deskripsi_pelatihan: 'Program pembelajaran tahsin dan talaqqi Al-Quran terbuka untuk masyarakat umum, pemuda masjid, dan relawan non-disabilitas.',
        lokasi_dan_alamat: 'Islamic Center Semarang, Jl. Abdul Rahman Saleh No. 285',
        provinsi: 'Jawa Tengah',
        kota: 'Semarang',
        latitude: -6.9932,
        longitude: 110.3845,
        tanggal_kegiatan: '2026-12-05',
        target_dan_kuota_peserta: 60,
        kuota_disetujui: 60,
        kebutuhan_peserta: '["Mushaf Standar Kemenag", "Buku Tajwid Syafii", "Sertifikat"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_006',
        is_aktif: 1,
        jumlah_pendaftar: 38,
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        proposal_id_string: 'ev_007',
        mitra_id: 3,
        mitra_id_string: 'usr_mitra_2',
        mitra_org: 'Majelis Quran Tuli & Inklusi Al-Fattah',
        mitraName: 'Ustadzah Fatimah Azzahra',
        nama_kegiatan: 'Daurah Al-Quran Bahasa Isyarat & Tajwid Tunarungu',
        jenis_event: 'Pelatihan Quran Tunarungu',
        deskripsi_pelatihan: 'Bimbingan intensif membaca Al-Quran dengan bahasa isyarat hijaiyah dan pengenalan tajwid visual untuk sahabat tuli dan tunarungu.',
        lokasi_dan_alamat: 'Masjid Raya Al-Mashun, Jl. Mahkamah No. 74, Medan',
        provinsi: 'Sumatera Utara',
        kota: 'Medan',
        latitude: 3.5752,
        longitude: 98.6872,
        tanggal_kegiatan: '2026-12-12',
        target_dan_kuota_peserta: 35,
        kuota_disetujui: 35,
        kebutuhan_peserta: '["Juru Bahasa Isyarat", "Video Pembelajaran Visual", "Kamus Isyarat"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_007',
        is_aktif: 1,
        jumlah_pendaftar: 29,
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        proposal_id_string: 'ev_008',
        mitra_id: 6,
        mitra_id_string: 'usr_mitra_amanah_peduli',
        mitra_org: 'Yayasan Amanah Peduli Ummat',
        mitraName: 'Drs. H. Mulyadi Kartasasmita',
        mitra_logo: '/assets/logos/amanah-peduli-ummat.svg',
        logo_url: '/assets/logos/amanah-peduli-ummat.svg',
        nama_kegiatan: 'Pelatihan Al-Quran & Teknologi Digital Cerdas Disabilitas',
        jenis_event: 'Teknologi & Digital',
        deskripsi_pelatihan: 'Pelatihan adaptasi perangkat screen reader, Al-Quran digital berbasis audio cerdas, dan teknologi bantuan literasi Al-Quran untuk kemandirian santri.',
        lokasi_dan_alamat: 'Aula Utama Yayasan Amanah Peduli Ummat, Jl. Raya Tajur No. 88, Bogor',
        provinsi: 'Jawa Barat',
        kota: 'Bogor',
        latitude: -6.6212,
        longitude: 106.8291,
        tanggal_kegiatan: '2026-11-20',
        target_dan_kuota_peserta: 40,
        kuota_disetujui: 40,
        kebutuhan_peserta: '["Laptop/Smartphone", "Aplikasi Screen Reader", "Headset Inklusif"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_008',
        is_aktif: 1,
        is_verified: 1,
        is_mitra_resmi: 1,
        jumlah_pendaftar: 28,
        created_at: now,
        updated_at: now,
      },
      {
        id: 9,
        proposal_id_string: 'ev_009',
        mitra_id: 7,
        mitra_id_string: 'usr_mitra_amanah_berbagi',
        mitra_org: 'amanah BERBAGI',
        mitraName: 'Hj. Dewi Sartika, M.Si',
        mitra_logo: '/assets/logos/amanah-berbagi.svg',
        logo_url: '/assets/logos/amanah-berbagi.svg',
        nama_kegiatan: 'Kriya & Vokasional Santri Quran Mandiri Berdaya',
        jenis_event: 'Kriya & Vokasional',
        deskripsi_pelatihan: 'Pemberdayaan vokasional kreatif santri difabel: kaligrafi taktil timbul, kerajinan kemasan mushaf, dan wirausaha mandiri berkah bersama mitra resmi Kemenag.',
        lokasi_dan_alamat: 'Sentra Karya amanah BERBAGI, Jl. Kusumanegara No. 42, Yogyakarta',
        provinsi: 'DI Yogyakarta',
        kota: 'Yogyakarta',
        latitude: -7.8012,
        longitude: 110.3892,
        tanggal_kegiatan: '2026-12-01',
        target_dan_kuota_peserta: 35,
        kuota_disetujui: 35,
        kebutuhan_peserta: '["Bahan Kaligrafi Taktil", "Modul Wirausaha", "Pendamping Praktik"]',
        status: 'disetujui',
        alasan_penolakan: null,
        tanggal_persetujuan: now,
        link_pendaftaran: '/register/ev_009',
        is_aktif: 1,
        is_verified: 1,
        is_mitra_resmi: 1,
        jumlah_pendaftar: 31,
        created_at: now,
        updated_at: now,
      },
    ],
    participants: [
      {
        id: 1,
        participant_id_string: 'part_001',
        event_id_string: 'ev_001',
        nama_lengkap: 'Hendra Setiawan',
        no_wa: '08123445566',
        email: 'hendra.s@gmail.com',
        usia: 24,
        kategori_disabilitas: 'Tunanetra',
        kebutuhan_fasilitas: '["Al-Quran Braille", "Pendamping"]',
        catatan_khusus: 'Menggunakan tongkat putih mandiri',
        status_kehadiran: 'terdaftar',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        participant_id_string: 'part_002',
        event_id_string: 'ev_001',
        nama_lengkap: 'Siti Aminah',
        no_wa: '08139988776',
        email: 'aminah.siti@gmail.com',
        usia: 19,
        kategori_disabilitas: 'Tunanetra',
        kebutuhan_fasilitas: '["Al-Quran Braille"]',
        catatan_khusus: 'Sudah hafal 2 juz dengan audio',
        status_kehadiran: 'hadir',
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        participant_id_string: 'part_003',
        event_id_string: 'ev_002',
        nama_lengkap: 'Rian Pratama',
        no_wa: '08571122334',
        email: 'rian.pratama@gmail.com',
        usia: 22,
        kategori_disabilitas: 'Tunarungu',
        kebutuhan_fasilitas: '["Penerjemah Bahasa Isyarat"]',
        catatan_khusus: 'Fasih dengan BISINDO',
        status_kehadiran: 'terdaftar',
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        participant_id_string: 'part_004',
        event_id_string: 'ev_004',
        nama_lengkap: 'Fajar Nugraha',
        no_wa: '08128899001',
        email: 'fajar.nugraha@gmail.com',
        usia: 28,
        kategori_disabilitas: 'umum',
        kebutuhan_fasilitas: '["Modul Panduan Guru", "Sertifikat"]',
        catatan_khusus: 'Ustadz dan relawan pengajar Al-Quran umum',
        status_kehadiran: 'terdaftar',
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        participant_id_string: 'part_005',
        event_id_string: 'ev_006',
        nama_lengkap: 'Dewi Lestari',
        no_wa: '08567788990',
        email: 'dewi.lestari@gmail.com',
        usia: 26,
        kategori_disabilitas: 'umum',
        kebutuhan_fasilitas: '["Mushaf Standar Kemenag", "Buku Tajwid"]',
        catatan_khusus: 'Masyarakat umum / pemuda pengajian',
        status_kehadiran: 'hadir',
        created_at: now,
        updated_at: now,
      },
    ],
    application_settings: [
      {
        id: 1,
        setting_key: 'global_config',
        application_name: 'Al-Quran Disabilitas',
        logo: '/logo-quran.svg',
        favicon: '/favicon.svg',
        topbar_color: '#005a71',
        primary_color: '#005a71',
        secondary_color: '#ab3425',
        accent_color: '#d97706',
        public_role_label: 'Peserta',
        institution_subtitle: 'Kementerian Agama Republik Indonesia',
        logo_size: 'large',
        header_bg_image: '',
        header_bg_overlay: 'dark',
        logo_container_bg: 'white',
        updated_by: 'Super Administrator',
        updated_at: now,
      },
    ],
    system_logs: [
      {
        id: 1,
        log_id_string: 'log_init_001',
        timestamp: now,
        user: 'Sistem Inisialisasi',
        user_role: 'system',
        action: 'Boot Data Master',
        module: 'system',
        details: 'Data awal Master Disabilitas dan Komunitas Quran berhasil dimuat.',
        status: 'success',
      },
    ],
  };
}

let dbInstance: MockDatabase | null = null;

export function getMockDb(): MockDatabase {
  if (!dbInstance) {
    dbInstance = createInitialDatabase();
  }
  return dbInstance;
}

/**
 * Universal Mock Pool Query Handler
 * Intercepts MySQL queries and handles them in-memory
 */
export async function executeMockQuery(sql: string, params: any[] = []): Promise<[any[], any]> {
  const db = getMockDb();
  const normalized = sql.trim().replace(/\s+/g, ' ');

  // 1. SYSTEM LOGS
  if (/INSERT INTO system_logs/i.test(normalized)) {
    const logItem = {
      id: db.system_logs.length + 1,
      log_id_string: params[0] || `log_${Date.now()}`,
      user: params[1] || 'Sistem',
      user_role: params[2] || 'system',
      action: params[3] || '',
      module: params[4] || '',
      details: params[5] || '',
      status: params[6] || 'info',
      timestamp: new Date().toISOString(),
    };
    db.system_logs.unshift(logItem);
    return [[{ insertId: logItem.id, affectedRows: 1 }], {}];
  }

  if (/SELECT.*FROM system_logs/i.test(normalized)) {
    return [[...db.system_logs], {}];
  }

  // 2. USERS
  if (/SELECT.*FROM users WHERE LOWER\(email\)\s*=\s*\?/i.test(normalized)) {
    const email = String(params[0] || '').toLowerCase().trim();
    const excludeId = params.length > 1 && params[1] !== undefined ? String(params[1]) : null;
    let found = db.users.filter((u) => u.email.toLowerCase() === email);
    if (excludeId) {
      found = found.filter((u) => u.user_id_string !== excludeId && String(u.id) !== excludeId);
    }
    return [found, {}];
  }

  if (/SELECT.*FROM users WHERE.*user_id_string/i.test(normalized)) {
    const id = String(params[0] || '');
    const found = db.users.filter((u) => u.user_id_string === id || String(u.id) === id);
    return [found, {}];
  }

  if (/SELECT COUNT\(\*\) AS total FROM users WHERE role\s*=\s*'superadmin'/i.test(normalized)) {
    const count = db.users.filter((u) => u.role === 'superadmin').length;
    return [[{ total: count }], {}];
  }

  if (/SELECT.*FROM users WHERE password IS NULL/i.test(normalized)) {
    return [[], {}];
  }

  if (/SELECT.*FROM users/i.test(normalized)) {
    let result = [...db.users];
    if (/WHERE role\s*=\s*\?/i.test(normalized) && params[0]) {
      result = result.filter((u) => u.role === params[0]);
    }
    return [result, {}];
  }

  if (/INSERT INTO users/i.test(normalized)) {
    const hasOrgLogo = /organization_logo/i.test(normalized);
    const newUser = {
      id: db.users.length + 1,
      user_id_string: params[0],
      name: params[1],
      email: params[2],
      password: params[3],
      role: params[4] || 'mitra',
      phone: params[5] || '',
      organization_name: params[6] || '',
      organization_logo: hasOrgLogo ? (params[7] || '') : '',
      province: hasOrgLogo ? (params[8] || '') : (params[7] || ''),
      city: hasOrgLogo ? (params[9] || '') : (params[8] || ''),
      avatar: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);
    return [[{ insertId: newUser.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE users SET password/i.test(normalized)) {
    const hash = params[0];
    const userId = params[1];
    const u = db.users.find((x) => x.user_id_string === userId);
    if (u) {
      u.password = hash;
      u.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: u ? 1 : 0 }], {}];
  }

  if (/UPDATE users SET organization_logo\s*=\s*\?/i.test(normalized)) {
    const logo = params[0] !== undefined ? params[0] : '';
    const userId = params[1];
    const u = db.users.find((x) => x.user_id_string === userId || String(x.id) === String(userId));
    if (u) {
      u.organization_logo = logo;
      u.updated_at = new Date().toISOString();
      db.training_proposals.forEach((tp) => {
        if (tp.mitra_id_string === userId || tp.mitra_org === u.organization_name) {
          tp.mitra_logo = logo;
        }
      });
      db.quran_communities.forEach((qc) => {
        if (qc.user_id === u.id || qc.nama_lembaga === u.organization_name) {
          qc.logo = logo;
        }
      });
    }
    return [[{ affectedRows: u ? 1 : 0 }], {}];
  }

  if (/UPDATE users SET name=/i.test(normalized) || /UPDATE users SET.*organization_logo/i.test(normalized)) {
    const userId = String(params[params.length - 1]);
    const u = db.users.find((x) => x.user_id_string === userId || String(x.id) === userId);
    if (u) {
      if (/organization_logo/i.test(normalized)) {
        // [name, email, phone, organizationName, organizationLogo, province, city, role, avatar, id]
        u.name = params[0] !== undefined ? params[0] : u.name;
        u.email = params[1] !== undefined ? params[1] : u.email;
        u.phone = params[2] !== undefined ? params[2] : u.phone;
        u.organization_name = params[3] !== undefined ? params[3] : u.organization_name;
        u.organization_logo = params[4] !== undefined ? params[4] : u.organization_logo;
        u.province = params[5] !== undefined ? params[5] : u.province;
        u.city = params[6] !== undefined ? params[6] : u.city;
        u.role = params[7] !== undefined ? params[7] : u.role;
        u.avatar = params[8] !== undefined ? params[8] : u.avatar;
      } else {
        u.name = params[0];
        u.email = params[1];
        u.phone = params[2];
        u.organization_name = params[3];
        u.province = params[4];
        u.city = params[5];
        u.role = params[6];
        u.avatar = params[7];
      }
      u.updated_at = new Date().toISOString();

      if (u.organization_logo !== undefined) {
        db.training_proposals.forEach((tp) => {
          if (tp.mitra_id_string === userId || tp.mitra_id_string === u.user_id_string || tp.mitra_org === u.organization_name) {
            tp.mitra_logo = u.organization_logo || '';
          }
        });
        db.quran_communities.forEach((qc) => {
          if (qc.user_id === u.id || qc.nama_lembaga === u.organization_name) {
            qc.logo = u.organization_logo || '';
          }
        });
      }
    }
    return [[{ affectedRows: u ? 1 : 0 }], {}];
  }

  if (/DELETE FROM users WHERE user_id_string\s*=\s*\?/i.test(normalized)) {
    const userId = String(params[0]);
    const idx = db.users.findIndex((x) => x.user_id_string === userId || String(x.id) === userId);
    if (idx !== -1) db.users.splice(idx, 1);
    return [[{ affectedRows: idx !== -1 ? 1 : 0 }], {}];
  }

  // 3. APPLICATION SETTINGS
  if (/SELECT.*FROM application_settings WHERE setting_key\s*=\s*'global_config'/i.test(normalized)) {
    return [db.application_settings, {}];
  }

  if (/INSERT INTO application_settings/i.test(normalized) || /UPDATE application_settings/i.test(normalized)) {
    const setting = db.application_settings[0] || {};
    setting.application_name = params[0] ?? setting.application_name;
    setting.logo = params[1] ?? setting.logo;
    setting.favicon = params[2] ?? setting.favicon;
    setting.topbar_color = params[3] ?? setting.topbar_color;
    setting.primary_color = params[4] ?? setting.primary_color;
    setting.secondary_color = params[5] ?? setting.secondary_color;
    setting.accent_color = params[6] ?? setting.accent_color;
    setting.public_role_label = params[7] ?? setting.public_role_label;
    setting.institution_subtitle = params[8] ?? setting.institution_subtitle;
    setting.logo_size = params[9] ?? setting.logo_size;
    setting.header_bg_image = params[10] ?? setting.header_bg_image;
    setting.header_bg_overlay = params[11] ?? setting.header_bg_overlay;
    setting.logo_container_bg = params[12] ?? setting.logo_container_bg;
    setting.updated_by = params[13] ?? setting.updated_by;
    setting.updated_at = new Date().toISOString();
    db.application_settings[0] = setting;
    return [[{ affectedRows: 1 }], {}];
  }

  // 4. DISABILITIES MASTER
  if (/SELECT.*FROM disabilities/i.test(normalized)) {
    if (/WHERE disability_id_string\s*=\s*\?/i.test(normalized)) {
      return [db.disabilities.filter((d) => d.disability_id_string === params[0]), {}];
    }
    if (/WHERE kode\s*=\s*\?/i.test(normalized)) {
      return [db.disabilities.filter((d) => d.kode === params[0]), {}];
    }
    return [[...db.disabilities], {}];
  }

  if (/INSERT INTO disabilities/i.test(normalized)) {
    const item = {
      id: db.disabilities.length + 1,
      disability_id_string: params[0],
      kode: params[1],
      nama: params[2],
      kategori_utama: params[3],
      deskripsi: params[4],
      metode_pembelajaran: params[5],
      fasilitas_rekomendasi: typeof params[6] === 'string' ? params[6] : JSON.stringify(params[6]),
      warna_hex: params[7],
      icon: params[8],
      is_aktif: params[9] ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.disabilities.push(item);
    return [[{ insertId: item.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE disabilities SET/i.test(normalized)) {
    const id = params[params.length - 1];
    const item = db.disabilities.find((d) => d.disability_id_string === id);
    if (item) {
      item.kode = params[0];
      item.nama = params[1];
      item.kategori_utama = params[2];
      item.deskripsi = params[3];
      item.metode_pembelajaran = params[4];
      item.fasilitas_rekomendasi = typeof params[5] === 'string' ? params[5] : JSON.stringify(params[5]);
      item.warna_hex = params[6];
      item.icon = params[7];
      item.is_aktif = params[8] ? 1 : 0;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/DELETE FROM disabilities/i.test(normalized)) {
    const id = params[0];
    const idx = db.disabilities.findIndex((d) => d.disability_id_string === id);
    if (idx !== -1) db.disabilities.splice(idx, 1);
    return [[{ affectedRows: idx !== -1 ? 1 : 0 }], {}];
  }

  // 4b. EVENT CATEGORIES (Kategori Event Pelatihan Homepage)
  if (/SELECT.*FROM event_categories/i.test(normalized)) {
    if (/WHERE category_id_string\s*=\s*\?/i.test(normalized)) {
      return [db.event_categories.filter((c) => c.category_id_string === params[0]), {}];
    }
    if (/WHERE LOWER\(kode\)\s*=\s*\?/i.test(normalized) || /WHERE kode\s*=\s*\?/i.test(normalized)) {
      const q = String(params[0]).toLowerCase();
      return [db.event_categories.filter((c) => c.kode.toLowerCase() === q), {}];
    }
    return [[...db.event_categories], {}];
  }

  if (/INSERT INTO event_categories/i.test(normalized)) {
    const item = {
      id: db.event_categories.length + 1,
      category_id_string: params[0],
      kode: params[1],
      nama: params[2],
      deskripsi: params[3] || '',
      icon: params[4] || 'category',
      warna_hex: params[5] || '#0284c7',
      is_aktif: params[6] ? 1 : 0,
      urutan: Number(params[7] || db.event_categories.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.event_categories.push(item);
    return [[{ insertId: item.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE event_categories SET/i.test(normalized)) {
    const id = params[params.length - 1];
    const item = db.event_categories.find((c) => c.category_id_string === id);
    if (item) {
      item.kode = params[0];
      item.nama = params[1];
      item.deskripsi = params[2];
      item.icon = params[3];
      item.warna_hex = params[4];
      item.is_aktif = params[5] ? 1 : 0;
      item.urutan = Number(params[6] || item.urutan || 0);
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/DELETE FROM event_categories/i.test(normalized)) {
    const id = params[0];
    const idx = db.event_categories.findIndex((c) => c.category_id_string === id);
    if (idx !== -1) db.event_categories.splice(idx, 1);
    return [[{ affectedRows: idx !== -1 ? 1 : 0 }], {}];
  }

  // 5. QURAN COMMUNITIES (Peta Quran Disabilitas)
  if (/SELECT.*FROM quran_communities/i.test(normalized)) {
    if (/WHERE community_id_string\s*=\s*\?/i.test(normalized)) {
      return [db.quran_communities.filter((c) => c.community_id_string === params[0]), {}];
    }
    const commsWithUserLogo = db.quran_communities.map((c) => {
      const u = db.users.find((user) => user.id === c.user_id || user.organization_name === c.nama_lembaga);
      return {
        ...c,
        user_org_logo: u?.organization_logo || (c as any).logo || '',
      };
    });
    return [commsWithUserLogo, {}];
  }

  if (/INSERT INTO quran_communities/i.test(normalized)) {
    // server.ts passes: id, numericUserId, namaLembaga, kategoriDisabilitas, provinsi, kota, alamatLengkap, latitude, longitude, kontakWa, kontakEmail, jumlahSantri, fasilitasTersedia, programUnggulan, deskripsi
    const isServerOrdering = typeof params[1] === 'number' || params[1] === null;
    const item = {
      id: db.quran_communities.length + 1,
      community_id_string: params[0],
      user_id: isServerOrdering ? params[1] : (params[15] || null),
      nama_lembaga: isServerOrdering ? params[2] : params[1],
      kategori_disabilitas: typeof (isServerOrdering ? params[3] : params[2]) === 'string'
        ? (isServerOrdering ? params[3] : params[2])
        : JSON.stringify(isServerOrdering ? params[3] : params[2]),
      provinsi: isServerOrdering ? params[4] : params[3],
      kota: isServerOrdering ? params[5] : params[4],
      alamat_lengkap: isServerOrdering ? params[6] : params[5],
      latitude: Number((isServerOrdering ? params[7] : params[6]) || 0),
      longitude: Number((isServerOrdering ? params[8] : params[7]) || 0),
      kontak_wa: (isServerOrdering ? params[9] : params[8]) || '',
      kontak_email: (isServerOrdering ? params[10] : params[9]) || '',
      jumlah_santri: Number((isServerOrdering ? params[11] : params[10]) || 0),
      fasilitas_tersedia: typeof (isServerOrdering ? params[12] : params[11]) === 'string'
        ? (isServerOrdering ? params[12] : params[11])
        : JSON.stringify(isServerOrdering ? params[12] : params[11]),
      program_unggulan: (isServerOrdering ? params[13] : params[12]) || '',
      deskripsi: (isServerOrdering ? params[14] : params[13]) || '',
      is_verified: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.quran_communities.push(item);
    return [[{ insertId: item.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE quran_communities SET logo\s*=/i.test(normalized)) {
    const logo = params[0] !== undefined && params[0] !== null ? String(params[0]) : '';
    const userId = params[1];
    const namaLembaga = params[2] ? String(params[2]) : '';
    let count = 0;
    db.quran_communities.forEach((c) => {
      if (
        (userId && (c.user_id === userId || String(c.user_id) === String(userId))) ||
        (namaLembaga && c.nama_lembaga === namaLembaga)
      ) {
        c.logo = logo;
        c.updated_at = new Date().toISOString();
        count++;
      }
    });
    return [[{ affectedRows: count }], {}];
  }

  if (/UPDATE quran_communities SET/i.test(normalized)) {
    const id = params[params.length - 1];
    const item = db.quran_communities.find((c) => c.community_id_string === id);
    if (item) {
      item.nama_lembaga = params[0];
      item.kategori_disabilitas = typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]);
      item.provinsi = params[2];
      item.kota = params[3];
      item.alamat_lengkap = params[4];
      item.latitude = Number(params[5]);
      item.longitude = Number(params[6]);
      item.kontak_wa = params[7];
      item.kontak_email = params[8];
      item.jumlah_santri = Number(params[9] || 0);
      item.fasilitas_tersedia = typeof params[10] === 'string' ? params[10] : JSON.stringify(params[10]);
      item.program_unggulan = params[11];
      item.deskripsi = params[12];
      item.is_verified = params[13] ? 1 : 0;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/DELETE FROM quran_communities/i.test(normalized)) {
    const id = params[0];
    const idx = db.quran_communities.findIndex((c) => c.community_id_string === id);
    if (idx !== -1) db.quran_communities.splice(idx, 1);
    return [[{ affectedRows: idx !== -1 ? 1 : 0 }], {}];
  }

  // 6. TRAINING PROPOSALS (EVENTS)
  if (/SELECT.*FROM training_proposals/i.test(normalized)) {
    const enrich = (list: any[]) =>
      list.map((p) => {
        const u = db.users.find(
          (usr) => usr.id === p.mitra_id || usr.user_id_string === p.mitra_id_string
        );
        return {
          ...p,
          mitraName: u ? u.name : (p.mitraName || ''),
          mitraOrg: u ? u.organization_name : (p.mitra_org || p.mitraOrg || ''),
          mitraLogo: (u && u.organization_logo) ? u.organization_logo : (p.mitra_logo || p.mitraLogo || ''),
          userOrgLogo: u?.organization_logo || undefined,
        };
      });

    if (/WHERE.*proposal_id_string\s*=\s*\?/i.test(normalized)) {
      return [enrich(db.training_proposals.filter((p) => p.proposal_id_string === params[0])), {}];
    }
    if (/WHERE.*mitra_id_string\s*=\s*\?/i.test(normalized)) {
      return [enrich(db.training_proposals.filter((p) => p.mitra_id_string === params[0])), {}];
    }
    if (/WHERE.*status\s*=\s*'disetujui'\s*AND\s*is_aktif\s*=\s*TRUE/i.test(normalized)) {
      return [enrich(db.training_proposals.filter((p) => p.status === 'disetujui' && p.is_aktif)), {}];
    }
    return [enrich(db.training_proposals), {}];
  }

  if (/INSERT INTO training_proposals/i.test(normalized)) {
    // Urutan parameter mengikuti INSERT pada server.ts.
    const item = {
      id: db.training_proposals.length + 1,
      proposal_id_string: params[0],
      mitra_id: params[1],
      mitra_id_string: params[2],
      nama_kegiatan: params[3],
      jenis_event: params[4],
      event_category_id_string: params[5] || null,
      disability_id_string: params[6] || null,
      deskripsi_pelatihan: params[7],
      lokasi_dan_alamat: params[8],
      provinsi: params[9],
      kota: params[10],
      latitude: params[11] == null ? null : Number(params[11]),
      longitude: params[12] == null ? null : Number(params[12]),
      tanggal_kegiatan: params[13],
      waktu_mulai: params[14] || null,
      waktu_selesai: params[15] || null,
      target_dan_kuota_peserta: Number(params[16] || 0),
      kuota_disetujui: params[17] == null ? null : Number(params[17]),
      kebutuhan_peserta: typeof params[18] === 'string' ? params[18] : JSON.stringify(params[18] || []),
      status: 'menunggu_persetujuan',
      alasan_penolakan: null,
      tanggal_persetujuan: null,
      link_pendaftaran: null,
      is_aktif: 0,
      jumlah_pendaftar: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.training_proposals.push(item);
    return [[{ insertId: item.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE training_proposals SET\s+mitra_id=\?/i.test(normalized)) {
    const id = params[24];
    const item = db.training_proposals.find((p) => p.proposal_id_string === id);
    if (item) {
      item.mitra_id = params[0];
      item.mitra_id_string = params[1];
      item.nama_kegiatan = params[2];
      item.jenis_event = params[3];
      item.event_category_id_string = params[4] || null;
      item.disability_id_string = params[5] || null;
      item.deskripsi_pelatihan = params[6];
      item.lokasi_dan_alamat = params[7];
      item.provinsi = params[8];
      item.kota = params[9];
      item.latitude = params[10] == null ? null : Number(params[10]);
      item.longitude = params[11] == null ? null : Number(params[11]);
      item.tanggal_kegiatan = params[12];
      item.waktu_mulai = params[13] || null;
      item.waktu_selesai = params[14] || null;
      item.target_dan_kuota_peserta = Number(params[15] || 0);
      item.kuota_disetujui = params[16] == null ? null : Number(params[16]);
      item.kebutuhan_peserta = typeof params[17] === 'string' ? params[17] : JSON.stringify(params[17] || []);
      item.status = params[18];
      item.alasan_penolakan = params[19] || null;
      item.link_pendaftaran = params[20] || null;
      item.is_aktif = params[21] ? 1 : 0;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/UPDATE training_proposals SET mitra_logo\s*=/i.test(normalized)) {
    const logo = params[0] !== undefined && params[0] !== null ? String(params[0]) : '';
    const mitraId = params[1] ? String(params[1]) : '';
    const mitraOrg = params[2] ? String(params[2]) : '';
    let count = 0;
    db.training_proposals.forEach((p) => {
      if ((mitraId && p.mitra_id_string === mitraId) || (mitraOrg && p.mitra_org === mitraOrg)) {
        p.mitra_logo = logo;
        p.updated_at = new Date().toISOString();
        count++;
      }
    });
    return [[{ affectedRows: count }], {}];
  }

  if (/UPDATE training_proposals SET jenis_event\s*=/i.test(normalized)) {
    const newJenis = params[0];
    const old1 = params[1];
    const old2 = params[2] || old1;
    let count = 0;
    db.training_proposals.forEach((p) => {
      if (
        p.jenis_event === old1 || p.jenis_event === old2 ||
        p.jenisEvent === old1 || p.jenisEvent === old2
      ) {
        p.jenis_event = newJenis;
        p.jenisEvent = newJenis;
        p.updated_at = new Date().toISOString();
        count++;
      }
    });
    return [[{ affectedRows: count }], {}];
  }

  if (/UPDATE training_proposals SET status\s*=\s*'disetujui'/i.test(normalized)) {
    const kuota = Number(params[0]);
    const link = params[1];
    const id = params[2];
    const item = db.training_proposals.find((p) => p.proposal_id_string === id);
    if (item) {
      item.status = 'disetujui';
      item.kuota_disetujui = kuota;
      item.link_pendaftaran = link;
      item.is_aktif = 1;
      item.tanggal_persetujuan = new Date().toISOString();
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/UPDATE training_proposals SET status\s*=\s*'ditolak'/i.test(normalized)) {
    const alasan = params[0];
    const id = params[1];
    const item = db.training_proposals.find((p) => p.proposal_id_string === id);
    if (item) {
      item.status = 'ditolak';
      item.alasan_penolakan = alasan;
      item.is_aktif = 0;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/UPDATE training_proposals SET is_aktif\s*=/i.test(normalized)) {
    const isAktif = params[0] ? 1 : 0;
    const id = params[1];
    const item = db.training_proposals.find((p) => p.proposal_id_string === id);
    if (item) {
      item.is_aktif = isAktif;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/UPDATE training_proposals SET jumlah_pendaftar\s*=\s*jumlah_pendaftar\s*\+\s*1/i.test(normalized)) {
    const id = params[0];
    const item = db.training_proposals.find((p) => p.proposal_id_string === id || String(p.id) === String(id));
    if (item) item.jumlah_pendaftar = (item.jumlah_pendaftar || 0) + 1;
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  if (/DELETE FROM training_proposals/i.test(normalized)) {
    const id = params[0];
    const idx = db.training_proposals.findIndex((p) => p.proposal_id_string === id);
    if (idx !== -1) db.training_proposals.splice(idx, 1);
    return [[{ affectedRows: idx !== -1 ? 1 : 0 }], {}];
  }

  // 7. PARTICIPANTS
  if (/SELECT.*FROM participants/i.test(normalized)) {
    if (/WHERE event_id_string\s*=\s*\?/i.test(normalized)) {
      return [db.participants.filter((p) => p.event_id_string === params[0]), {}];
    }
    return [[...db.participants], {}];
  }

  if (/INSERT INTO participants/i.test(normalized)) {
    const item = {
      id: db.participants.length + 1,
      participant_id_string: params[0],
      event_id_string: params[1],
      nama_lengkap: params[2],
      no_wa: params[3],
      email: params[4] || null,
      usia: Number(params[5] || 0),
      kategori_disabilitas: params[6],
      kebutuhan_fasilitas: typeof params[7] === 'string' ? params[7] : JSON.stringify(params[7]),
      catatan_khusus: params[8] || '',
      status_kehadiran: 'terdaftar',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.participants.push(item);
    return [[{ insertId: item.id, affectedRows: 1 }], {}];
  }

  if (/UPDATE participants SET status_kehadiran\s*=/i.test(normalized)) {
    const status = params[0];
    const id = params[1];
    const item = db.participants.find((p) => p.participant_id_string === id);
    if (item) {
      item.status_kehadiran = status;
      item.updated_at = new Date().toISOString();
    }
    return [[{ affectedRows: item ? 1 : 0 }], {}];
  }

  // 8. STATS AGGREGATIONS
  if (/SELECT.*COUNT\(\*\).*FROM/i.test(normalized)) {
    const totalUsers = db.users.length;
    const totalProposals = db.training_proposals.length;
    const totalCommunities = db.quran_communities.length;
    const totalParticipants = db.participants.length;
    return [[{
      totalUsers,
      totalProposals,
      totalCommunities,
      totalParticipants,
      totalSantri: db.quran_communities.reduce((acc, c) => acc + (c.jumlah_santri || 0), 0),
    }], {}];
  }

  // Fallback
  console.warn('[Mock DB] Unhandled SQL:', normalized);
  return [[], {}];
}

export function createMockPool() {
  return {
    async query(sql: string, params: any[] = []) {
      return executeMockQuery(sql, params);
    },
    async execute(sql: string, params: any[] = []) {
      return executeMockQuery(sql, params);
    },
    async getConnection() {
      return {
        ping: async () => {},
        release: () => {},
        query: async (sql: string, params: any[] = []) => executeMockQuery(sql, params),
      };
    },
  };
}
