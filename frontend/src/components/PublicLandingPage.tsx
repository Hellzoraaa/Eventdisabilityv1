import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Icon } from './Icon.tsx';
import { TrainingProposal, Participant, QuranCommunity, DisabilityMaster, EventCategory, User, ApplicationSettings, TPQProgram } from '../types.ts';
import { QuranEmblemLogo } from './QuranEmblemLogo.tsx';
import { PetaPersebaran } from './PetaPersebaran.tsx';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { EventDetailModal } from './EventDetailModal.tsx';
import { openEventPage } from './EventDetailPage.tsx';
import { TpqNavMenu } from './TpqNavMenu.tsx';
import { TPQHomeSection, openTPQPage, isTPQPublished, tpqToMapItem, isTPQMapId, tpqIdFromMapId } from './TPQHomeSection.tsx';

interface PublicLandingPageProps {
  events: TrainingProposal[];
  tpqPrograms?: TPQProgram[];
  communities: QuranCommunity[];
  disabilities?: DisabilityMaster[];
  eventCategories?: EventCategory[];
  users?: User[];
  currentUser: User | null;
  appSettings?: ApplicationSettings;
  onOpenLogin: (roleHint?: 'mitra' | 'superadmin') => void;
  onRegisterSuccess: (participant: Participant) => void;
  onNavigateToDashboard?: () => void;
  onLogAction?: (action: string, module: string, detail: string, status?: 'info' | 'success' | 'warning' | 'error') => void;
  selectedEventIdFromMap?: string | null;
  onClearSelectedEventId?: () => void;
  onAddNewCommunity?: (comm: Partial<QuranCommunity>) => void | Promise<void>;
}

// Crisp SVG Flag Components matching Screenshot 259
const IndonesiaFlag: React.FC<{ className?: string }> = ({ className = "w-[20px] h-[13.5px]" }) => (
  <span className={`${className} inline-flex rounded-[2px] shadow-2xs border border-slate-300/80 overflow-hidden shrink-0 flex-col leading-none`}>
    <span className="w-full h-1/2 bg-[#dc2626]" />
    <span className="w-full h-1/2 bg-[#ffffff]" />
  </span>
);


const SingaporeFlag: React.FC<{ className?: string }> = ({ className = "w-[20px] h-[13.5px]" }) => (
  <svg className={`${className} inline-block rounded-[2px] shadow-2xs border border-slate-300/80 overflow-hidden shrink-0`} viewBox="0 0 24 16" fill="none">
    <rect width="24" height="8" fill="#dc2626" />
    <rect y="8" width="24" height="8" fill="#ffffff" />
    {/* Crescent */}
    <circle cx="4.2" cy="4" r="2.6" fill="#ffffff" />
    <circle cx="5" cy="4" r="2.2" fill="#dc2626" />
    {/* 5 Stars */}
    <circle cx="5.2" cy="2.5" r="0.45" fill="#ffffff" />
    <circle cx="6.4" cy="3.3" r="0.45" fill="#ffffff" />
    <circle cx="6.1" cy="4.8" r="0.45" fill="#ffffff" />
    <circle cx="4.7" cy="4.8" r="0.45" fill="#ffffff" />
    <circle cx="4.4" cy="3.3" r="0.45" fill="#ffffff" />
  </svg>
);

const EnglandFlag: React.FC<{ className?: string }> = ({ className = "w-[20px] h-[13.5px]" }) => (
  <svg className={`${className} inline-block rounded-[2px] shadow-2xs border border-slate-300/80 overflow-hidden shrink-0`} viewBox="0 0 60 36" fill="none">
    <rect width="60" height="36" fill="#012169" />
    <path d="M0 0 L60 36 M60 0 L0 36" stroke="#ffffff" strokeWidth="7" />
    <path d="M0 0 L60 36 M60 0 L0 36" stroke="#C8102E" strokeWidth="4" />
    <path d="M30 0 v36 M0 18 h60" stroke="#ffffff" strokeWidth="11" />
    <path d="M30 0 v36 M0 18 h60" stroke="#C8102E" strokeWidth="7" />
  </svg>
);

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  events,
  tpqPrograms = [],
  communities,
  disabilities = [],
  eventCategories = [],
  users = [],
  currentUser,
  appSettings,
  onOpenLogin,
  onRegisterSuccess,
  onNavigateToDashboard,
  onLogAction,
  selectedEventIdFromMap,
  onClearSelectedEventId,
  onAddNewCommunity,
}) => {
  // Program TPQ yang sudah disetujui + diizinkan publikasi (tampil di homepage dan peta)
  const publishedTPQ = useMemo(() => tpqPrograms.filter(isTPQPublished), [tpqPrograms]);
  const mapEvents = useMemo(
    () => [...events, ...publishedTPQ.filter(p => Number(p.latitude) && Number(p.longitude)).map(tpqToMapItem)],
    [events, publishedTPQ]
  );
  const openTPQFromMap = (mapId: string) => {
    const found = publishedTPQ.find(p => p.id === tpqIdFromMapId(mapId));
    if (found) openTPQPage(found.id);
  };

  // Dynamic Event Categories
  const [categoriesList, setCategoriesList] = useState<EventCategory[]>(eventCategories || []);

  useEffect(() => {
    if (eventCategories && eventCategories.length > 0) {
      setCategoriesList(eventCategories);
    }
  }, [eventCategories]);

  useEffect(() => {
    if (!eventCategories || eventCategories.length === 0) {
      fetch('/api/event-categories')
        .then(res => res.json())
        .then(data => {
          const items = data.categories || data.data || [];
          if (items.length > 0) setCategoriesList(items);
        })
        .catch(console.error);
    }
  }, []);

  const activeEventCategories = useMemo(() => {
    const active = categoriesList.filter(c => c.isAktif !== false);
    if (active.length > 0) return active;
    return [
    ];
  }, [categoriesList]);
  const activeEvents = useMemo(() => {
    return events
      .filter(e => e.isAktif || e.status === 'disetujui')
      .map(ev => {
        // Resolve latest user data (organizationLogo and organizationName)
        const matchedUser = users.find(
          u =>
            (u.id && (u.id === ev.mitraId || u.id === ev.mitraIdString)) ||
            (u.organizationName && ev.mitraOrg && u.organizationName.toLowerCase() === ev.mitraOrg.toLowerCase()) ||
            (u.name && ev.mitraName && u.name.toLowerCase() === ev.mitraName.toLowerCase())
        );

        const enrichedLogo = matchedUser?.organizationLogo || ev.mitraLogo || ev.logoUrl;
        const enrichedOrg = matchedUser?.organizationName || ev.mitraOrg || ev.mitraName;

        return {
          ...ev,
          mitraLogo: enrichedLogo,
          logoUrl: enrichedLogo,
          mitraOrg: enrichedOrg,
        };
      });
  }, [events, users]);

  // Search & Filter States
  const [heroSearch, setHeroSearch] = useState('');
  const [heroLocation, setHeroLocation] = useState('');

  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterDisability, setFilterDisability] = useState('Semua');
  const [filterCity, setFilterCity] = useState('Semua');

  const [facilityJBI, setFacilityJBI] = useState(false);
  const [facilityWheelchair, setFacilityWheelchair] = useState(false);
  const [facilityBraille, setFacilityBraille] = useState(false);
  const [facilityOnline, setFacilityOnline] = useState(false);

  // Map Filter state
  const [mapSearch, setMapSearch] = useState('');
  const [mapCategory, setMapCategory] = useState<'all' | 'tunanetra' | 'tunarungu' | 'tunadaksa' | 'intelektual'>('all');

  // Enhanced Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTopic, setContactTopic] = useState('Informasi Pendaftaran Event');
  const [contactSenderRole, setContactSenderRole] = useState<'peserta' | 'pendamping' | 'mitra' | 'umum'>('peserta');
  const [contactDisabilityType, setContactDisabilityType] = useState('Semua / Umum');
  const [contactMessage, setContactMessage] = useState('');
  const [contactDisabilityFormat, setContactDisabilityFormat] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactTicketId, setContactTicketId] = useState('');
  const [copiedContactItem, setCopiedContactItem] = useState<string | null>(null);
  const [activeContactFaq, setActiveContactFaq] = useState<number | null>(null);

  // Articles Modal State
  const [isArticlesModalOpen, setIsArticlesModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{ title: string; category: string; content: string; date: string } | null>(null);

  // Registration & Detail Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<TrainingProposal | null>(null);
  const [modalStep, setModalStep] = useState<'detail' | 'form' | 'finished_status'>('detail');
  const [regName, setRegName] = useState('');
  const [regWa, setRegWa] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regDisability, setRegDisability] = useState<string>('tunanetra');
  const [regFacilities, setRegFacilities] = useState<string[]>([]);
  const [regNotes, setRegNotes] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<Participant | null>(null);

  // Scroll to top visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Language Switcher State (Indonesian & English)
  const [currentLang, setCurrentLang] = useState<'id' | 'en'>('id');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Mobile Nav Drawer
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Filter Program TPQ dari menu navbar (Tunanetra / Tunarungu / Tunanetra Dan Tunarungu)
  const [tpqPesertaRequest, setTpqPesertaRequest] = useState<{ label: string; n: number } | null>(null);
  const handleTpqSelect = (jenisPeserta: string) => {
    setTpqPesertaRequest(prev => ({ label: jenisPeserta, n: (prev?.n ?? 0) + 1 }));
    setTimeout(() => document.getElementById('program-tpq')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Mitra Feature States
  const [selectedMitraDetail, setSelectedMitraDetail] = useState<QuranCommunity | null>(null);
  // Master kategori disabilitas dari Dashboard Admin
  const [disabilityCategories, setDisabilityCategories] = useState<any[]>([]);
  


  useEffect(() => {
    const loadDisabilityCategories = async () => {
      try {
        const response = await fetch('/api/disabilities');

        if (!response.ok) {
          throw new Error('Gagal mengambil kategori disabilitas');
        }

        const data = await response.json();

        const categories = Array.isArray(data.disabilities)
          ? data.disabilities
          : Array.isArray(data.data)
            ? data.data
            : [];

        // Hanya kategori yang aktif yang ditampilkan di halaman publik
        setDisabilityCategories(
          categories.filter((item: any) => item.isAktif !== false)
        );
      } catch (error) {
        console.error('Gagal memuat kategori disabilitas:', error);
        setDisabilityCategories([]);
      }
    };

    loadDisabilityCategories();
  }, []);



  // Active disabilities list from master data (props or fetched from dashboard/database)
  const activeDisabilities = useMemo(() => {
    if (disabilities && disabilities.length > 0) {
      return disabilities.filter(d => d.isAktif !== false);
    }
    if (disabilityCategories && disabilityCategories.length > 0) {
      return disabilityCategories.filter(d => d.isAktif !== false);
    }
    return [];
  }, [disabilities, disabilityCategories]);

  // Mitra communities are displayed directly without landing-page filters.
  const filteredMitra = communities;

  // Keep regDisability in sync with available active disabilities
  React.useEffect(() => {
    if (activeDisabilities.length > 0 && !activeDisabilities.some(d => d.kode === regDisability)) {
      setRegDisability(activeDisabilities[0].kode);
    }
  }, [activeDisabilities, regDisability]);

  // If event selected from outside
  React.useEffect(() => {
    if (selectedEventIdFromMap) {
      const target = activeEvents.find(e => e.id === selectedEventIdFromMap);
      if (target) {
        openEventPage(target.id, 'detail');
        setActiveModalEvent(null);
        setModalStep('detail');
        if (onClearSelectedEventId) onClearSelectedEventId();
      }
    }
  }, [selectedEventIdFromMap, activeEvents, onClearSelectedEventId]);

  // Cities extracted
          const cities = useMemo(() => {
          const cityMap = new Map<string, string>();

          activeEvents.forEach(event => {
            const rawCity = String(event.kota || '').trim();

            if (!rawCity) return;

            const normalizedCity = rawCity
              .replace(/\s+/g, ' ')
              .toLowerCase();

            if (!cityMap.has(normalizedCity)) {
              cityMap.set(normalizedCity, rawCity);
            }
          });

          return [
            'Semua',
            ...Array.from(cityMap.values()).sort((a, b) =>
              a.localeCompare(b, 'id')
            ),
          ];
        }, [activeEvents]);

  // Keep filterCategory in sync if a category was deleted or renamed by Super Admin
  useEffect(() => {
    if (filterCategory !== 'Semua' && activeEventCategories.length > 0) {
      const exists = activeEventCategories.some(
        c => c.kode.toLowerCase() === filterCategory.toLowerCase() ||
          c.nama.toLowerCase() === filterCategory.toLowerCase()
      );
      if (!exists) {
        setFilterCategory('Semua');
      }
    }
  }, [activeEventCategories, filterCategory]);

  // Filtered Events logic
  const filteredEvents = useMemo(() => {
    return activeEvents.filter(ev => {
      // Hero search
      if (heroSearch.trim()) {
        const query = heroSearch.toLowerCase();
        const matchesHero = ev.namaKegiatan.toLowerCase().includes(query) ||
          ev.deskripsiPelatihan.toLowerCase().includes(query) ||
          ev.jenisEvent.toLowerCase().includes(query);
        if (!matchesHero) return false;
      }
      if (heroLocation.trim()) {
        const loc = heroLocation.toLowerCase();
        const matchesLoc = ev.kota.toLowerCase().includes(loc) ||
          ev.lokasiDanAlamat.toLowerCase().includes(loc);
        if (!matchesLoc) return false;
      }

      // Filter box keyword
      if (filterKeyword.trim()) {
        const query = filterKeyword.toLowerCase();
        const matchesKw = ev.namaKegiatan.toLowerCase().includes(query) ||
          ev.deskripsiPelatihan.toLowerCase().includes(query);
        if (!matchesKw) return false;
      }

     // Filter category berdasarkan ID kategori event dari database
        if (filterCategory !== 'Semua') {
          const selectedCat = activeEventCategories.find(
            c =>
              String(c.kode || '').toLowerCase() === filterCategory.toLowerCase() ||
              String(c.nama || '').toLowerCase() === filterCategory.toLowerCase() ||
              String(c.id || '') === filterCategory
          );

          if (selectedCat) {
            const eventCategoryId = String(
              (ev as any).eventCategoryId ||
              (ev as any).eventCategoryIdString ||
              ''
            ).trim();

            const selectedCategoryId = String(
              selectedCat.id || ''
            ).trim();

            // Event hanya boleh lolos jika ID kategori event
            // sama persis dengan ID kategori yang dipilih.
            if (
              !eventCategoryId ||
              !selectedCategoryId ||
              eventCategoryId !== selectedCategoryId
            ) {
              return false;
            }
          } else {
            return false;
          }
        }

      // Filter disability berdasarkan ID master disabilitas di database
          if (filterDisability !== 'Semua') {
            const selectedDis = activeDisabilities.find(
              d =>
                String(d.kode || '').toLowerCase() === filterDisability.toLowerCase() ||
                String(d.nama || '').toLowerCase() === filterDisability.toLowerCase() ||
                String(d.id || '') === filterDisability
            );

            if (selectedDis) {
              // Event menyimpan relasi langsung ke master disabilities
              // melalui training_proposals.disability_id_string
              const eventDisabilityId = String((ev as any).disabilityId || '').trim();
              const selectedDisabilityId = String(selectedDis.id || '').trim();

              // Untuk kategori disabilitas tertentu:
              // HARUS cocok berdasarkan ID, bukan berdasarkan kata di deskripsi.
              if (eventDisabilityId !== selectedDisabilityId) {
                return false;
              }
            } else {
              return false;
            }
          }

        // Filter city berdasarkan field kota event dari database
      if (filterCity !== 'Semua') {
        const eventCity = String(ev.kota || '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();

        const selectedCity = String(filterCity || '')
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase();

        if (!eventCity || eventCity !== selectedCity) {
          return false;
        }
      }

          // Checkbox facilities
            if (facilityJBI) {
              const hasJBI = ev.kebutuhanPeserta.some(k => k.toLowerCase().includes('isyarat') || k.toLowerCase().includes('jbi'));
              if (!hasJBI) return false;
            }
            if (facilityWheelchair) {
              const hasWheelchair = ev.kebutuhanPeserta.some(k => k.toLowerCase().includes('kursi roda') || k.toLowerCase().includes('ramp'));
              if (!hasWheelchair) return false;
            }
            if (facilityBraille) {
              const hasBraille = ev.kebutuhanPeserta.some(k => k.toLowerCase().includes('braille') || k.toLowerCase().includes('netra'));
              if (!hasBraille) return false;
            }
            if (facilityOnline) {
              const isOnline = ev.lokasiDanAlamat.toLowerCase().includes('online') || ev.lokasiDanAlamat.toLowerCase().includes('daring') || ev.namaKegiatan.toLowerCase().includes('online');
              if (!isOnline) return false;
            }

      return true;
    });
  }, [
    activeEvents,
    heroSearch,
    heroLocation,
    filterKeyword,
    filterCategory,
    filterDisability,
    filterCity,
    facilityJBI,
    facilityWheelchair,
    facilityBraille,
    facilityOnline,
  ]);

  const handleOpenDetailModal = (ev: TrainingProposal, step: 'detail' | 'form' = 'detail') => {
    openEventPage(ev.id, step);
    setActiveModalEvent(null);
    setModalStep(step);
    setLastRegistered(null);
    setRegName('');
    setRegWa('');
    setRegEmail('');
    setRegAge('');
    setRegNotes('');
    setRegFacilities([]);
  };

  const toggleRegFacility = (facility: string) => {
    setRegFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalEvent || !regName.trim() || !regWa.trim()) return;

    setIsSubmittingReg(true);
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: activeModalEvent.id,
          namaLengkap: regName.trim(),
          noWa: regWa.trim(),
          email: regEmail.trim(),
          usia: regAge ? parseInt(regAge, 10) : undefined,
          kategoriDisabilitas: regDisability,
          kebutuhanFasilitas: regFacilities,
          catatanKhusus: regNotes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal mendaftarkan peserta.');
      }

      const resData = await response.json();
      const newParticipant: Participant = resData.participant || resData;
      setLastRegistered(newParticipant);
      onRegisterSuccess(newParticipant);

      // Instantly update active modal event quota so popup counter increases
      if (activeModalEvent) {
        setActiveModalEvent(prev => prev ? {
          ...prev,
          jumlahPendaftar: (Number(prev.jumlahPendaftar) || 0) + 1,
        } : null);
      }
      setModalStep('finished_status');

      if (onLogAction) {
        onLogAction(
          'Pendaftaran Mandiri Peserta',
          'participants',
          `Peserta "${newParticipant.namaLengkap}" berhasil mendaftar pada kegiatan "${activeModalEvent.namaKegiatan}".`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim pendaftaran. Silakan coba kembali.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleCopyContact = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedContactItem(label);
      setTimeout(() => setCopiedContactItem(null), 2500);
    }
  };

  const isOfficeOpenNow = useMemo(() => {
    // Operational hours: Mon-Fri 08:00 - 17:00 WIB (UTC+7)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibDate = new Date(utc + (3600000 * 7));
    const day = wibDate.getDay(); // 0 = Sun, 6 = Sat
    const hour = wibDate.getHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    const generatedTicket = 'CS-' + Math.floor(100000 + Math.random() * 900000);
    setContactTicketId(generatedTicket);

    setTimeout(() => {
      setContactLoading(false);
      setContactSuccess(true);
      if (onLogAction) {
        onLogAction(
          'Pesan Kontak Layanan',
          'support',
          `Pengunjung "${contactName}" (${contactEmail}, ${contactPhone || '-'}) [${contactSenderRole}] tiket #${generatedTicket} topik "${contactTopic}" (${contactDisabilityType}).`,
          'info'
        );
      }
    }, 700);
  };

  const handleResetContactForm = () => {
    setContactSuccess(false);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactMessage('');
    setContactDisabilityFormat(false);
  };

  const articlesData = [
    {
      title: 'Panduan Mudah Mengenal Al-Quran Braille Standar Indonesia',
      category: 'Disabilitas Netra',
      date: '15 September 2024',
      content:
        'Al-Quran Braille di Indonesia mengacu pada standar resmi Kementerian Agama RI dengan sistem 6 titik timbul yang memudahkan para tunanetra membaca dengan sentuhan ujung jari. Pelajari tanda harakat, tajwid braille, dan panduan dasar belajarnya di sini.',
    },
    {
      title: 'Metode Pembelajaran Huruf Hijaiyah Isyarat (BISINDO & SIBI)',
      category: 'Disabilitas Rungu / Tuli',
      date: '10 September 2024',
      content:
        'Pembelajaran Al-Quran bagi teman Tuli kini semakin inklusif berkat pengembangan isyarat hijaiyah dan tafsir isyarat Al-Quran. Melalui visualisasi makhraj huruf dan ekspresi gerak tangan, pemahaman makna ayat suci dapat dicapai dengan komprehensif.',
    },
    {
      title: 'Standarisasi Aksesibilitas Fisik Rumah Quran & Masjid Inklusif',
      category: 'Disabilitas Daksa & Fisik',
      date: '02 September 2024',
      content:
        'Mewujudkan rumah quran ramah disabilitas daksa mencakup pembuatan ramp dengan kemiringan maksimal 1:12, handrail pemandu, pintu minimal lebar 90cm, dan toilet wudhu ramah kursi roda.',
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-white text-slate-800">
      {/* 1. TOP NAVBAR - Matching reference image exactly */}
      <nav
        className="sticky top-0 z-40 w-full border-b transition-colors shadow-2xs"
        style={{
          backgroundColor: appSettings?.topbarColor || '#ffffff',
          borderColor: appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
          color: appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? '#ffffff' : '#1e293b',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            {appSettings?.logo ? (
              <img
                src={appSettings.logo}
                alt={appSettings.applicationName || 'Logo Aplikasi'}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <QuranEmblemLogo size="md" />
            )}
            <div className="flex flex-col">
              <span
                className={`font-bold text-[17px] sm:text-[19px] tracking-tight leading-tight ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white' : 'text-slate-900'
                  }`}
              >
                {appSettings?.applicationName || "Event for Disability to Qur'an"}
              </span>
              <span
                className={`text-[11px] font-medium hidden sm:inline ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white/80' : 'text-slate-500'
                  }`}
              >
                {appSettings?.institutionSubtitle || "Platform Pelatihan & Pemberdayaan Sahabat Disabilitas"}
              </span>
            </div>
          </div>

          {/* Nav Items & Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div
              className={`hidden lg:flex items-center gap-6 text-[14px] font-medium ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff' ? 'text-white/90' : 'text-slate-600'
                }`}
            >
              <a href="#tentang-kami" className="hover:opacity-80 transition-opacity">
                {currentLang === 'id' ? 'Tentang Kami' : 'About Us'}
              </a>
              <a href="#katalog-event" className="hover:opacity-80 transition-opacity">
                {currentLang === 'id' ? 'Cari Event' : 'Find Events'}
              </a>
              <TpqNavMenu
                variant="desktop"
                label={currentLang === 'id' ? 'Pendidikan' : 'Education'}
                onSelect={handleTpqSelect}
              />
              <a href="#peta-lokasi" className="hover:opacity-80 transition-opacity">
                {currentLang === 'id' ? 'Peta Lokasi' : 'Location Map'}
              </a>
              <a
                href="#mitra"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('mitra')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:opacity-80 transition-opacity"
              >
                {currentLang === 'id' ? 'Mitra' : 'Partners'}
              </a>
              <a href="#kontak-kami" className="hover:opacity-80 transition-opacity">
                {currentLang === 'id' ? 'Kontak' : 'Contact'}
              </a>
              <button
                type="button"
                onClick={() => setIsArticlesModalOpen(true)}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                {currentLang === 'id' ? 'Artikel' : 'Articles'}
              </button>
            </div>

            {/* Language Flag Dropdown */}
            <div ref={langDropdownRef} className="relative flex items-center">
              {/* Language Trigger */}
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-white select-none group"
                aria-label="Pilih Bahasa / Select Language"
                aria-expanded={isLangDropdownOpen}
                aria-haspopup="menu"
              >
                {currentLang === 'id' ? (
                  <IndonesiaFlag className="w-[21px] h-[14px]" />
                ) : (
                  <EnglandFlag className="w-[21px] h-[14px]" />
                )}

                <span className="font-extrabold text-[13.5px] text-white tracking-tight">
                  {currentLang === 'id' ? 'ID' : 'EN'}
                </span>

                <Icon name="keyboard_arrow_down" className="text-[18px] text-white/90 leading-none transition-transform duration-200" style={{
                    transform: isLangDropdownOpen ? 'rotate(180deg)' : 'none',
                  }} aria-hidden="true" />
              </button>

              {/* Language Selection Popup */}
              {isLangDropdownOpen && (
                <div
                  className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-60 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 z-50 animate-in fade-in-50 zoom-in-95 text-slate-800"
                  role="menu"
                  aria-label="Pilihan Bahasa"
                >
                  <div className="text-[14px] font-bold text-slate-900 mb-3 px-1">
                    Select Language
                  </div>

                  <div className="space-y-1">
                    {/* Bahasa Indonesia */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCurrentLang('id');
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-bold transition-colors cursor-pointer ${currentLang === 'id'
                        ? 'text-[#005a36] bg-emerald-50/60'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IndonesiaFlag className="w-[21px] h-[14px]" />
                        <span>Bahasa Indonesia</span>
                      </div>

                      {currentLang === 'id' && (
                        <span
                          className="text-[#005a36] font-extrabold text-[15px]"
                          aria-label="Bahasa Indonesia dipilih"
                        >
                          ✓
                        </span>
                      )}
                    </button>

                    {/* English */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCurrentLang('en');
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[13.5px] font-bold transition-colors cursor-pointer ${currentLang === 'en'
                        ? 'text-[#005a36] bg-emerald-50/60'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <EnglandFlag className="w-[21px] h-[14px]" />
                        <span>English</span>
                      </div>

                      {currentLang === 'en' && (
                        <span
                          className="text-[#005a36] font-extrabold text-[15px]"
                          aria-label="English dipilih"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>


            {/* Tombol Login (hanya tampil jika belum login).
                Saat sudah login, kembali ke dashboard lewat tombol "Kembali ke Dashboard" di bar atas. */}
            {!currentUser && (
              <button
                onClick={() => onOpenLogin()}
                className={`px-5 py-2.5 rounded-xl text-[13px] sm:text-[14px] font-semibold transition-all cursor-pointer shadow-2xs border ${appSettings?.topbarColor && appSettings.topbarColor !== '#ffffff'
                  ? 'bg-white text-slate-900 border-white hover:bg-slate-100'
                  : 'bg-white border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50'
                  }`}
              >
                Login
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden p-2 rounded-xl border border-slate-200/50 hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center text-slate-800"
              aria-label="Menu"
            >
              <Icon name={isMobileNavOpen ? 'close' : 'menu'} className="text-[24px]" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileNavOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg text-slate-800">
            <div className="flex flex-col space-y-1 text-[14px] font-medium text-slate-700">
              <a
                href="#tentang-kami"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Tentang Kami
              </a>
              <a
                href="#katalog-event"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cari Event & Pelatihan
              </a>
              <TpqNavMenu
                variant="mobile"
                label="Pendidikan"
                onSelect={handleTpqSelect}
                onNavigate={() => setIsMobileNavOpen(false)}
              />
              <a
                href="#peta-lokasi"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Peta Lokasi
              </a>
              <a
                href="#mitra"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  document.getElementById('mitra')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Mitra
              </a>
              <a
                href="#kontak-kami"
                onClick={() => setIsMobileNavOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Kontak
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  setIsArticlesModalOpen(true);
                }}
                className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Artikel & Panduan Inklusi
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {/* Mobile Language Switcher */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                <span className="text-slate-500">Pilih Bahasa / Language:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentLang('id')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${currentLang === 'id' ? 'bg-[#005a36] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                  >
                    <IndonesiaFlag className="w-[18px] h-[12px]" />
                    <span>ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentLang('en')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${currentLang === 'en' ? 'bg-[#005a36] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                  >
                    <EnglandFlag className="w-[18px] h-[12px]" />
                    <span>EN</span>
                  </button>
                </div>
              </div>


            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION - With dynamic background support when set in ApplicationSettings */}
      <div
        className={`w-full relative transition-all min-h-[calc(100vh-5rem)] flex items-center ${appSettings?.headerBgImage ? 'py-12 md:py-16' : 'pt-12 pb-16'
          }`}

        style={
          appSettings?.headerBgImage
            ? {
              backgroundImage: `url(${appSettings.headerBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
            : undefined
        }
      >
        {/* Overlay Layer when Background Photo is active */}
        {appSettings?.headerBgImage && (
          <div
            className={`absolute inset-0 pointer-events-none transition-all ${appSettings.headerBgOverlay === 'none'
              ? 'bg-black/35'
              : appSettings.headerBgOverlay === 'light'
                ? 'bg-white/85 backdrop-blur-[2px]'
                : 'bg-gradient-to-t from-slate-950/90 via-slate-950/75 to-slate-900/65 backdrop-blur-[1px]'
              }`}
          />
        )}

        <section className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Logo Hero Component */}
          <div className="flex flex-col items-center justify-center mb-6">
            {appSettings?.logo ? (
              <img
                src={appSettings.logo}
                alt={appSettings.applicationName || 'Logo Aplikasi'}
                className="w-38 h-38 sm:w-48 sm:h-48 object-contain"
              />
            ) : (
              <div className="p-3.5 bg-white/95 backdrop-blur-xs rounded-2xl shadow-md border border-slate-200/80 inline-flex items-center justify-center hover:scale-105 transition-transform">
                <QuranEmblemLogo size="lg" />
              </div>
            )}
          </div>

          {/* Large Bold Headline */}
          <h1
            className={`text-3xl sm:text-5xl md:text-[54px] font-extrabold tracking-tight leading-[1.15] mb-5 ${appSettings?.headerBgImage && appSettings.headerBgOverlay !== 'light'
              ? 'text-white drop-shadow-md'
              : 'text-slate-900'
              }`}
          >
            Temukan Event dan Pendidikan TPQ <br className="hidden sm:inline" />
            <span
              className={
                appSettings?.headerBgImage && appSettings.headerBgOverlay !== 'light'
                  ? 'text-amber-300'
                  : 'text-slate-900'
              }
            >
              untuk Semua
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-[14px] sm:text-[16px] max-w-3xl leading-relaxed mb-4 ${appSettings?.headerBgImage && appSettings.headerBgOverlay !== 'light'
              ? 'text-slate-100 drop-shadow-xs font-medium'
              : 'text-slate-600'
              }`}
          >
           Ikuti event dan pelatihan bersama rumah Qur’an, pesantren, dan mitra yayasan di seluruh nusantara. Tersedia juga program pendidikan TPQ khusus bagi sahabat tunanetra dan tunarungu.
          </p>
        </section>
      </div>

      {/* 3. SECTION: TENTANG DISABILITY EVENT PLATFORM */}
      <section
        id="tentang-kami"
        className="w-full bg-[#F4F8F3] border-t border-[#DCE8DE]"
      >
        <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

          {/* Section Pill Badge */}
          <div className="mb-4">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-white text-[12px] font-semibold tracking-wide border border-white/20">
              Tentang Disability Event Platform
            </span>
          </div>

          {/* Headline & Description */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">

            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#006316] tracking-tight leading-tight">
                Membangun Jembatan Peluang Setara Bagi Sahabat Disabilitas
              </h2>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between h-full">
              <p className="text-[14px] sm:text-[15px] text-[#006316] leading-relaxed mb-4">
                Platform inklusif nasional yang didedikasikan untuk mempertemukan
                sahabat disabilitas dengan peluang pelatihan kerja, pengembangan
                kompetensi digital, pemberdayaan komunitas, dan kegiatan Al-Quran
                inklusif di seluruh Nusantara.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#katalog-event"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#006316] text-white hover:bg-[#004D11] text-[13px] font-semibold transition-all shadow-sm"
                >
                  <span>Jelajahi Event Pelatihan</span>
                </a>
                <a
                  href="#program-tpq"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#006316] border border-[#006316]/40 hover:bg-emerald-50 text-[13px] font-semibold transition-all"
                >
                  <span>Lihat Katalog Pendidikan</span>
                </a>
              </div>
            </div>

          </div>

          {/* 3 Counter Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12">

            <div className="bg-white border border-[#DCE8DE] rounded-2xl p-6 text-center shadow-sm">
              <span className="block text-4xl sm:text-5xl font-extrabold text-[#006316] leading-none mb-3">
                {activeEvents.length > 0 ? activeEvents.length : 18}
              </span>

              <span className="block text-[13px] font-medium text-slate-600 leading-normal">
                Event Yang Sedang Berlangsung
              </span>
            </div>
            <div className="bg-white/95 border border-white/20 rounded-2xl p-6 text-center shadow-sm">
              <span className="block text-4xl sm:text-5xl font-extrabold text-[#006316] mb-2">
                {activeDisabilities.length > 0
                  ? activeDisabilities.length
                  : disabilities.length > 0
                    ? disabilities.length
                    : 2}
              </span>

              <span className="text-[13px] font-medium text-slate-600">
                Ragam Fasilitas Aksesibilitas
              </span>
            </div>

            <div className="bg-white/95 border border-white/20 rounded-2xl p-6 text-center shadow-sm">
              <span className="block text-4xl sm:text-5xl font-extrabold text-[#006316] mb-2">
                {new Set(communities.map(c => c.provinsi)).size || 8}
              </span>

              <span className="text-[13px] font-medium text-slate-600">
                Cakupan Provinsi & Wilayah
              </span>
            </div>

          </div>

          {/* Two Cards: Visi Kami & Misi Kami */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

            {/* Visi Kami */}
            <div className="bg-white border border-white/20 rounded-3xl p-6 sm:p-8 shadow-sm">

              <div className="flex items-center gap-2.5 mb-4">


                <h3 className="text-[19px] sm:text-[21px] font-bold text-slate-900">
                  Visi Kami
                </h3>
              </div>

              <p className="text-[14px] text-slate-600 leading-relaxed">
                Mewujudkan ekosistem Indonesia yang mandiri, berkeadilan, dan ramah
                disabilitas, di mana setiap individu memiliki kesempatan yang setara
                untuk belajar, mengasah keterampilan vokasional, menumbuhkan
                kepemimpinan, dan meraih masa depan yang bermartabat.
              </p>

            </div>

            {/* Misi Kami */}
            <div className="bg-white border border-white/20 rounded-3xl p-6 sm:p-8 shadow-sm">

              <div className="flex items-center gap-2.5 mb-4">

                <h3 className="text-[19px] sm:text-[21px] font-bold text-slate-900">
                  Misi Kami
                </h3>
              </div>

              <ul className="space-y-3 text-[14px] text-slate-600 leading-relaxed">

                <li className="flex items-start gap-2.5">

                  <span>
                    <strong>Mempermudah Akses Informasi:</strong>{' '}
                    Menyediakan katalog kegiatan terpusat dengan filter akomodasi
                    aksesibilitas yang transparan.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">


                  <span>
                    <strong>Standarisasi Fasilitas Inklusif:</strong>{' '}
                    Membimbing mitra dalam mempersiapkan JBI, materi Braille, dan
                    jalur kursi roda.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">


                  <span>
                    <strong>Peta Quran Terpadu:</strong>{' '}
                    Menjembatani sahabat disabilitas dengan rumah tahfidz dan
                    pengajar Al-Quran inklusif.
                  </span>
                </li>

              </ul>

            </div>

          </div>

        </div>
      </section>

      

      {/* 5. SECTION: EKSPLORASI PELATIHAN INKLUSIF - KATALOG EVENT */}
      <section id="katalog-event" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
            EKSPLORASI PELATIHAN INKLUSIF
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            Katalog Event  
          </h2>
          <p className="text-[14px] text-slate-600">
            Temukan pelatihan yang sesuai dengan minat dan kategori Anda.
          </p>
        </div>

              {/* Filter Card: "Saring Berdasarkan Kebutuhan" */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs mb-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Icon name="tune" className="text-slate-700 text-[20px]" />
            <h3 className="text-[15px] font-bold text-slate-900">
              Saring Berdasarkan Kebutuhan & Sasaran
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterKeyword('');
              setFilterCategory('Semua');
              setFilterDisability('Semua');
              setFilterCity('Semua');
              setFacilityJBI(false);
              setFacilityWheelchair(false);
              setFacilityBraille(false);
              setFacilityOnline(false);
              setHeroSearch('');
              setHeroLocation('');
            }}
            className="px-3.5 py-2 text-[12px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Kata Kunci */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Kata Kunci
            </label>

            <input
              type="text"
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
              placeholder="Judul pelatihan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* Kategori Event */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Kategori Event
            </label>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="Semua">
                Semua Kategori ({activeEventCategories.length})
              </option>

              {activeEventCategories.map(cat => (
                <option key={cat.id || cat.kode} value={cat.kode || cat.nama}>
                  {cat.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori Sasaran / Peserta */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Kategori Peserta
            </label>

            <select
              value={filterDisability}
              onChange={e => setFilterDisability(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="Semua">
                Semua
              </option>

              {activeDisabilities.map(dis => (
                <option key={dis.id || dis.kode} value={dis.kode}>
                  {dis.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Kota / Pelaksanaan */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Kota / Pelaksanaan
            </label>

            <select
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:border-slate-800"
            >
              {cities.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
        {/* Found Count text */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-slate-600">
            Ditemukan <strong className="text-slate-900">{filteredEvents.length}</strong> event pelatihan
          </span>
        </div>

        {/* Event Cards List (Horizontal Layout matching Screenshot 1) */}
        {filteredEvents.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
            <Icon name="event_busy" className="text-[48px] text-slate-400 mb-3" />
            <h4 className="text-[16px] font-bold text-slate-800">Tidak ada event yang sesuai</h4>
            <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau ubah pilihan filter fasilitas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 group"
              >
                {/* Left: Partner / Event Logo Container - Perfectly Fitted */}
                <div className="w-24 sm:w-28 h-20 sm:h-22 shrink-0 flex items-center justify-center p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden group-hover:border-blue-400 group-hover:shadow-xs transition-all">
                  <PartnerLogo
                    name={event.mitraOrg || event.mitraName}
                    logoUrl={event.mitraLogo || event.logoUrl}
                    size="md"
                    className="w-full h-full object-contain border-0 shadow-none p-0"
                  />
                </div>

                {/* Center: Event Details */}
                <div className="flex-1 min-w-0">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold tracking-wide">
                      Buka
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => handleOpenDetailModal(event, 'detail')}
                    className="text-[16px] sm:text-[17.5px] font-bold text-slate-900 leading-snug tracking-tight hover:text-blue-600 transition-colors cursor-pointer mt-0.5"
                  >
                    {event.namaKegiatan}
                  </h3>

                  {/* Subtitle / Category with Verified Blue Checkmark */}
                  <div className="text-[13px] text-slate-600 font-medium mb-3 flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800">{event.mitraOrg || event.mitraName || 'Akademi Quran Disabilitas'}</span>
                    <VerifiedBadge size="xs" />
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-normal">({event.jenisEvent})</span>
                  </div>

                  {/* Meta Row 1 */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Icon name="calendar_month" className="text-[16px] text-slate-400" />
                      <span>{event.tanggalKegiatan}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="menu_book" className="text-[16px] text-slate-400" />
                      <span>{event.jenisEvent} – {event.kategoriDisabilitasUtama || 'Tahfidz & Tahsin'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="location_on" className="text-[16px] text-slate-400" />
                      <span>{event.metodeBelajar || 'Self-Paced (Mandiri)'} / {event.kota}</span>
                    </span>
                  </div>

                  {/* Meta Row 2 */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-slate-600 mt-2">
                    <span className="flex items-center gap-1.5">
                      <Icon name="domain" className="text-[16px] text-slate-400" />
                      <span className="font-semibold text-slate-700">{event.mitraOrg || event.mitraName}</span>
                      <VerifiedBadge size="xs" />
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] border border-slate-200/80 font-medium">
                      <Icon name="info" className="text-[14px] text-slate-500" />
                      <span>Batas Pendaftaran {event.batasPendaftaran || 'Belum ditentukan'}</span>
                    </span>
                  </div>
                </div>

                {/* Right: Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleOpenDetailModal(event, 'detail')}
                    className="px-6 py-2.5 rounded-full bg-[#006316] hover:bg-[#006316] text-white text-[13px] font-bold tracking-wide transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5b. SECTION: PROGRAM PENDIDIKAN TPQ (hanya yang disetujui + diizinkan publikasi) */}
      <TPQHomeSection
        programs={tpqPrograms}
        pesertaRequest={tpqPesertaRequest}
        onOpenDetail={(p) => openTPQPage(p.id)}
      />

      {/* 6. SECTION: PETA LOKASI EVENT PELATIHAN QURAN DISABILITAS */}
      <section id="peta-lokasi" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-100">
        <div className="mb-8">
          <div className="inline-block px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold mb-3">
            Peta Persebaran Lokasi Pelatihan Al-Quran Disabilitas Indonesia
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            Peta Lokasi Pelatihan Al-Quran Sahabat Disabilitas
          </h2>
          <p className="text-[14px] text-slate-600 max-w-3xl">
            Temukan titik persebaran event pelatihan Al-Quran inklusif ramah disabilitas di seluruh nusantara. Filter agenda berdasarkan ragam disabilitas, provinsi, kota, dan kata kunci langsung dari basis data resmi. Klik penanda lokasi pada peta untuk melihat detail agenda.
          </p>
        </div>

        {/* Embedded Interactive Map System (Exclusively Displaying Events) */}
        <PetaPersebaran
          events={mapEvents}
          disabilities={disabilities}
          isEmbedded={true}
          hideAddButton={true}
          isSuperAdmin={currentUser?.role === 'superadmin'}
          onOpenEventDetail={ev => {
            if (isTPQMapId(ev.id)) return openTPQFromMap(ev.id);
            handleOpenDetailModal(ev, 'detail');
          }}
          onSelectEventForRegister={eventId => {
            if (isTPQMapId(eventId)) return openTPQFromMap(eventId);
            const ev = activeEvents.find(e => e.id === eventId);
            if (ev) handleOpenDetailModal(ev, 'form');
          }}
        />
      </section>

      {/* 7. SECTION: FITUR & DIREKTORI MITRA QURAN DISABILITAS */}
      <section id="mitra" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mitra & Yayasan Al-Quran Inklusif
            </h2>
            <p className="text-[14px] text-slate-600 max-w-2xl mt-1.5 leading-relaxed">
              Jaringan pesantren inklusif, majelis taklim, dan yayasan mitra resmi penyelenggara pembelajaran Al-Quran ramah disabilitas se-Indonesia.
            </p>
          </div>
        </div>


        {/* Mitra Cards Grid */}
        {filteredMitra.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 p-8">
            <Icon name="domain_disabled" className="text-[48px] text-slate-300 mx-auto mb-2" />
            <h4 className="text-[16px] font-bold text-slate-800 mb-1">
              Belum Ada Data Mitra
            </h4>
            <p className="text-[13px] text-slate-500 max-w-sm mx-auto">
              Data mitra dan yayasan Al-Quran inklusif belum tersedia.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMitra.map(comm => {
              const activeEventsForThisMitra = activeEvents.filter(
                e => (e.mitraOrg || '').toLowerCase() === comm.namaLembaga.toLowerCase() ||
                  (e.lokasiDanAlamat || '').toLowerCase().includes(comm.namaLembaga.toLowerCase())
              );

              // Lookup matched user or community logo
              const matchedUser = users.find(
                u => (u.organizationName && u.organizationName.toLowerCase() === comm.namaLembaga.toLowerCase()) ||
                  (comm.mitraId && u.id === comm.mitraId) ||
                  (comm.kontakEmail && u.email.toLowerCase() === comm.kontakEmail.toLowerCase())
              );
              const partnerLogoUrl = comm.logo || matchedUser?.organizationLogo;

              return (
                <div
                  key={comm.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {comm.kategoriDisabilitas?.map(k => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/60 uppercase"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0284c7] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/80 shrink-0 shadow-2xs">
                        <VerifiedBadge size="xs" />
                        <span>Mitra Resmi</span>
                      </span>
                    </div>

                    {/* Organization Logo & Header - Fitted Container */}
                    <div className="flex items-start gap-3 mb-2.5">
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden hover:border-blue-400 transition-colors">
                        <PartnerLogo
                          name={comm.namaLembaga}
                          logoUrl={partnerLogoUrl}
                          size="sm"
                          className="w-full h-full object-contain p-0 border-0 shadow-none"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug line-clamp-1 flex items-center gap-1.5" title={comm.namaLembaga}>
                          <span className="truncate">{comm.namaLembaga}</span>
                          <VerifiedBadge size="xs" />
                        </h3>
                        <p className="text-[12px] text-slate-600 flex items-center gap-1 font-medium mt-0.5">
                          <Icon name="location_on" className="text-[14px] text-slate-400" />
                          <span className="truncate">{comm.kota}, {comm.provinsi}</span>
                        </p>
                      </div>
                    </div>

                    {/* Program Unggulan */}
                    {comm.programUnggulan && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[12px] text-slate-700 mb-3">
                        <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-0.5 text-emerald-800">
                          Program Unggulan:
                        </span>
                        <p className="line-clamp-2 leading-relaxed">{comm.programUnggulan}</p>
                      </div>
                    )}

                    {/* Facilities Chips */}
                    {comm.fasilitasTersedia && comm.fasilitasTersedia.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {comm.fasilitasTersedia.slice(0, 3).map((f, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                          >
                            {f}
                          </span>
                        ))}
                        {comm.fasilitasTersedia.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">
                            +{comm.fasilitasTersedia.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    )}

                    {/* Santri Count */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 mb-3">
                      <span className="flex items-center gap-1">
                        <Icon name="group" className="text-[15px] text-slate-400" />
                        <span>{comm.jumlahSantri || 0} Santri Binaan</span>
                      </span>
                      {activeEventsForThisMitra.length > 0 && (
                        <span className="font-semibold text-emerald-700">
                          {activeEventsForThisMitra.length} Event Aktif
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedMitraDetail(comm)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer text-center"
                    >
                      Detail Profil
                    </button>
                    {comm.kontakWa ? (
                      <a
                        href={`https://wa.me/${comm.kontakWa.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Icon name="chat" className="text-[15px]" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          document.getElementById('peta-lokasi')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[12px] font-semibold transition-colors cursor-pointer text-center"
                      >
                        Lihat di Peta
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {/* 3. Bottom Accordion: Frequently Asked Questions (FAQ) */}
        <div className="mt-12 pt-12 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-2">
              <span>{currentLang === 'id' ? 'Pertanyaan Populer' : 'Frequently Asked Questions'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {currentLang === 'id' ? 'Tanya Jawab Seputar Layanan & Event' : 'Quick Answers to Common Inquiries'}
            </h3>
            <p className="text-[13px] text-slate-500 mt-1">
              {currentLang === 'id'
                ? 'Temukan jawaban cepat mengenai pendaftaran, fasilitas ramah disabilitas, dan keikutsertaan mitra.'
                : 'Find instant answers regarding registration, accessibility facilities, and partner participation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {[
              {
                q: currentLang === 'id'
                  ? 'Apakah seluruh pelatihan Al-Quran di platform ini gratis?'
                  : 'Are all Quran training programs on this platform free?',
                a: currentLang === 'id'
                  ? 'Ya! Seluruh kegiatan pelatihan yang terdaftar dari Mitra resmi di platform ini 100% Gratis dan tidak dipungut biaya bagi peserta disabilitas yang memenuhi syarat.'
                  : 'Yes! All disability-inclusive Quran training programs hosted by verified partners are 100% free of charge.',
                icon: 'volunteer_activism',
              },
              {
                q: currentLang === 'id'
                  ? 'Bagaimana jika peserta memerlukan Juru Bahasa Isyarat (JBI) atau Al-Quran Braille?'
                  : 'How can participants request sign language (JBI) or Braille materials?',
                a: currentLang === 'id'
                  ? 'Setiap form pendaftaran event menyediakan opsi checklist fasilitas (JBI BISINDO, Modul Braille, Akses Kursi Roda). Mitra kami akan menyiapkan fasilitas dan relawan pendamping sesuai pilihan Anda.'
                  : 'Each event form has accessibility checkboxes (BISINDO, Braille, Wheelchair). Partners will prepare materials and volunteers accordingly.',
                icon: 'sign_language',
              },
              {
                q: currentLang === 'id'
                  ? 'Bagaimana yayasan / rumah Qur\'an kami mendaftar sebagai Mitra Penyelenggara?'
                  : 'How can our organization register as an Event Organizer Partner?',
                a: currentLang === 'id'
                  ? 'Silahkan Hubungi Kami Melalui Kontak Yang Tersedia. Setelah disetujui Oleh Admin (maks 3x24 jam), Anda dapat langsung mempublikasikan kegiatan pelatihan.'
                  : 'Click "Partner Registration", submit your foundation profile. Once verified by Super Admin (max 24h), you can publish events and manage participants.',
                icon: 'domain_add',
              },
            ].map((faq, idx) => {
              const isOpen = activeContactFaq === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl transition-all overflow-hidden ${isOpen
                    ? 'bg-emerald-50/50 border-emerald-300/80 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveContactFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon name={faq.icon} className="text-[#006316] text-[20px] shrink-0 mt-0.5" />
                      <span className="text-[13.5px] font-bold text-slate-800 leading-snug">
                        {faq.q}
                      </span>
                    </div>
                    <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-slate-400 text-[20px] shrink-0 transition-transform" />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-[13px] text-slate-600 leading-relaxed border-t border-emerald-100/80">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      
      

      {/* 8. SECTION: HUBUNGI TIM DISABILITY EVENT (PROFESSIONAL, CLEAN & ACCESSIBLE) */}
      <section id="kontak-kami" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-200/80 scroll-mt-12">
        {/* Subtle Ambient Background Lighting */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-r from-emerald-100/30 via-teal-50/20 to-emerald-50/30 blur-3xl opacity-60 -z-10 rounded-full" />

        {/* Main 2-Column Grid: Left (Info & Photo) & Right (Form) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-16">

          {/* Left Column: Heading with Accent Bar, Descriptive Text, Visual Photo & Quick Support Cards */}
          <div className="lg:col-span-5 space-y-6">

            
            {/* Heading with Vertical Accent Line */}
            <div className="flex items-start gap-3.5">
              <div className="w-1.5 self-stretch bg-[#006316] rounded-full shrink-0 min-h-[50px]" />
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-slate-900 tracking-tight leading-tight">
                  {currentLang === 'id' ? 'Butuh Bantuan Atau Ada Pertanyaan?' : 'Need Assistance or Have Questions?'}
                </h2>
              </div>
            </div>

            {/* Description Text */}
            <div className="text-slate-600 text-[14px] sm:text-[15px] leading-relaxed space-y-2">
              <p>
                {currentLang === 'id'
                  ? 'Kami akan segera membantu Anda, biasanya hanya dalam beberapa jam saja.'
                  : 'We will assist you promptly, usually within a few hours.'}
              </p>
              <p className="text-slate-500 text-[13px] sm:text-[14px]">
                {currentLang === 'id'
                  ? 'Proses penyelesaian maksimal beberapa jam  setelah pesan diterima.'
                  : 'Maximum resolution time is 2 business days after ticket received.'}
              </p>
            </div>

            {/* Visual Photography Card */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-md group bg-slate-100">
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img
                  src="/assets/contact-support-disability.jpg"
                  alt="Layanan Pendampingan & Pembelajaran Al-Qur'an Disabilitas"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              {/* Subtle Bottom Overlay Badge / Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/50 to-transparent p-4 sm:p-5 text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[12.5px] font-bold tracking-wide text-white">
                    {currentLang === 'id' ? "Sentra Konsultasi & Al-Qur'an Inklusif" : 'Inclusive Quran & Support Center'}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-200 mt-1 line-clamp-1">
                  {currentLang === 'id' ? 'Pendampingan ramah Braille, & Isyarat ' : 'Braille, Sign Language & Accessible accommodation assistance'}
                </p>
              </div>
            </div>

            {/* Quick Official Contact Highlights (WhatsApp & Email Info) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://wa.me/+628111997125?text=Halo%20Tim%20Disability%20Event,%20saya%20ingin%20berkonsultasi"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-[#006316]/50 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006316] group-hover:bg-[#006316] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                  <Icon name="chat" className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">WhatsApp Hotline</span>
                  <span className="text-[13px] font-bold text-slate-900 group-hover:text-[#006316] transition-colors truncate block">+62 812-3456-7890</span>
                </div>
              </a>

              <a
                href="https://lajnah.kemenag.go.id"
                className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-[#006316]/50 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006316] group-hover:bg-[#006316] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                  <Icon name="mail" className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Email Bantuan</span>
                  <span className="text-[13px] font-bold text-slate-900 group-hover:text-[#006316] transition-colors truncate block">lajnah@kemenag.go.id</span>
                </div>
              </a>
            </div>

            {/* Operational Hours & Status */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-[12px] text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Icon name="schedule" className="text-[16px] text-[#006316]" />
                  <span>{currentLang === 'id' ? 'Jam Operasional Layanan:' : 'Operating Hours:'}</span>
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${isOfficeOpenNow ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOfficeOpenNow ? 'bg-[#006316]' : 'bg-slate-500'}`} />
                  <span>{isOfficeOpenNow ? (currentLang === 'id' ? 'Buka Sekarang' : 'Open Now') : (currentLang === 'id' ? 'Tutup' : 'Closed')}</span>
                </span>
              </div>
              <p className="text-slate-600 text-[11.5px] leading-relaxed">
                Senin – Kamis (08.00 – 15.00 WIB) • Hotline Darurat WhatsApp Aktif
              </p>
            </div>

          </div>

          {/* Right Column: Modern Contact Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            {/* Top Subtle Brand Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#006316] via-emerald-500 to-[#006316]" />

            {/* Form Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 flex items-center gap-2">
                  <span>{currentLang === 'id' ? 'Formulir Kontak & Bantuan' : 'Contact & Inquiry Form'}</span>
                </h3>
                <p className="text-[12px] sm:text-[13px] text-slate-500 mt-0.5">
                  {currentLang === 'id'
                    ? 'Sampaikan pertanyaan, permintaan informasi pelatihan, atau konsultasi kebutuhan khusus.'
                    : 'Submit questions, training info requests, or accessibility consultation.'}
                </p>
              </div>
            </div>

            {contactSuccess ? (
              /* Success Receipt View */
              <div className="py-8 px-4 text-center space-y-5 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#006316] flex items-center justify-center mx-auto shadow-inner">
                  <Icon name="check_circle" className="text-[36px]" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#006316] text-[12px] font-bold tracking-wider mb-2">
                    TIKET #{contactTicketId}
                  </span>
                  <h4 className="text-[20px] font-bold text-slate-900">
                    {currentLang === 'id' ? 'Pesan Anda Telah Berhasil Terkirim!' : 'Your Message Has Been Sent!'}
                  </h4>
                  <p className="text-[13px] text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                    {currentLang === 'id' ? (
                      <>
                        Terima kasih, <strong>{contactName}</strong>. Tim helpdesk kami akan segera memproses pesan Anda terkait <em>"{contactTopic}"</em> dan segera menghubungi Anda.
                      </>
                    ) : (
                      <>
                        Thank you, <strong>{contactName}</strong>. Our team will review your inquiry regarding <em>"{contactTopic}"</em> promptly.
                      </>
                    )}
                  </p>
                </div>

                {/* Quick Info Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left max-w-md mx-auto text-[12px] text-slate-600 space-y-1.5">

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{currentLang === 'id' ? 'Estimasi Balasan:' : 'Est. Response:'}</span>
                    <span className="font-semibold text-[#006316]">{currentLang === 'id' ? '< 2 Jam pada Jam Kerja' : '< 2 Business Hours'}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetContactForm}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
                  >
                    {currentLang === 'id' ? 'Kirim Pesan Lain' : 'Send Another Message'}
                  </button>
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Tim%20Disability%20Event,%20saya%20telah%20mengirim%20tiket%20%23${contactTicketId}%20atas%20nama%20${encodeURIComponent(contactName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#006316] hover:bg-[#004d11] text-white rounded-xl text-[13px] font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Icon name="chat" className="text-[17px]" />
                    <span>{currentLang === 'id' ? 'Buka WhatsApp Hotline' : 'Open WhatsApp Hotline'}</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Active Form */
              <form onSubmit={handleContactSubmit} className="space-y-4">

                {/* Row 1: Nama & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {currentLang === 'id' ? 'Nama *' : 'Name *'}
                    </label>
                    <div className="relative">
                      <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={currentLang === 'id' ? 'Nama lengkap Anda' : 'Your full name'}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {currentLang === 'id' ? 'Email *' : 'Email *'}
                    </label>
                    <div className="relative">
                      <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Subjek * */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] font-semibold text-slate-700">
                      {currentLang === 'id' ? 'Subjek *' : 'Subject *'}
                    </label>
                    <span className="text-[11px] text-slate-400">Pilih cepat atau ketik sendiri</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={contactTopic}
                      onChange={(e) => setContactTopic(e.target.value)}
                      placeholder={currentLang === 'id' ? 'Tuliskan subjek atau topik pesan Anda...' : 'Write your subject...'}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all"
                    />
                  </div>
                  {/* Quick Subject Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: 'Pendaftaran Event', full: 'Informasi Pendaftaran Event' },
                      { label: 'Konsultasi Aksesibilitas', full: 'Konsultasi Fasilitas Aksesibilitas' },
                      { label: 'Kemitraan Lembaga', full: 'Kolaborasi Mitra Penyelenggara' },
                      { label: 'Bantuan Teknis', full: 'Bantuan Teknis Platform' },
                    ].map((top) => {
                      const isSelected = contactTopic === top.full;
                      return (
                        <button
                          key={top.full}
                          type="button"
                          onClick={() => setContactTopic(top.full)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${isSelected
                              ? 'bg-[#006316] text-white border-[#006316] shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                        >
                          {top.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Optional WhatsApp & Ragam Disabilitas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {currentLang === 'id' ? 'Nomor WhatsApp / HP' : 'WhatsApp / Phone Number'}
                    </label>
                    <div className="relative">
                      <Icon name="phone" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {currentLang === 'id' ? 'Disabilitas' : 'Disability Category / Need'}
                    </label>
                    <div className="relative">
                      <select
                        value={contactDisabilityType}
                        onChange={(e) => setContactDisabilityType(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all appearance-none cursor-pointer"
                      >
                        {activeDisabilities.length > 0 ? (
                          activeDisabilities.map((item) => (
                            <option key={item.id || item.kode} value={item.nama || item.name}>
                              {item.nama || item.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Disabilitas Netra">
                              {currentLang === 'id' ? 'Disabilitas Netra (Braille / Audio)' : 'Blind / Low Vision'}
                            </option>
                            <option value="Disabilitas Rungu / Tuli">
                              {currentLang === 'id' ? 'Disabilitas Rungu / Tuli (BISINDO)' : 'Deaf / Hard of Hearing'}
                            </option>
                            <option value="Disabilitas Daksa & Fisik">
                              {currentLang === 'id' ? 'Disabilitas Daksa & Fisik (Kursi Roda)' : 'Physical Disability'}
                            </option>
                            <option value="Disabilitas Intelektual / Autisme">
                              {currentLang === 'id' ? 'Disabilitas Intelektual / Autisme' : 'Intellectual / Neurodivergent'}
                            </option>
                          </>
                        )}
                      </select>
                      <Icon name="expand_more" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]" />
                    </div>
                  </div>
                </div>

                {/* Row 4: Pesan Textarea */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {currentLang === 'id' ? 'Pesan *' : 'Message *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={
                      currentLang === 'id'
                        ? 'Tulis pesan di sini...'
                        : 'Write your message here...'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all leading-relaxed"
                  />
                </div>

                {/* SUBMIT BUTTON - GREEN #006316 */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full sm:w-auto min-w-[140px] py-3 px-8 bg-[#006316] hover:bg-[#004d11] text-white rounded-xl text-[14px] font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {contactLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>{currentLang === 'id' ? 'Mengirim...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{currentLang === 'id' ? 'Kirim' : 'Submit'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        
      </section>

      {/* 8. FOOTER - Exactly matching the image */}
      <footer
        className="relative overflow-hidden text-white pt-16 pb-10 border-t border-white/10 bg-cover bg-center bg-no-repeat"
        style={
          appSettings?.headerBgImage
            ? {
              backgroundImage: `url(${appSettings.headerBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
            : {
              backgroundColor: '#162033',
            }
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Brand column (span 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                {appSettings?.logo ? (
                  <img
                    src={appSettings.logo}
                    alt={appSettings.applicationName || 'Logo Aplikasi'}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <QuranEmblemLogo size="md" />
                )}
                <span className="text-[18px] font-bold text-white tracking-tight">
                  {appSettings?.applicationName || "Event for Disability to Qur'an"}
                </span>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed max-w-sm">
                Menghubungkan Sahabat Netra, Tuli, Daksa, dan neurodivergen dengan mitra pesantren dan yayasan penyelenggara pelatihan di seluruh nusantara.
              </p>
            </div>

            {/* Column 1: Navigasi Utama */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-300 mb-4">
                NAVIGASI UTAMA
              </h4>
              <ul className="space-y-2.5 text-[13px] text-slate-400">
                <li><a href="#katalog-event" className="hover:text-white transition-colors">Cari Event & Pelatihan</a></li>
                <li><a href="#program-tpq" className="hover:text-white transition-colors">Program Pendidikan TPQ</a></li>
                <li><a href="#peta-lokasi" className="hover:text-white transition-colors">Peta Persebaran Lokasi</a></li>
                <li><a href="#peta-lokasi" className="hover:text-white transition-colors">Peta Mitra & Yayasan Quran Disabilitas</a></li>
                <li><a href="#tentang-kami" className="hover:text-white transition-colors">Tentang Kami & Prinsip Inklusi</a></li>
                <li><a href="#kontak-kami" className="hover:text-white transition-colors">Kontak & Bantuan Layanan</a></li>
              </ul>
            </div>

            {/* Column 2: Aksesibilitas */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-300 mb-4">
                Pendidikan Tpq Disabilitas
              </h4>
              <ul className="space-y-2.5 text-[13px] text-slate-400">
                <li>Al-Qur'an Braille </li>
                <li>Al-Qur'an Isyarat Metode Kitabah </li>
                <li>Al-Qur'an Isyarat Metode Tilawah </li>
                <li>Al-Qur'an Komunikasi Total </li>
              </ul>
            </div>

            {/* Column 3: Layanan Bantuan */}
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-300 mb-4">
                LAYANAN BANTUAN
              </h4>
              <ul className="space-y-2.5 text-[13px] text-slate-400">
                <li>WhatsApp Hotline Disabilitas</li>
                <li>Email Dukungan</li>
                <li>Alamat Sekretariat Layanan Inklusif</li>
                <li>
                  <button
                    onClick={() => onOpenLogin()}
                    className="text-sky-400 hover:underline cursor-pointer"
                  >
                    Login Khusus Mitra & Super Admin
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-slate-400">
            <div>
              © 2026 Disability Event Platform Indonesia. Seluruh hak cipta dilindungi.
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>
                <div className="flex items-center gap-4">
                  {/* Facebook */}
                  <a
                    href="https://web.facebook.com/LPMQKemenagRI/?_rdc=1&_rdr#"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.6-1.6h1.7V3.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4Z" />
                    </svg>
                  </a>

                  {/* Twitter / X */}
                  <a
                    href="https://x.com/lpmqkemenagri"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L2.4 2h6.5l4.4 5.8L18.9 2Zm-1.1 17.8h1.7L7.8 4H6L17.8 19.8Z" />
                    </svg>
                  </a>

                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/channel/UCmMeumAq7JlVHlL7-4MUIAQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
                    </svg>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/lpmq_kemenag_ri/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-5 h-5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                </div>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 9. ARTICLES MODAL */}
      {isArticlesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <Icon name="article" className="text-[24px] text-[#0284c7]" />
                <h3 className="text-[18px] font-bold text-slate-900">Artikel & Panduan Inklusi</h3>
              </div>
              <button
                onClick={() => {
                  setIsArticlesModalOpen(false);
                  setSelectedArticle(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {selectedArticle ? (
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-[12px] font-semibold text-sky-600 hover:underline flex items-center gap-1 mb-3 cursor-pointer"
                >
                  <Icon name="arrow_back" className="text-[16px]" />
                  <span>Kembali ke daftar artikel</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold">
                  {selectedArticle.category}
                </span>
                <h4 className="text-[20px] font-bold text-slate-900 mt-2 mb-1">{selectedArticle.title}</h4>
                <p className="text-[12px] text-slate-400 mb-4">{selectedArticle.date}</p>
                <div className="text-[14px] text-slate-700 leading-relaxed space-y-3">
                  <p>{selectedArticle.content}</p>
                  <p>
                    Kementerian Agama dan lembaga mitra terus memperluas jaringan pendampingan dan cetakan mushaf ramah disabilitas di seluruh wilayah Indonesia agar tidak ada sahabat disabilitas yang tertinggal dalam mengakses ilmu Al-Quran.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {articlesData.map((art, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedArticle(art)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 transition-all cursor-pointer"
                  >
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {art.category}
                    </span>
                    <h4 className="text-[15px] font-bold text-slate-900 mt-1.5 mb-1 hover:text-sky-700 transition-colors">
                      {art.title}
                    </h4>
                    <p className="text-[12px] text-slate-500 line-clamp-2">{art.content}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">{art.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. DETAIL & REGISTRATION MODAL (Matching Screenshot 2) */}
      {activeModalEvent && (
        <EventDetailModal
          event={activeModalEvent}
          appSettings={appSettings}
          initialStep={modalStep === 'form' ? 'form' : 'detail'}
          disabilities={disabilities}
          isSubmitting={isSubmittingReg}
          onClose={() => setActiveModalEvent(null)}
          onRegisterSubmit={async (formData) => {
            setIsSubmittingReg(true);
            try {
              const response = await fetch('/api/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventId: activeModalEvent.id,
                  namaLengkap: formData.namaLengkap,
                  noWa: formData.noWa,
                  email: formData.email,
                  usia: formData.usia,
                  kategoriDisabilitas: formData.kategoriDisabilitas,
                  catatanKhusus: formData.catatanKhusus,
                }),
              });
              const result = await response.json();
              if (result.success && result.participant) {
                onRegisterSuccess(result.participant);
              }
            } catch (err) {
              console.error('Error submitting participant registration:', err);
            } finally {
              setIsSubmittingReg(false);
            }
          }}
        />
      )}

      {/* 11. DETAIL PROFIL MITRA MODAL */}
      {selectedMitraDetail && (() => {
        const detailLogo = selectedMitraDetail.logo || users.find(u =>
          (u.organizationName && u.organizationName.toLowerCase() === selectedMitraDetail.namaLembaga.toLowerCase()) ||
          (selectedMitraDetail.mitraId && u.id === selectedMitraDetail.mitraId) ||
          (selectedMitraDetail.kontakEmail && u.email.toLowerCase() === selectedMitraDetail.kontakEmail.toLowerCase())
        )?.organizationLogo;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 my-6 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    <PartnerLogo
                      name={selectedMitraDetail.namaLembaga}
                      logoUrl={detailLogo}
                      size="md"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-[#0284c7] border border-sky-200 text-[10px] font-bold uppercase tracking-wider">
                        <VerifiedBadge size="xs" />
                        <span>Mitra Resmi Terverifikasi Kemenag</span>
                      </span>
                    </div>
                    <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 mt-0.5 leading-snug flex items-center gap-1.5">
                      <span>{selectedMitraDetail.namaLembaga}</span>
                      <VerifiedBadge size="sm" />
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMitraDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Lokasi & Wilayah */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-[13px] text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <Icon name="location_on" className="text-[18px] text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">Alamat Sentra:</strong>
                      <span>{selectedMitraDetail.alamatLengkap}, {selectedMitraDetail.kota}, {selectedMitraDetail.provinsi}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[12px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Icon name="group" className="text-[16px] text-slate-400" />
                      <span>Santri Binaan: <strong>{selectedMitraDetail.jumlahSantri || 0} Orang</strong></span>
                    </span>
                    {selectedMitraDetail.kontakWa && (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Icon name="call" className="text-[16px]" />
                        <span>{selectedMitraDetail.kontakWa}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Kategori Disabilitas Binaan */}
                <div>
                  <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Kategori Disabilitas Binaan
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMitraDetail.kategoriDisabilitas?.map((k, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[12px] font-bold border border-emerald-200 uppercase"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Program Unggulan */}
                {selectedMitraDetail.programUnggulan && (
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Program Pelatihan Unggulan
                    </h4>
                    <p className="text-[13px] text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed">
                      {selectedMitraDetail.programUnggulan}
                    </p>
                  </div>
                )}

                {/* Fasilitas Ramah Disabilitas */}
                {selectedMitraDetail.fasilitasTersedia && selectedMitraDetail.fasilitasTersedia.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Fasilitas Aksesibel
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMitraDetail.fasilitasTersedia.map((f, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1"
                        >
                          <Icon name="check" className="text-[14px] text-emerald-600" />
                          <span>{f}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deskripsi */}
                {selectedMitraDetail.deskripsi && (
                  <div>
                    <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Profil Singkat Lembaga
                    </h4>
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      {selectedMitraDetail.deskripsi}
                    </p>
                  </div>
                )}

                {/* Pelatihan Aktif dari Mitra ini */}
                {(() => {
                  const activeEventsForThisMitra = activeEvents.filter(
                    e => (e.mitraOrg || '').toLowerCase() === selectedMitraDetail.namaLembaga.toLowerCase() ||
                      (e.lokasiDanAlamat || '').toLowerCase().includes(selectedMitraDetail.namaLembaga.toLowerCase())
                  );
                  if (activeEventsForThisMitra.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Event Pelatihan Tersedia ({activeEventsForThisMitra.length})
                      </h4>
                      <div className="space-y-2">
                        {activeEventsForThisMitra.map(ev => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                          >
                            <div>
                              <h5 className="font-bold text-[13px] text-slate-900">{ev.namaKegiatan}</h5>
                              <span className="text-[11px] text-slate-500">{ev.tanggalKegiatan} • {ev.kota}</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedMitraDetail(null);
                                handleOpenDetailModal(ev, 'form');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                            >
                              Daftar Pelatihan
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMitraDetail(null)}
                    className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                  <div className="flex items-center gap-2">
                    {selectedMitraDetail.kontakWa && (
                      <a
                        href={`https://wa.me/${selectedMitraDetail.kontakWa.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Icon name="chat" className="text-[17px]" />
                        <span>Chat WhatsApp</span>
                      </a>
                    )}
                    {selectedMitraDetail.kontakEmail && (
                      <a
                        href={`mailto:${selectedMitraDetail.kontakEmail}`}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[13px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Icon name="mail" className="text-[17px]" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FLOATING ACTION BUTTONS: WHATSAPP HOTLINE & SCROLL TO TOP */}
      <div className="fixed bottom-8 right-8 sm:bottom-9 sm:right-9 z-40 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* WhatsApp Floating Button with 'Kontak Kami' Badge */}
        <a
          href="https://wa.me/628111997125?text=Halo%20Tim%20Disability%20Event,%20saya%20ingin%20bertanya%20seputar%20pelatihan%20Al-Quran%20inklusif"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Kontak Kami via WhatsApp"
          className="group relative flex items-center justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white w-12 h-12 sm:w-13 sm:h-13 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          {/* Label Tooltip */}
          <span className="hidden sm:inline-flex items-center absolute right-full mr-2.5 px-3 py-1.5 bg-white text-slate-800 text-[12px] font-bold rounded-xl shadow-md border border-slate-100 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity pointer-events-none">
            Kontak Kami
          </span>
          {/* WhatsApp SVG Icon */}
          <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-white" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.572 4.182 1.573 5.928l-1.573 5.736 5.892-1.545c1.674.914 3.593 1.439 5.635 1.439 6.627 0 12-5.373 12-12s-5.373-12-12-12zm0 22c-1.848 0-3.57-.504-5.048-1.385l-.362-.215-3.751.984.999-3.649-.235-.374c-.958-1.523-1.469-3.298-1.469-5.129 0-5.405 4.395-9.8 9.8-9.8 5.405 0 9.8 4.395 9.8 9.8 0 5.405-4.395 9.8-9.8 9.8z" />
          </svg>
        </a>

        {/* Scroll To Top Button (matching screenshot blue button with up arrow) */}
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Kembali ke atas"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer flex items-center justify-center animate-fadeIn"
          >
            <Icon name="arrow_upward" className="text-[24px]" />
          </button>
        )}
      </div>

    </div>
  );
};
