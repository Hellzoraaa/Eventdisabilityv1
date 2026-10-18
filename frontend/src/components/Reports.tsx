import React, { useEffect, useState } from 'react';
import { Icon } from './Icon.tsx';

import { SystemStats, Participant, TrainingProposal } from '../types.ts';

import jsPDF from 'jspdf';

import autoTable from 'jspdf-autotable';



interface ReportResponse {

  stats: SystemStats;

  disabilityCounts: Record<string, number>;

  funnelStages: {

    totalPendaftar: number;

    terverifikasi: number;

    assessment: number;

    pelatihanAktif: number;

    lulusSertifikasi: number;

  };

  regionBreakdown: Record<string, number>;

  participants: Participant[];

  events: TrainingProposal[];

}



interface ReportsProps {

  onNavigateToParticipants?: () => void;

}



export const Reports: React.FC<ReportsProps> = ({ onNavigateToParticipants }) => {

  const [data, setData] = useState<ReportResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [pdfSuccessToast, setPdfSuccessToast] = useState(false);



  const fetchReports = async () => {

    try {

      setIsLoading(true);

      const res = await fetch('/api/reports/summary');

      const json = await res.json();

      setData(json);

    } catch (error) {

      console.error('Failed to fetch reports', error);

    } finally {

      setIsLoading(false);

    }

  };



  useEffect(() => {

    fetchReports();

  }, []);



  const totalParticipants = data?.stats?.totalParticipants || data?.participants?.length || 0;



  // Real Funnel Calculations

  const participantsList = data?.participants || [];

  const funnel = {

    pendaftaran: totalParticipants,

    pendaftaranPct: totalParticipants > 0 ? 100 : 0,

    terverifikasi: participantsList.filter(p => p.noWa && p.noWa.length >= 8).length,

    terverifikasiPct: totalParticipants > 0 ? Math.round((participantsList.filter(p => p.noWa && p.noWa.length >= 8).length / totalParticipants) * 100) : 0,

    assessment: participantsList.filter(p => p.statusKehadiran !== 'batal').length,

    assessmentPct: totalParticipants > 0 ? Math.round((participantsList.filter(p => p.statusKehadiran !== 'batal').length / totalParticipants) * 100) : 0,

    pelatihanAktif: participantsList.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length,

    pelatihanAktifPct: totalParticipants > 0 ? Math.round((participantsList.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length / totalParticipants) * 100) : 0,

    lulus: participantsList.filter(p => p.statusKehadiran === 'hadir').length,

    lulusPct: totalParticipants > 0 ? Math.round((participantsList.filter(p => p.statusKehadiran === 'hadir').length / totalParticipants) * 100) : 0,

  };



  // Real Disability & General Category Calculation

  const countNetra = participantsList.filter(p => p.kategoriDisabilitas === 'tunanetra').length;

  const countRungu = participantsList.filter(p => p.kategoriDisabilitas === 'tunarungu').length;

  const countDaksa = participantsList.filter(p => p.kategoriDisabilitas === 'tunadaksa').length;

  const countIntelektual = participantsList.filter(p => p.kategoriDisabilitas === 'intelektual_autisme').length;

  const countUmum = participantsList.filter(p => p.kategoriDisabilitas === 'umum').length;

  const countPendamping = participantsList.filter(p => p.kategoriDisabilitas === 'pendamping_umum').length;



  const denom = totalParticipants || 1;

  const pctNetra = totalParticipants > 0 ? Number(((countNetra / denom) * 100).toFixed(1)) : 0;

  const pctRungu = totalParticipants > 0 ? Number(((countRungu / denom) * 100).toFixed(1)) : 0;

  const pctDaksa = totalParticipants > 0 ? Number(((countDaksa / denom) * 100).toFixed(1)) : 0;

  const pctIntelektual = totalParticipants > 0 ? Number(((countIntelektual / denom) * 100).toFixed(1)) : 0;

  const pctUmum = totalParticipants > 0 ? Number(((countUmum / denom) * 100).toFixed(1)) : 0;

  const pctPendamping = totalParticipants > 0 ? Number(((countPendamping / denom) * 100).toFixed(1)) : 0;



  // Export to Excel / CSV

  const handleExportExcel = () => {

    setIsExportingExcel(true);

    try {

      const today = new Date().toLocaleDateString('id-ID', {

        year: 'numeric',

        month: 'long',

        day: 'numeric'

      });



      let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel



      // Document Title

      csv += 'LAPORAN EKSEKUTIF EKOSISTEM AL-QURAN RAMAH DISABILITAS INDONESIA\n';

      csv += `Tanggal Unduh: ${today}\n`;

      csv += `Status Data: Sinkronisasi Real-Time (Tanpa Dummy)\n\n`;



      // 1. Executive Summary

      csv += '=== 1. RINGKASAN METRIK UTAMA ===\n';

      csv += 'Metrik,Nilai,Satuan,Keterangan\n';

      csv += `Total Peserta Terdaftar,${totalParticipants},Orang,Peserta terverifikasi di database\n`;

      csv += `Total Pelatihan Disetujui,${data?.stats?.approvedEvents || 0},Event,Terselenggara / aktif\n`;

      csv += `Total Komunitas & Lembaga,${data?.stats?.totalCommunities || 0},Lembaga,Tersebar di berbagai provinsi\n`;

      csv += `Proposal Menunggu Persetujuan,${data?.stats?.pendingProposals || 0},Proposal,Menunggu review Super Admin\n\n`;



      // 2. Real Funnel

      csv += '=== 2. FUNNEL PELATIHAN PESERTA (REAL DATA) ===\n';

      csv += 'Tahap Funnel,Jumlah Peserta,Persentase Real,Definisi Indikator\n';

      csv += `1. Pendaftaran Masuk,${funnel.pendaftaran},${funnel.pendaftaranPct}%,Total pendaftaran masuk ke sistem\n`;

      csv += `2. Terverifikasi Kontak WA/Email,${funnel.terverifikasi},${funnel.terverifikasiPct}%,Nomor valid dan data terkonfirmasi\n`;

      csv += `3. Seleksi & Assessment Kebutuhan,${funnel.assessment},${funnel.assessmentPct}%,Peserta siap dengan fasilitas inklusif\n`;

      csv += `4. Pelatihan Aktif Kelas,${funnel.pelatihanAktif},${funnel.pelatihanAktifPct}%,Peserta aktif mengikuti modul quran\n`;

      csv += `5. Lulus Sertifikasi / Hadir,${funnel.lulus},${funnel.lulusPct}%,Peserta menuntaskan pelatihan bersertifikat\n\n`;



      // 3. Disability & General Category Distribution

      csv += '=== 3. DISTRIBUSI KATEGORI PESERTA (DISABILITAS & UMUM) ===\n';

      csv += 'Kategori Peserta,Jumlah Peserta,Persentase Real,Fasilitas Pendukung\n';

      csv += `Tunanetra (Braille),${countNetra},${pctNetra}%,Mushaf Quran Braille & Relawan Pendamping\n`;

      csv += `Tunarungu (Isyarat),${countRungu},${pctRungu}%,Juru Bahasa Isyarat (JBI) & Video Visual\n`;

      if (countUmum > 0) {

        csv += `Kategori Umum / Non-Disabilitas,${countUmum},${pctUmum}%,Masyarakat umum & peserta reguler\n`;

      }

      if (countPendamping > 0) {

        csv += `Pendamping / Relawan,${countPendamping},${pctPendamping}%,Orang tua & ustadz pendamping\n`;

      }

      csv += `TOTAL,${totalParticipants},100%,\n\n`;



      // 4. Regional Distribution

      csv += '=== 4. PERSEBARAN WILAYAH LEMBAGA / KOMUNITAS ===\n';

      csv += 'Provinsi,Jumlah Komunitas / Lembaga\n';

      (Object.entries(data?.regionBreakdown || {}) as [string, number][])

        .sort(([, a], [, b]) => b - a)

        .forEach(([prov, count]) => {

          csv += `"${prov}",${count}\n`;

        });

      csv += '\n';



      // 5. Participants Detailed List

      csv += '=== 5. DAFTAR LENGKAP PESERTA TERDAFTAR ===\n';

      csv += 'No,ID Peserta,Nama Lengkap,Usia,Kategori Disabilitas,No. WhatsApp,Email,Event Terdaftar,Kebutuhan Fasilitas,Status Kehadiran,Waktu Pendaftaran\n';

      participantsList.forEach((p, idx) => {

        const fasil = (p.kebutuhanFasilitas || []).join('; ');

        const waktu = p.waktuDaftar ? new Date(p.waktuDaftar).toLocaleString('id-ID') : '-';

        csv += `${idx + 1},"${p.id}","${p.namaLengkap}",${p.usia},"${p.kategoriDisabilitas}","${p.noWa}","${p.email || '-'}","${p.eventTitle || '-'}","${fasil}","${p.statusKehadiran}","${waktu}"\n`;

      });



      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.setAttribute('href', url);

      link.setAttribute('download', `Laporan_Ekosistem_Quran_Disabilitas_${new Date().toISOString().slice(0, 10)}.csv`);

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

    } catch (e) {

      console.error('Export Excel error:', e);

    } finally {

      setIsExportingExcel(false);

    }

  };



  // Export PDF mengikuti desain referensi "Laporan Data Peserta".

  const handleExportPdf = async () => {

    setIsExportingPdf(true);

    try {

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();

      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 18;

      const contentWidth = pageWidth - margin * 2;

      const today = new Date();

      const dateText = today.toLocaleDateString('id-ID', {

        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',

      });

      const total = participantsList.length;

      const percent = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

      const categoryOf = (value: unknown) => {

        const key = String(value || '').toLowerCase();

        if (key === 'tunanetra') return 'Tunanetra (Braille)';

        if (key === 'tunarungu') return 'Tunarungu / Tuli (Isyarat)';

        if (key === 'umum' || key === 'pendamping_umum' || !key) return 'Umum / Non Disabilitas';

        if (key === 'tunadaksa') return 'Tunadaksa';

        if (key === 'intelektual_autisme') return 'Intelektual & Autisme';

        return String(value).replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

      };

      const countCategory = (keys: string[]) => participantsList.filter(p => keys.includes(String(p.kategoriDisabilitas || '').toLowerCase())).length;

      const countNetraPdf = countCategory(['tunanetra']);

      const countRunguPdf = countCategory(['tunarungu']);

      const countUmumPdf = countCategory(['umum', 'pendamping_umum', '']);

      const otherCategoryRows = [

        { keys: ['tunadaksa'], label: 'Tunadaksa', facility: 'Aksesibilitas fisik sesuai kebutuhan' },

        { keys: ['intelektual_autisme'], label: 'Intelektual & Autisme', facility: 'Pendampingan dan metode belajar adaptif' },

      ].map(c => ({ ...c, count: countCategory(c.keys) })).filter(c => c.count > 0);



      // Logo resmi yang diekstrak dari dokumen contoh yang diberikan.

      const logo = new Image();

      logo.src = '/logo-kemenag-laporan.png';

      try {

        await new Promise<void>((resolve, reject) => {

          logo.onload = () => resolve();

          logo.onerror = () => reject(new Error('Logo laporan gagal dimuat'));

        });

        doc.addImage(logo, 'PNG', (pageWidth - 22) / 2, 8, 22, 22);

      } catch (e) {

        console.warn('Logo laporan tidak dapat dimuat, lanjut tanpa logo.', e);

      }



      // Judul dan metadata dibuat serupa dengan dokumen referensi.

      doc.setTextColor(0, 0, 0);

      doc.setFont('times', 'bold');

      doc.setFontSize(13);

      doc.text('LAPORAN EVENT FOR DISABILITY QUR’AN', pageWidth / 2, 36, { align: 'center' });

      doc.setFont('times', 'normal');

      doc.setFontSize(14);

      doc.text('Laporan Data Peserta', pageWidth / 2, 44, { align: 'center' });

      doc.setFontSize(10.5);

      doc.text(`Tanggal Unduh : ${dateText.charAt(0).toUpperCase() + dateText.slice(1)}`, margin, 59);

      doc.text('Status : Data Riil Terverifikasi', margin, 67);



      const baseTableStyles = {

        font: 'times' as const,

        fontSize: 9,

        textColor: [0, 0, 0] as [number, number, number],

        lineColor: [0, 0, 0] as [number, number, number],

        lineWidth: 0.25,

        cellPadding: 2.2,

        valign: 'middle' as const,

      };

      const headStyles = {

        font: 'times' as const,

        fontStyle: 'normal' as const,

        fillColor: [255, 255, 255] as [number, number, number],

        textColor: [0, 0, 0] as [number, number, number],

        lineColor: [0, 0, 0] as [number, number, number],

        lineWidth: 0.25,

        halign: 'center' as const,

        valign: 'middle' as const,

      };

      let y = 84;

      const sectionTitle = (title: string) => {

        if (y > pageHeight - 35) { doc.addPage(); y = 20; }

        doc.setFont('times', 'normal');

        doc.setFontSize(11);

        doc.setTextColor(0, 0, 0);

        doc.text(title, margin, y);

        y += 5;

      };



      sectionTitle('2. FUNNEL PELATIHAN PESERTA');

      const verified = participantsList.filter(p => Boolean(p.noWa && p.noWa.trim().length >= 8)).length;

      const assessed = participantsList.filter(p => p.statusKehadiran !== 'batal').length;

      const active = participantsList.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length;

      const passed = participantsList.filter(p => p.statusKehadiran === 'hadir').length;

      autoTable(doc, {

        startY: y,

        margin: { left: margin, right: margin, bottom: 17 },

        tableWidth: contentWidth,

        head: [['Tahap Funnel', 'Jumlah', 'Persentase', 'Keterangan']],

        body: [

          ['1. Pendaftaran Masuk', `${total} Orang`, total ? '100%' : '0%', 'Formulir tersubmit ke database'],

          ['2. Terverifikasi Kontak WA/Email', `${verified} Orang`, percent(verified), 'Kontak aktif & terkonfirmasi'],

          ['3. Kesiapan Fasilitas & Asesmen', `${assessed} Orang`, percent(assessed), 'Akomodasi disabilitas siap'],

          ['4. Pelatihan Aktif di Kelas', `${active} Orang`, percent(active), 'Peserta aktif mengikuti modul'],

          ['5. Lulus / Bersertifikat', `${passed} Orang`, percent(passed), 'Tuntas menyelesaikan pelatihan'],

        ],

        theme: 'grid', styles: baseTableStyles, headStyles,

        columnStyles: { 0: { cellWidth: 64 }, 1: { cellWidth: 24, halign: 'center' }, 2: { cellWidth: 26, halign: 'center' }, 3: { cellWidth: 'auto' } },

        rowPageBreak: 'avoid',

      });

      y = (doc as any).lastAutoTable.finalY + 12;



      sectionTitle('3. DISTRIBUSI KATEGORI PESERTA');

      const categoryRows: (string | number)[][] = [

        ['Tunanetra (Braille)', countNetraPdf, percent(countNetraPdf), 'Mushaf Quran Braille LPMQ'],

        ['Tunarungu / Tuli (Isyarat)', countRunguPdf, percent(countRunguPdf), 'Mushaf Al-Qur’an Isyarat'],

        ['Kategori Umum / Non Disabilitas', countUmumPdf, percent(countUmumPdf), 'Masyarakat Umum'],

        ...otherCategoryRows.map(c => [c.label, c.count, percent(c.count), c.facility]),

      ];

      autoTable(doc, {

        startY: y,

        margin: { left: margin, right: margin, bottom: 17 },

        tableWidth: contentWidth,

        head: [['Kategori Peserta', 'Jumlah', 'Presentase', 'Fasilitas']],

        body: categoryRows,

        theme: 'grid', styles: baseTableStyles, headStyles,

        columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 24, halign: 'center' }, 3: { cellWidth: 'auto' } },

        rowPageBreak: 'avoid',

      });

      y = (doc as any).lastAutoTable.finalY + 12;



      sectionTitle('4. DAFTAR SELURUH DATA PESERTA');

      const participantRows = participantsList.map((p, idx) => [

        String(idx + 1),

        p.namaLengkap || '-',

        categoryOf(p.kategoriDisabilitas),

        p.noWa || '-',

        p.eventTitle || '-',

        p.statusKehadiran === 'hadir' ? 'Hadir' : p.statusKehadiran === 'batal' ? 'Batal' : 'Terdaftar',

      ]);

      autoTable(doc, {

        startY: y,

        margin: { left: margin, right: margin, top: 15, bottom: 17 },

        tableWidth: contentWidth,

        head: [['No', 'Nama Lengkap', 'Kategori / Disabilitas', 'Kontak WA', 'Pelatihan', 'Status']],

        body: participantRows.length ? participantRows : [['-', 'Belum ada data peserta', '-', '-', '-', '-']],

        theme: 'grid', styles: { ...baseTableStyles, fontSize: 8.2, cellPadding: 1.8 }, headStyles: { ...headStyles, fontSize: 8.5 },

        columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 38 }, 2: { cellWidth: 43 }, 3: { cellWidth: 28 }, 4: { cellWidth: 32 }, 5: { cellWidth: 'auto' } },

        rowPageBreak: 'avoid',

      });



      // Footer pada setiap halaman, sesuai format referensi.

      const reportId = `LPR-${Date.now().toString().slice(-6)}`;

      const pageCount = doc.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {

        doc.setPage(page);

        doc.setFont('times', 'normal');

        doc.setFontSize(7.5);

        doc.setTextColor(0, 0, 0);

        doc.text('Event For Disability To Qur’an', margin, pageHeight - 7);

        doc.text(`ID LAPORAN: ${reportId}`, pageWidth / 2, pageHeight - 7, { align: 'center' });

        doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });

      }



      doc.save(`Laporan_Data_Peserta_${today.toISOString().slice(0, 10)}.pdf`);

      setPdfSuccessToast(true);

      setTimeout(() => setPdfSuccessToast(false), 3500);

    } catch (err) {

      console.error('Export PDF error:', err);

      alert('Terjadi kesalahan teknis saat membuat PDF. Silakan coba lagi.');

    } finally {

      setIsExportingPdf(false);

    }

  };



  if (isLoading) {

    return (

      <div className="flex flex-col items-center justify-center p-16 space-y-3">

        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>

        <p className="text-[13px] font-medium text-on-surface-variant">Memuat ringkasan data laporan eksekutif...</p>

      </div>

    );

  }



  return (

    <div className="space-y-6">

      {/* PDF Success Toast */}

      {pdfSuccessToast && (

        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">

          <Icon name="check_circle" className="text-[20px]" />

          <div>

            <p className="text-[13px] font-semibold">File PDF Berhasil Diunduh!</p>

            <p className="text-[11px] text-emerald-100">Dokumen laporan telah tersimpan di perangkat Anda.</p>

          </div>

        </div>

      )}



      {/* Top Header Card with Actions */}

      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">

        <div>

          <div className="flex items-center gap-2 mb-1">

            <Icon name="assessment" className="text-primary text-[24px]" />

            <h1 className="text-[20px] font-bold text-on-surface">Laporan & Audit Ekosistem</h1>

          </div>

          <p className="text-[13px] text-on-surface-variant">

            Data analitik konsolidasi real-time peserta, ragam disabilitas, dan efektivitas pelatihan.

          </p>

        </div>



        {/* Action Buttons: Unduh PDF & Unduh Excel */}

        <div className="flex flex-wrap items-center gap-3">

          <button

            onClick={handleExportExcel}

            disabled={isExportingExcel}

            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-[12px] font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"

            title="Unduh data laporan dalam format Excel (.csv)"

          >

            

            <span>{isExportingExcel ? 'Mengunduh...' : 'Unduh Excel'}</span>

          </button>



          <button

            onClick={handleExportPdf}

            disabled={isExportingPdf}

            className="px-4 py-2.5 bg-primary hover:bg-primary/90 active:scale-[0.98] text-on-primary rounded-xl text-[12px] font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"

            title="Unduh dokumen PDF laporan resmi langsung ke perangkat"

          >


            <span>{isExportingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF'}</span>

          </button>

        </div>

      </div>



      {/* Overview Metric Cards */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">

          <div className="flex items-center justify-between mb-1">

            <span className="text-on-surface-variant text-[12px] font-medium">Total Peserta Terdaftar</span>

            <Icon name="groups" className="text-primary text-[18px]" />

          </div>

          <span className="text-[30px] font-bold text-on-surface leading-tight">{totalParticipants}</span>

          <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">

            <Icon name="check_circle" className="text-[14px]" />

            100% Data Riil

          </span>

        </div>



        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">

          <div className="flex items-center justify-between mb-1">

            <span className="text-on-surface-variant text-[12px] font-medium">Pelatihan Disetujui</span>

            <Icon name="verified" className="text-secondary text-[18px]" />

          </div>

          <span className="text-[30px] font-bold text-primary leading-tight">{data?.stats?.approvedEvents || 0}</span>

          <span className="text-[11px] text-on-surface-variant font-medium mt-1">

            Dari total {data?.stats?.totalProposals || 0} diajukan

          </span>

        </div>



        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">

          <div className="flex items-center justify-between mb-1">

            <span className="text-on-surface-variant text-[12px] font-medium">Lembaga & Komunitas</span>

            <Icon name="apartment" className="text-amber-500 text-[18px]" />

          </div>

          <span className="text-[30px] font-bold text-secondary leading-tight">{data?.stats?.totalCommunities || 0}</span>

          <span className="text-[11px] text-on-surface-variant font-medium mt-1">

            Terverifikasi di Peta Nasional

          </span>

        </div>



        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col">

          <div className="flex items-center justify-between mb-1">

            <span className="text-on-surface-variant text-[12px] font-medium">Tingkat Kelulusan</span>

            <Icon name="military_tech" className="text-indigo-500 text-[18px]" />

          </div>

          <span className="text-[30px] font-bold text-indigo-600 leading-tight">

            {funnel.lulusPct}%

          </span>

          <span className="text-[11px] text-on-surface-variant font-medium mt-1">

            {funnel.lulus} dari {totalParticipants} peserta

          </span>

        </div>

      </div>



      {/* Real Funnel & Real Disability Breakdown (2 Columns) */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Left: Real Funnel Pelatihan Peserta */}

        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col justify-between shadow-sm">

          <div>

            <div className="flex items-center justify-between mb-4">

              <h2 className="text-[16px] font-semibold text-on-surface">Funnel Pelatihan Peserta </h2>

              <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 bg-primary/10 rounded-full">

                {totalParticipants} Peserta

              </span>

            </div>



            {/* Segmented Pipeline Bar */}

            <div className="w-full h-3 rounded-full overflow-hidden flex gap-1 mb-5 bg-surface-container p-0.5">

              <div 

                className="h-full bg-secondary-container rounded-sm transition-all" 

                style={{ width: `${Math.max(8, funnel.pendaftaranPct)}%` }} 

                title={`Pendaftaran: ${funnel.pendaftaran} (${funnel.pendaftaranPct}%)`}

              ></div>

              <div 

                className="h-full bg-tertiary-fixed-dim rounded-sm transition-all" 

                style={{ width: `${Math.max(8, funnel.terverifikasiPct)}%` }} 

                title={`Terverifikasi: ${funnel.terverifikasi} (${funnel.terverifikasiPct}%)`}

              ></div>

              <div 

                className="h-full bg-primary rounded-sm transition-all" 

                style={{ width: `${Math.max(8, funnel.assessmentPct)}%` }} 

                title={`Assessment: ${funnel.assessment} (${funnel.assessmentPct}%)`}

              ></div>

              <div 

                className="h-full bg-surface-tint rounded-sm transition-all" 

                style={{ width: `${Math.max(8, funnel.pelatihanAktifPct)}%` }} 

                title={`Pelatihan Aktif: ${funnel.pelatihanAktif} (${funnel.pelatihanAktifPct}%)`}

              ></div>

              <div 

                className="h-full bg-primary-container rounded-sm transition-all" 

                style={{ width: `${Math.max(8, funnel.lulusPct)}%` }} 

                title={`Lulus Sertifikasi: ${funnel.lulus} (${funnel.lulusPct}%)`}

              ></div>

            </div>



            {/* Funnel Stage Details with Real % */}

            <div className="space-y-3">

              <div className="flex items-center justify-between text-[13px] py-1 px-2 rounded-lg bg-surface-container-low/40">

                <div className="flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-sm bg-secondary-container"></span>

                  <span className="font-medium text-on-surface">1. Pendaftaran Masuk</span>

                </div>

                <div className="flex items-center gap-3">

                  <span className="font-semibold text-on-surface">{funnel.pendaftaran} Peserta</span>

                  <span className="font-bold text-primary text-[12px] w-12 text-right">{funnel.pendaftaranPct}%</span>

                </div>

              </div>



              <div className="flex items-center justify-between text-[13px] py-1 px-2 rounded-lg bg-surface-container-low/40">

                <div className="flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-sm bg-tertiary-fixed-dim"></span>

                  <span className="font-medium text-on-surface">2. Pendaftaran Terverifikasi</span>

                </div>

                <div className="flex items-center gap-3">

                  <span className="font-semibold text-on-surface">{funnel.terverifikasi} Peserta</span>

                  <span className="font-bold text-primary text-[12px] w-12 text-right">{funnel.terverifikasiPct}%</span>

                </div>

              </div>



              

              



              <div className="flex items-center justify-between text-[13px] py-1 px-2 rounded-lg bg-surface-container-low/40">

                <div className="flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-sm bg-surface-tint"></span>

                  <span className="font-medium text-on-surface">3. Pelatihan Aktif Kelas</span>

                </div>

                <div className="flex items-center gap-3">

                  <span className="font-semibold text-on-surface">{funnel.pelatihanAktif} Peserta</span>

                  <span className="font-bold text-primary text-[12px] w-12 text-right">{funnel.pelatihanAktifPct}%</span>

                </div>

              </div>



              <div className="flex items-center justify-between text-[13px] py-1 px-2 rounded-lg bg-surface-container-low/40">

                <div className="flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-container"></span>

                  <span className="font-medium text-on-surface">4. Lulus Sertifikasi / Hadir</span>

                </div>

                <div className="flex items-center gap-3">

                  <span className="font-semibold text-on-surface">{funnel.lulus} Peserta</span>

                  <span className="font-bold text-primary text-[12px] w-12 text-right">{funnel.lulusPct}%</span>

                </div>

              </div>

            </div>

          </div>



          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-outline font-semibold">

            <span>Total Peserta Terdaftar</span>

            <span>{totalParticipants} Peserta</span>
          </div>

        </div>



        {/* Right: Real Disability & General Category Distribution */}

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col justify-between shadow-sm">

          <div>

            <div className="flex items-center justify-between mb-4">

              <h2 className="text-[16px] font-semibold text-on-surface">Distribusi Kategori Peserta (Disabilitas & Umum)</h2>

             

            </div>



            <div className="space-y-4">

              {/* Tunanetra */}

              <div>

                <div className="flex justify-between text-[13px] mb-1">

                  <span className="text-on-surface font-medium flex items-center gap-2">

                    <span className="w-2.5 h-2.5 rounded-full bg-[#005a71]"></span>

                    Tunanetra

                  </span>

                  <span className="text-on-surface font-semibold">{countNetra} ({pctNetra}%)</span>

                </div>

                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">

                  <div className="bg-[#005a71] h-2 rounded-full transition-all" style={{ width: `${pctNetra}%` }}></div>

                </div>

              </div>



              {/* Tunarungu */}

              <div>

                <div className="flex justify-between text-[13px] mb-1">

                  <span className="text-on-surface font-medium flex items-center gap-2">

                    <span className="w-2.5 h-2.5 rounded-full bg-[#fc6f5a]"></span>

                    Tunarungu 

                  </span>

                  <span className="text-on-surface font-semibold">{countRungu} ({pctRungu}%)</span>

                </div>

                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">

                  <div className="bg-[#fc6f5a] h-2 rounded-full transition-all" style={{ width: `${pctRungu}%` }}></div>

                </div>

              </div>



              



              {/* Kategori Umum */}

              <div>

                <div className="flex justify-between text-[13px] mb-1">

                  <span className="text-on-surface font-medium flex items-center gap-2">

                    <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]"></span>

                     Umum 

                  </span>

                  <span className="text-on-surface font-semibold">{countUmum} ({pctUmum}%)</span>

                </div>

                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">

                  <div className="bg-[#0d9488] h-2 rounded-full transition-all" style={{ width: `${pctUmum}%` }}></div>

                </div>

              </div>



              {/* Pendamping / Relawan */}

              {countPendamping > 0 && (

                <div>

                  <div className="flex justify-between text-[13px] mb-1">

                    <span className="text-on-surface font-medium flex items-center gap-2">

                      <span className="w-2.5 h-2.5 rounded-full bg-[#9333ea]"></span>

                      Pendamping / Relawan

                    </span>

                    <span className="text-on-surface font-semibold">{countPendamping} ({pctPendamping}%)</span>

                  </div>

                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">

                    <div className="bg-[#9333ea] h-2 rounded-full transition-all" style={{ width: `${pctPendamping}%` }}></div>

                  </div>

                </div>

              )}

            </div>

          </div>



          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-outline font-semibold">

            <span>Ragam disabilitas </span>

            <span className="text-primary font-bold">{totalParticipants} Total Terverifikasi</span>

          </div>

        </div>

      </div>



      



      {/* Separated Participant Management Banner & Quick Preview */}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">

        <div className="p-6 border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div>

            <div className="flex items-center gap-2">

              <Icon name="groups" className="text-primary text-[20px]" />

              <h3 className="text-[16px] font-semibold text-on-surface">Data Peserta Pelatihan Terverifikasi</h3>

            </div>

            <p className="text-[12px] text-on-surface-variant mt-0.5">

              Data peserta kini dipisahkan ke <strong>Dashboard Data Peserta</strong> di panel navigasi sebelah kiri untuk pengelolaan penuh (tambah, edit, hapus status, filter lengkap).

            </p>

          </div>



          {onNavigateToParticipants && (

            <button

              onClick={onNavigateToParticipants}

              className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[12px] font-semibold flex items-center gap-2 border border-primary/20 transition-all cursor-pointer whitespace-nowrap"

            >

              <span>Buka Dashboard Data Peserta Lengkap ({totalParticipants})</span>

              <Icon name="arrow_forward" className="text-[16px]" />

            </button>

          )}

        </div>



        {/* Quick Preview Table of Top 5 Recent Participants */}

        <div className="overflow-x-auto">

          <table className="w-full text-left text-[12px]">

            <thead className="bg-surface-container-low text-on-surface-variant font-medium border-b border-outline-variant/30">

              <tr>

                <th className="py-2.5 px-4">Nama Lengkap</th>

                <th className="py-2.5 px-4">Ragam Disabilitas</th>

                <th className="py-2.5 px-4">Kontak WhatsApp</th>

                <th className="py-2.5 px-4">Pelatihan Terdaftar</th>

                <th className="py-2.5 px-4">Status Kehadiran</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-outline-variant/20">

              {participantsList.slice(0, 5).map(p => (

                <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">

                  <td className="py-3 px-4 font-semibold text-on-surface">

                    {p.namaLengkap}

                    <span className="block text-[11px] font-normal text-on-surface-variant">{p.usia} tahun</span>

                  </td>

                  <td className="py-3 px-4">

                    <span className="capitalize font-medium text-on-surface">

                      {p.kategoriDisabilitas.replace('_', ' ')}

                    </span>

                  </td>

                  <td className="py-3 px-4 text-on-surface font-mono">{p.noWa}</td>

                  <td className="py-3 px-4 max-w-xs truncate text-on-surface-variant" title={p.eventTitle}>

                    {p.eventTitle || '-'}

                  </td>

                  <td className="py-3 px-4">

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${

                      p.statusKehadiran === 'hadir'

                        ? 'bg-emerald-100 text-emerald-800'

                        : p.statusKehadiran === 'batal'

                        ? 'bg-red-100 text-red-800'

                        : 'bg-blue-100 text-blue-800'

                    }`}>

                      {p.statusKehadiran}

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>



      {/* Print Signature Section */}

      <div className="hidden print:grid grid-cols-2 mt-12 pt-8 text-center text-xs text-black">

        <div>

          <p>Mengetahui,</p>

          <p className="font-bold mt-1">Koordinator Ekosistem Pelatihan</p>

          <div className="h-16"></div>

          <p className="font-semibold underline">( .................................................. )</p>

          <p className="text-[10px] text-gray-500">NIP. ..................................................</p>

        </div>

        <div>

          <p>Penanggung Jawab Data,</p>

          <p className="font-bold mt-1">Super Administrator Sistem</p>

          <div className="h-16"></div>

          <p className="font-semibold underline">( .................................................. )</p>

          <p className="text-[10px] text-gray-500">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>

        </div>

      </div>

    </div>

  );

};
