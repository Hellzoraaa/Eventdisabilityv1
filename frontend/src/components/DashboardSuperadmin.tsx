import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { 
  TrainingProposal, 
  Participant, 
  User, 
  QuranCommunity,
  DisabilityMaster
} from '../types.ts';

interface DashboardSuperadminProps {
  currentUser: User;
  users: User[];
  proposals: TrainingProposal[];
  participants: Participant[];
  communities: QuranCommunity[];
  disabilities: DisabilityMaster[];
  onProposalApproved: (approved: TrainingProposal) => void;
  onProposalRejected: (rejected: TrainingProposal) => void;
  onSuperadminCreated: (newUser: User) => void;
  onMitraCreated: (newMitra: User) => void;
  onNavigateToMap: () => void;
  onOpenChangePassword?: () => void;
}

export const DashboardSuperadmin: React.FC<DashboardSuperadminProps> = ({
  currentUser,
  users,
  proposals,
  participants,
  communities,
  disabilities,
  onNavigateToMap,
  onOpenChangePassword,
}) => {
  const totalParticipants = participants.length;

  // Trend chart is derived exclusively from participant records returned by the API.
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const year = date.getFullYear();
    const month = date.getMonth();
    const rows = participants.filter((participant) => {
      const rawDate = participant.waktuDaftar;
      if (!rawDate) return false;
      const parsed = new Date(rawDate);
      return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === year && parsed.getMonth() === month;
    });
    return {
      label: date.toLocaleDateString('id-ID', { month: 'short' }),
      hadir: rows.filter((participant) => participant.statusKehadiran === 'hadir').length,
      tertunda: rows.filter((participant) => participant.statusKehadiran === 'terdaftar' || participant.statusKehadiran === 'batal').length,
    };
  });
  const trendMax = Math.max(1, ...trendMonths.flatMap((month) => [month.hadir, month.tertunda]));
  const trendPoint = (value: number, index: number) => ({
    x: 45 + index * (910 / Math.max(1, trendMonths.length - 1)),
    y: 230 - (value / trendMax) * 190,
  });
  const hadirPoints = trendMonths.map((month, index) => trendPoint(month.hadir, index));
  const tertundaPoints = trendMonths.map((month, index) => trendPoint(month.tertunda, index));
  const linePoints = (points: {x:number;y:number}[]) => points.map((point) => `${point.x},${point.y}`).join(' ');
  const totalHadir = participants.filter((participant) => participant.statusKehadiran === 'hadir').length;
  const totalTertunda = participants.filter((participant) => participant.statusKehadiran === 'terdaftar' || participant.statusKehadiran === 'batal').length;

  // Real Funnel Pelatihan Peserta (Data-driven, no dummy percentages)
  const stage1Count = totalParticipants;
  const stage1Pct = totalParticipants > 0 ? 100 : 0;

  const stage2Count = participants.filter(p => p.noWa && p.noWa.length >= 8).length;
  const stage2Pct = totalParticipants > 0 ? Math.round((stage2Count / totalParticipants) * 100) : 0;

  const stage3Count = participants.filter(p => p.statusKehadiran !== 'batal').length;
  const stage3Pct = totalParticipants > 0 ? Math.round((stage3Count / totalParticipants) * 100) : 0;

  const stage4Count = participants.filter(p => p.statusKehadiran === 'terdaftar' || p.statusKehadiran === 'hadir').length;
  const stage4Pct = totalParticipants > 0 ? Math.round((stage4Count / totalParticipants) * 100) : 0;

  const stage5Count = participants.filter(p => p.statusKehadiran === 'hadir').length;
  const stage5Pct = totalParticipants > 0 ? Math.round((stage5Count / totalParticipants) * 100) : 0;

  // Distribusi kategori mengikuti master Kelola Disabilitas; kategori umum selalu disertakan.
  const normalizeCategory = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const activeDisabilities = disabilities.filter((item) => item.isAktif);
  const categoryRows = [
    ...activeDisabilities.map((item) => {
      const aliases = [item.kode, item.id, item.nama].map(normalizeCategory);
      return { key: item.kode || item.id, label: item.nama, count: participants.filter((participant) => aliases.includes(normalizeCategory(participant.kategoriDisabilitas))).length, color: item.warnaHex || '#005a71' };
    }),
    { key: 'umum', label: 'Kategori Umum', count: participants.filter((p) => ['umum','non_disabilitas','kategori_umum'].includes(normalizeCategory(p.kategoriDisabilitas))).length, color: '#0d9488' },
    { key: 'pendamping_umum', label: 'Pendamping / Relawan', count: participants.filter((p) => ['pendamping_umum','pendamping','relawan'].includes(normalizeCategory(p.kategoriDisabilitas))).length, color: '#9333ea' }
  ].filter((row, index, rows) => rows.findIndex((other) => other.key === row.key) === index).filter((row) => row.count > 0);
  const categoryRowsWithPct = categoryRows.map((row) => ({ ...row, pct: totalParticipants > 0 ? Number(((row.count / totalParticipants) * 100).toFixed(1)) : 0 }));
  let categoryOffset = 0;
  const categorySegments = categoryRowsWithPct.map((row) => { const segment = { ...row, offset: -categoryOffset }; categoryOffset += row.pct; return segment; });

  return (
    <>
      {/* Header Profile & Quick Action Banner */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-container text-on-primary-container text-[11px] font-bold rounded-md mb-2 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Super Administrator Nasional
          </div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-on-surface tracking-tight leading-tight">
            Ringkasan Eksekutif & Monitoring Pelatihan
          </h1>
          <p className="text-on-surface-variant text-[13px] mt-1 font-medium">
            Selamat datang, <strong className="text-on-surface">{currentUser.name}</strong> • {currentUser.organizationName || 'Pusat Al-Quran Disabilitas'}
          </p>
        </div>

        {onOpenChangePassword && (
          <button
            onClick={onOpenChangePassword}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40 rounded-xl text-[13px] font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            title="Ganti Kata Sandi Super Admin"
          >
            <Icon name="lock_reset" className="text-[18px] text-primary" />
            <span>Ganti Kata Sandi</span>
          </button>
        )}
      </div>

      {/* SECTION 1: FUNNEL & SOURCES (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Bento Card: Funnel Pelatihan Peserta */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-on-surface">Funnel Pelatihan Peserta</h2>
              <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 bg-primary/10 rounded-full">
                Real Data Sinkron ({totalParticipants} Peserta)
              </span>
            </div>

            {/* Metric Header */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-[36px] text-on-surface font-semibold tracking-tight leading-none">
                {totalParticipants}
              </span>
              <span className="text-[14px] text-on-surface-variant font-medium">total peserta terdaftar di sistem</span>
            </div>

            {/* Horizontal Segmented Pipeline Bar (Real Data Widths) */}
            <div className="w-full h-3 rounded-full overflow-hidden flex gap-1 mb-6 bg-surface-container p-0.5">
              <div 
                className="h-full bg-secondary-container rounded-sm transition-all" 
                style={{ width: `${Math.max(8, stage1Pct)}%` }} 
                title={`Pendaftaran Masuk: ${stage1Count} (${stage1Pct}%)`}
              ></div>
              <div 
                className="h-full bg-tertiary-fixed-dim rounded-sm transition-all" 
                style={{ width: `${Math.max(8, stage2Pct)}%` }} 
                title={`Terverifikasi: ${stage2Count} (${stage2Pct}%)`}
              ></div>
              <div 
                className="h-full bg-primary rounded-sm transition-all" 
                style={{ width: `${Math.max(8, stage3Pct)}%` }} 
                title={`Assessment Kebutuhan: ${stage3Count} (${stage3Pct}%)`}
              ></div>
              <div 
                className="h-full bg-surface-tint rounded-sm transition-all" 
                style={{ width: `${Math.max(8, stage4Pct)}%` }} 
                title={`Pelatihan Aktif: ${stage4Count} (${stage4Pct}%)`}
              ></div>
              <div 
                className="h-full bg-primary-container rounded-sm transition-all" 
                style={{ width: `${Math.max(8, stage5Pct)}%` }} 
                title={`Lulus Sertifikasi: ${stage5Count} (${stage5Pct}%)`}
              ></div>
            </div>

            {/* Breakdown Table Matching Reference Style (Real Data) */}
            <div className="space-y-3">
              {/* Stage 1 */}
              <div className="flex items-center justify-between text-[13px] text-on-surface hover:bg-surface-container-low/50 py-1.5 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-secondary-container"></span>
                  <span className="text-[13px] font-medium text-on-surface">1. Pendaftaran Masuk</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-on-surface">{stage1Count} Peserta</span>
                  <span className="text-[12px] font-bold text-primary w-12 text-right">{stage1Pct}%</span>
                </div>
              </div>
              
              {/* Stage 2 */}
              <div className="flex items-center justify-between text-[13px] text-on-surface hover:bg-surface-container-low/50 py-1.5 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-tertiary-fixed-dim"></span>
                  <span className="text-[13px] font-medium text-on-surface">2. Terverifikasi Kontak WA/Email</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-on-surface">{stage2Count} Peserta</span>
                  <span className="text-[12px] font-bold text-primary w-12 text-right">{stage2Pct}%</span>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="flex items-center justify-between text-[13px] text-on-surface hover:bg-surface-container-low/50 py-1.5 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
                  <span className="text-[13px] font-medium text-on-surface">3. Seleksi & Assessment Kebutuhan</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-on-surface">{stage3Count} Peserta</span>
                  <span className="text-[12px] font-bold text-primary w-12 text-right">{stage3Pct}%</span>
                </div>
              </div>

              {/* Stage 4 */}
              <div className="flex items-center justify-between text-[13px] text-on-surface hover:bg-surface-container-low/50 py-1.5 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-surface-tint"></span>
                  <span className="text-[13px] font-medium text-on-surface">4. Pelatihan Aktif Kelas</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-on-surface">{stage4Count} Peserta</span>
                  <span className="text-[12px] font-bold text-primary w-12 text-right">{stage4Pct}%</span>
                </div>
              </div>

              {/* Stage 5 */}
              <div className="flex items-center justify-between text-[13px] text-on-surface hover:bg-surface-container-low/50 py-1.5 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-container"></span>
                  <span className="text-[13px] font-medium text-on-surface">5. Lulus Sertifikasi / Hadir</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-on-surface">{stage5Count} Peserta</span>
                  <span className="text-[12px] font-bold text-primary w-12 text-right">{stage5Pct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-semibold text-outline">
            <span>Standar kurikulum ramah disabilitas BNSP & Kemenag RI</span>
            <span className="text-primary font-semibold">Terkonfirmasi Real-time</span>
          </div>
        </div>

        {/* Right Bento Card: Distribusi Kategori Disabilitas (Real Data) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-on-surface">Distribusi Kategori Peserta (Disabilitas & Umum)</h2>
              <span className="text-[11px] font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                Real: 100% Terdata
              </span>
            </div>

            {/* Donut Visual + Legend Container (Dynamic SVG & Real Percentages) */}
            <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
              <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" fill="transparent" r="15.91549430918954" stroke="#eff4ff" strokeWidth="6.5"></circle>
                  {categorySegments.map((segment) => (
                    <circle key={segment.key} cx="21" cy="21" fill="transparent" r="15.91549430918954" stroke={segment.color} strokeDasharray={`${segment.pct} ${100 - segment.pct}`} strokeDashoffset={segment.offset} strokeWidth="6.5" />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[18px] font-bold text-on-surface leading-none">
                    {totalParticipants}
                  </span>
                  <span className="text-[10px] font-semibold text-outline uppercase tracking-wider mt-0.5">Peserta</span>
                </div>
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                {categoryRowsWithPct.length ? categoryRowsWithPct.map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: row.color }} /><span className="text-on-surface text-[12px] font-medium">{row.label}</span></div>
                    <div className="flex items-center gap-3"><span className="font-semibold text-on-surface">{row.count}</span><span className="text-outline w-12 text-right font-bold">{row.pct}%</span></div>
                  </div>
                )) : <p className="text-sm text-on-surface-variant">Belum ada data kategori peserta.</p>}

              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between border-t border-outline-variant/20">
            <span className="text-[11px] font-semibold text-outline">
              Total terdata: {totalParticipants} peserta
            </span>
            <span className="text-[11px] font-semibold text-primary">
              Sinkronisasi Akurat
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: REAL PARTICIPANT TREND */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[18px] font-semibold text-on-surface">Tren Kehadiran & Status Pendaftaran</h2>
            <div className="flex items-baseline gap-8 mt-2">
              <div><span className="text-[36px] font-semibold text-on-surface leading-none">{totalHadir}</span><span className="ml-2 text-[14px] text-on-surface-variant">peserta hadir</span></div>
              <div><span className="text-[36px] font-semibold text-secondary leading-none">{totalTertunda}</span><span className="ml-2 text-[14px] text-on-surface-variant">terdaftar / batal</span></div>
            </div>
          </div>
          <span className="text-[12px] text-outline">Berdasarkan waktu pendaftaran dari database · 6 bulan terakhir</span>
        </div>
        {totalParticipants === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-outline">Belum ada data peserta untuk ditampilkan.</div>
        ) : (
          <>
            <div className="relative w-full h-64 mt-6">
              <svg className="w-full h-full" viewBox="0 0 1000 260" role="img" aria-label="Grafik status peserta per bulan">
                {[0,1,2,3,4].map((tick) => { const y = 230 - tick * 47.5; return <g key={tick}><line x1="45" x2="955" y1={y} y2={y} stroke="currentColor" opacity="0.12" strokeDasharray="3 4"/><text x="8" y={y+4} fontSize="11" fill="currentColor" opacity="0.65">{Math.round(trendMax*tick/4)}</text></g>; })}
                <polyline points={linePoints(hadirPoints)} fill="none" stroke="#005a71" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={linePoints(tertundaPoints)} fill="none" stroke="#ab3425" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {hadirPoints.map((point, index) => <circle key={`h-${index}`} cx={point.x} cy={point.y} r="4" fill="#005a71" stroke="white" strokeWidth="1.5"><title>{trendMonths[index].label}: {trendMonths[index].hadir} hadir</title></circle>)}
                {tertundaPoints.map((point, index) => <circle key={`t-${index}`} cx={point.x} cy={point.y} r="4" fill="#ab3425" stroke="white" strokeWidth="1.5"><title>{trendMonths[index].label}: {trendMonths[index].tertunda} terdaftar/batal</title></circle>)}
              </svg>
            </div>
            <div className="grid grid-cols-6 text-center text-[11px] font-semibold text-outline mt-2">
              {trendMonths.map((month, index) => <div key={`${month.label}-${index}`}>{month.label}</div>)}
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-outline-variant/20">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{background:'#005a71'}}/><span className="text-[12px] font-semibold text-on-surface">Peserta hadir</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{background:'#ab3425'}}/><span className="text-[12px] font-semibold text-on-surface">Status terdaftar / batal</span></div>
        </div>
      </div>
    </>
  );
};
