import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Icon, featherSvgString } from './Icon.tsx';
import L from 'leaflet';
import {
  TrainingProposal,
  DisabilityMaster,
  QuranCommunity
} from '../types.ts';
import { PartnerLogo } from './PartnerLogo.tsx';
import { VerifiedBadge } from './VerifiedBadge.tsx';
import { EventDetailModal } from './EventDetailModal.tsx';
import { isTPQMapId } from './TPQHomeSection.tsx';

export interface EventDisabilityCategoryInfo {
  id: string;
  kode: string;
  nama: string;
  warnaHex: string;
  icon: string;
  kategoriUtama?: string;
}

export const DEFAULT_UMUM_CATEGORY: EventDisabilityCategoryInfo = {
  id: 'umum',
  kode: 'umum',
  nama: 'Umum / Non-Disabilitas',
  warnaHex: '#006316',
  icon: 'diversity_3',
  kategoriUtama: 'Inklusif',
};

/**
 * Dynamically classifies an event using master disability data from the database.
 * Uses exact match on category fields and smart keyword matching against the database records.
 */
export function getEventDisabilityCategory(
  ev: TrainingProposal,
  masterList: DisabilityMaster[]
): EventDisabilityCategoryInfo {
  // 1. Direct match on kategoriDisabilitasUtama or kategoriDisabilitas
  const mainCat = ev.kategoriDisabilitasUtama || ev.kategoriDisabilitas;
  if (mainCat) {
    const mainLower = String(mainCat).trim().toLowerCase();
    const directMatch = masterList.find(
      d => d.nama.toLowerCase() === mainLower ||
           d.kode.toLowerCase() === mainLower ||
           d.id === mainCat
    );
    if (directMatch) {
      return {
        id: directMatch.id,
        kode: directMatch.kode,
        nama: directMatch.nama,
        warnaHex: directMatch.warnaHex || '#006316',
        icon: directMatch.icon || 'accessibility',
        kategoriUtama: directMatch.kategoriUtama,
      };
    }
  }

  // 2. Comprehensive full-text search against master disabilities keywords
  const text = [
    ev.kategoriDisabilitasUtama || '',
    ev.kategoriDisabilitas || '',
    ev.jenisEvent || '',
    ev.namaKegiatan || '',
    ev.targetPeserta || '',
    ev.deskripsiPelatihan || '',
    ...(ev.kebutuhanPeserta || []),
  ].join(' ').toLowerCase();

  // Search each disability defined in database
  for (const dis of masterList) {
    const kodeLower = dis.kode.toLowerCase();
    const namaLower = dis.nama.toLowerCase();

    // Extract search keywords from the database record
    const keywords = [
      kodeLower,
      ...namaLower.split(/[\s/,&]+/).filter(w => w.length >= 3 && !['dan', 'atau', 'ragam', 'disabilitas', 'untuk', 'event'].includes(w))
    ];

    // Synonyms and special terms mapping
    if (kodeLower.includes('netra') || namaLower.includes('netra')) {
      keywords.push('braille', 'low vision', 'blind', 'tunanetra');
    }
    if (kodeLower.includes('rungu') || namaLower.includes('rungu') || namaLower.includes('tuli')) {
      keywords.push('tuli', 'isyarat', 'bisindo', 'sibi', 'deaf', 'tunarungu', 'bisu');
    }
    if (kodeLower.includes('daksa') || namaLower.includes('daksa')) {
      keywords.push('kursi roda', 'fisik', 'tunadaksa', 'motorik', 'amputee', 'paraplegia');
    }
    if (kodeLower.includes('intelektual') || namaLower.includes('intelektual') || namaLower.includes('autis')) {
      keywords.push('autisme', 'autis', 'down syndrome', 'adhd', 'mental', 'graita', 'cerebral palsy');
    }

    if (keywords.some(kw => text.includes(kw))) {
      return {
        id: dis.id,
        kode: dis.kode,
        nama: dis.nama,
        warnaHex: dis.warnaHex || '#006316',
        icon: dis.icon || 'accessibility',
        kategoriUtama: dis.kategoriUtama,
      };
    }
  }

  // 3. Fallback to General / Inclusive if no specific disability is matched
  return DEFAULT_UMUM_CATEGORY;
}

interface PetaPersebaranProps {
  communities?: QuranCommunity[];
  events: TrainingProposal[];
  onSelectEventForRegister?: (eventId: string) => void;
  onAddNewCommunity?: (comm: Partial<QuranCommunity>) => void;
  isSuperAdmin?: boolean;
  isEmbedded?: boolean;
  hideAddButton?: boolean;
  disabilities?: DisabilityMaster[];
  initialCategory?: string;
  onOpenEventDetail?: (event: TrainingProposal) => void;
}

export const PetaPersebaran: React.FC<PetaPersebaranProps> = ({
  events = [],
  onSelectEventForRegister,
  disabilities = [],
  initialCategory,
  onOpenEventDetail,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Master disability categories from database
  const [dbDisabilities, setDbDisabilities] = useState<DisabilityMaster[]>(disabilities);
  const [isLoadingDisabilities, setIsLoadingDisabilities] = useState(false);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  // Filter jenis: Pendidikan TPQ atau Event Pelatihan
  const [selectedJenis, setSelectedJenis] = useState<'all' | 'tpq' | 'event'>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeEventModal, setActiveEventModal] = useState<TrainingProposal | null>(null);

  // Load latest disabilities directly from database API if not provided in props
  useEffect(() => {
    if (disabilities && disabilities.length > 0) {
      setDbDisabilities(disabilities);
      return;
    }

    const fetchDisabilities = async () => {
      try {
        setIsLoadingDisabilities(true);
        const res = await fetch('/api/disabilities');
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json.disabilities)
            ? json.disabilities
            : Array.isArray(json.data)
            ? json.data
            : [];
          if (list.length > 0) {
            setDbDisabilities(list);
          }
        }
      } catch (err) {
        console.error('Gagal mengambil master disabilitas untuk peta:', err);
      } finally {
        setIsLoadingDisabilities(false);
      }
    };

    fetchDisabilities();
  }, [disabilities]);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  // Active master disabilities from database (isAktif !== false)
  const activeMasterDisabilities = useMemo(() => {
    return dbDisabilities.filter(d => d.isAktif !== false);
  }, [dbDisabilities]);

  // Active & Approved events from database that have valid geographic coordinates
  const activeEvents = useMemo(() => {
    return events.filter(
      e => (e.isAktif || e.status === 'disetujui') &&
           e.latitude !== undefined &&
           e.longitude !== undefined &&
           e.latitude !== null &&
           e.longitude !== null &&
           !isNaN(Number(e.latitude)) &&
           !isNaN(Number(e.longitude))
    );
  }, [events]);

  // Dynamic list of categories for the filter toolbar based on database master + event records
  const availableCategories = useMemo(() => {
    const list: EventDisabilityCategoryInfo[] = [];

    // Add all active categories from the database
    activeMasterDisabilities.forEach(d => {
      list.push({
        id: d.id,
        kode: d.kode,
        nama: d.nama,
        warnaHex: d.warnaHex || '#006316',
        icon: d.icon || 'accessibility',
        kategoriUtama: d.kategoriUtama,
      });
    });

    // Check if any events fall into the 'umum' category
    const hasUmum = activeEvents.some(ev => {
      const cat = getEventDisabilityCategory(ev, activeMasterDisabilities);
      return cat.kode === 'umum';
    });

    if (hasUmum && !list.some(item => item.kode === 'umum')) {
      list.push(DEFAULT_UMUM_CATEGORY);
    }

    return list;
  }, [activeMasterDisabilities, activeEvents]);

  // Dynamic Provinces list extracted from active database events
  const provinces = useMemo(() => {
    return Array.from(new Set(activeEvents.map(e => e.provinsi).filter(Boolean))).sort();
  }, [activeEvents]);

  // Dynamic Cities list extracted from active database events (scoped to chosen province if selected)
  const cities = useMemo(() => {
    const eventsInScope = selectedProvince === 'all'
      ? activeEvents
      : activeEvents.filter(e => e.provinsi === selectedProvince);
    return Array.from(new Set(eventsInScope.map(e => e.kota).filter(Boolean))).sort();
  }, [activeEvents, selectedProvince]);

  // Reset city filter if province changes and current city is not in the province
  useEffect(() => {
    if (selectedProvince !== 'all' && selectedCity !== 'all') {
      const exists = cities.includes(selectedCity);
      if (!exists) {
        setSelectedCity('all');
      }
    }
  }, [selectedProvince, cities, selectedCity]);

  // Real-time Counts per category from database events
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeEvents.length };

    activeEvents.forEach(ev => {
      const cat = getEventDisabilityCategory(ev, activeMasterDisabilities);
      counts[cat.kode] = (counts[cat.kode] || 0) + 1;
      counts[cat.id] = (counts[cat.id] || 0) + 1;
      counts[cat.nama] = (counts[cat.nama] || 0) + 1;
    });

    return counts;
  }, [activeEvents, activeMasterDisabilities]);

  // Jumlah titik per jenis (TPQ memakai id berawalan 'tpq-map-')
  const jenisCounts = useMemo(() => {
    const tpq = activeEvents.filter(ev => isTPQMapId(String(ev.id))).length;
    return { all: activeEvents.length, tpq, event: activeEvents.length - tpq };
  }, [activeEvents]);

  // Filtered Events based on Category, Province, City, and Search
  const filteredEvents = useMemo(() => {
    return activeEvents.filter(ev => {
      const cat = getEventDisabilityCategory(ev, activeMasterDisabilities);

      // 1. Category filter
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : cat.kode.toLowerCase() === selectedCategory.toLowerCase() ||
            cat.id === selectedCategory ||
            cat.nama.toLowerCase() === selectedCategory.toLowerCase();

      // 1b. Jenis filter (Pendidikan TPQ / Event Pelatihan)
      const isTPQItem = isTPQMapId(String(ev.id));
      const matchesJenis =
        selectedJenis === 'all' ||
        (selectedJenis === 'tpq' ? isTPQItem : !isTPQItem);

      // 2. Province filter
      const matchesProvince = selectedProvince === 'all' || ev.provinsi === selectedProvince;

      // 3. City filter
      const matchesCity = selectedCity === 'all' || ev.kota === selectedCity;

      // 4. Search query filter
      const sQ = searchQuery.toLowerCase().trim();
      const matchesSearch =
        sQ === ''
          ? true
          : ev.namaKegiatan.toLowerCase().includes(sQ) ||
            ev.kota.toLowerCase().includes(sQ) ||
            (ev.provinsi && ev.provinsi.toLowerCase().includes(sQ)) ||
            (ev.lokasiDanAlamat && ev.lokasiDanAlamat.toLowerCase().includes(sQ)) ||
            (ev.mitraOrg && ev.mitraOrg.toLowerCase().includes(sQ)) ||
            (ev.mitraName && ev.mitraName.toLowerCase().includes(sQ)) ||
            ev.deskripsiPelatihan.toLowerCase().includes(sQ) ||
            cat.nama.toLowerCase().includes(sQ);

      return matchesCategory && matchesJenis && matchesProvince && matchesCity && matchesSearch;
    });
  }, [activeEvents, selectedCategory, selectedJenis, selectedProvince, selectedCity, searchQuery, activeMasterDisabilities]);

  // Check if any filter is currently applied
  const isFilterActive = selectedCategory !== 'all' || selectedJenis !== 'all' || selectedProvince !== 'all' || selectedCity !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedJenis('all');
    setSelectedProvince('all');
    setSelectedCity('all');
    setSearchQuery('');
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      // Default Centered on Indonesia
      const map = L.map(mapContainerRef.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        minZoom: 4,
        maxZoom: 17,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kontributor',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update Markers when Filtered Events or Master Disabilities Change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    filteredEvents.forEach(ev => {
      const cat = getEventDisabilityCategory(ev, activeMasterDisabilities);
      const pinColor = cat.warnaHex || '#006316';

      // Custom Leaflet DivIcon with database color
      const customEventIcon = L.divIcon({
        className: 'custom-leaflet-event-marker',
        html: `
          <div class="custom-map-pin group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-125" style="transform-origin: 50% 100%;">
            <!-- Pin Circle with database color -->
            <div class="w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all"
                 style="background-color: ${pinColor};">
              <span class="text-white select-none pointer-events-none" style="display:inline-flex; font-size:20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4));">${featherSvgString('map-pin', 20)}</span>
            </div>
            <!-- Pin Pointer Tip -->
            <div class="w-2.5 h-2.5 -mt-1.5 rotate-45 border-r-2 border-b-2 border-white shadow-xs"
                 style="background-color: ${pinColor};"></div>
            <!-- Ground Drop Shadow -->
            <div class="w-3.5 h-1.5 rounded-full bg-slate-950/20 blur-[1px] mt-0.5 pointer-events-none"></div>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 42],
        popupAnchor: [0, -40],
      });

      const marker = L.marker([ev.latitude, ev.longitude], { icon: customEventIcon });

      // Popup Content with database category badge and details
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-3.5 max-w-[290px] font-sans';
      popupDiv.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1"
                style="background-color: ${pinColor}18; color: ${pinColor}; border-color: ${pinColor}50;">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${pinColor}"></span>
            <span>${cat.nama}</span>
          </span>
          <span class="px-2 py-0.5 rounded-full bg-[#006316] text-white text-[10px] font-bold">
            Buka
          </span>
        </div>
        <div class="font-extrabold text-[14px] text-slate-900 leading-snug mb-1">${ev.namaKegiatan}</div>
        <div class="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Icon name="domain" className="text-[15px] text-slate-400" />
          <span class="truncate">${ev.mitraOrg || ev.mitraName || 'Yayasan Penyelenggara'}</span>
        </div>
        <div class="space-y-1.5 text-[11.5px] text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <div class="flex items-center gap-1.5">
            <Icon name="calendar_month" className="text-[14px] text-slate-500" />
            <span class="font-semibold text-slate-800">${ev.tanggalKegiatan}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Icon name="location_on" className="text-[14px] text-slate-500" />
            <span class="truncate">${ev.kota} (${ev.lokasiDanAlamat})</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Icon name="group" className="text-[14px] text-slate-500" />
            <span>Kuota: <strong>${ev.jumlahPendaftar || 0} / ${ev.kuotaDisetujui || ev.targetDanKuotaPeserta}</strong> peserta</span>
          </div>
        </div>
      `;

      // Detail action button
      const detailBtn = document.createElement('button');
      detailBtn.className = 'w-full py-2 mb-1 bg-[#006316] hover:bg-[#004d11] text-white rounded-xl text-[12px] font-bold transition-all shadow-xs cursor-pointer text-center';
      detailBtn.innerText = 'Lihat Detail Pelatihan';
      detailBtn.onclick = () => {
        if (onOpenEventDetail) {
          onOpenEventDetail(ev);
        } else {
          setActiveEventModal(ev);
        }
      };
      popupDiv.appendChild(detailBtn);

      marker.bindPopup(popupDiv);
      marker.on('click', () => {
        setSelectedEventId(ev.id);
      });

      markersGroup.addLayer(marker);
    });

    // Auto fit bounds if filtered items exist
    if (filteredEvents.length > 0) {
      const bounds = L.latLngBounds(filteredEvents.map(e => [e.latitude, e.longitude]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredEvents, activeMasterDisabilities, onOpenEventDetail]);

  const handleSelectEventCard = (ev: TrainingProposal) => {
    setSelectedEventId(ev.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([ev.latitude, ev.longitude], 13, { duration: 1 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Toolbar - Fully Dynamic From Database */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        
        {/* Top Controls: Search, Province, City, and Reset */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Cari event, judul, kota, atau penyelenggara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            )}
          </div>

          {/* Province Selector from Database */}
          <div className="md:col-span-3">
            <select
              value={selectedProvince}
              onChange={e => setSelectedProvince(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all cursor-pointer truncate"
            >
              <option value="all">Semua Provinsi ({provinces.length})</option>
              {provinces.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          {/* City Selector from Database */}
          <div className="md:col-span-3">
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              disabled={cities.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006316]/20 focus:border-[#006316] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed truncate"
            >
              <option value="all">Semua Kota ({cities.length})</option>
              {cities.map(cty => (
                <option key={cty} value={cty}>{cty}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="md:col-span-1 flex justify-end">
            {isFilterActive ? (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Semua Filter"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0 w-full"
              >
                <Icon name="restart_alt" className="text-[18px]" />
              </button>
            ) : (
              <div className="hidden md:block w-full text-center text-[11px] text-slate-400 font-medium">
                Aktif
              </div>
            )}
          </div>
        </div>

        {/* Filter jenis: Pendidikan TPQ / Event Pelatihan */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100">
          <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider shrink-0 pr-1 flex items-center gap-1">
            <Icon name="tune" className="text-[15px] text-[#006316]" />
            <span>Jenis:</span>
          </span>

          {([
            { key: 'all', label: 'Semua', color: '#006316', count: jenisCounts.all },
            { key: 'tpq', label: 'Pendidikan TPQ', color: '#006316', count: jenisCounts.tpq },
            { key: 'event', label: 'Event Pelatihan', color: '#006316', count: jenisCounts.event },
          ] as const).map(opt => {
            const isSelected = selectedJenis === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedJenis(opt.key)}
                aria-pressed={isSelected}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                }`}
                style={isSelected ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
              >
                <Icon name={opt.icon} className="text-[15px]" />
                <span>{opt.label} ({opt.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map & Event Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Map Container (Left ~65%) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden relative">
            <div
              ref={mapContainerRef}
              className="w-full h-[520px] sm:h-[600px] z-10"
              style={{ minHeight: '520px' }}
            />

            {/* Dynamic Map Legend: Populated directly from database master categories */}
            <div className="absolute bottom-4 left-4 z-[20] bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-md text-[11.5px] max-w-[280px]">
              <div className="font-extrabold text-slate-900 mb-2.5 uppercase tracking-wider text-[10.5px] flex items-center gap-1.5">
                <Icon name="pin_drop" className="text-[16px] text-slate-700" />
                <span>Penanda Kategori (Database)</span>
              </div>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {availableCategories.map(cat => (
                  <div key={cat.id || cat.kode} className="flex items-center gap-2">
                    <div
                      className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.warnaHex }}
                    >
                      <Icon name="location_on" className="text-[11px]" />
                    </div>
                    <span className="font-bold truncate" style={{ color: cat.warnaHex }}>
                      {cat.nama}
                    </span>
                  </div>
                ))}
              </div>

              {/* Informative Note */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Icon name="database" className="text-[12px] text-slate-400" />
                <span>Data tersinkronisasi realtime dengan database</span>
              </div>
            </div>

            {/* Event Counter Badge on Map */}
            <div className="absolute top-4 right-4 z-[20] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md flex items-center gap-1.5">
              <Icon name="event_available" className="text-[15px] text-emerald-400" />
              <span>{filteredEvents.length} Titik Event di Peta</span>
            </div>
          </div>
        </div>

        {/* Sidebar: Event Cards List (Right ~35%) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[13px] font-extrabold text-slate-800">
              Daftar Lokasi Pelatihan ({filteredEvents.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Klik kartu untuk sorot titik
            </span>
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <Icon name="location_off" className="text-[36px] text-slate-400" />
                <p className="text-[13px] font-bold text-slate-700">Tidak ada event sesuai filter</p>
                <p className="text-[11.5px] text-slate-500 max-w-xs mx-auto">
                  Coba ubah kata kunci pencarian, pilih provinsi lain, atau klik tombol di bawah untuk mereset filter.
                </p>
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#006316] hover:bg-[#004d11] text-white rounded-xl text-[12px] font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Icon name="restart_alt" className="text-[15px]" />
                    <span>Tampilkan Semua Event</span>
                  </button>
                )}
              </div>
            ) : (
              filteredEvents.map(ev => {
                const isSelected = selectedEventId === ev.id;
                const cat = getEventDisabilityCategory(ev, activeMasterDisabilities);
                const pinColor = cat.warnaHex || '#006316';

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleSelectEventCard(ev)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-[#006316] shadow-md ring-2 ring-[#006316]/20'
                        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Category Pin Badge with Database Color */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border flex items-center gap-1 shadow-2xs"
                        style={{
                          backgroundColor: `${pinColor}15`,
                          borderColor: `${pinColor}40`,
                          color: pinColor,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pinColor }} />
                        <span>{cat.nama}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#006316] text-white text-[10px] font-bold">
                        Buka
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{ev.batch || 'Batch 1'}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        <PartnerLogo
                          name={ev.mitraOrg || ev.mitraName}
                          logoUrl={ev.mitraLogo || ev.logoUrl}
                          size="sm"
                          className="w-full h-full object-contain p-0 border-0 shadow-none"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[13.5px] text-slate-900 leading-snug line-clamp-2">
                          {ev.namaKegiatan}
                        </h4>
                        <div className="text-[11.5px] font-semibold text-slate-600 truncate mt-0.5 flex items-center gap-1">
                          <span className="truncate">{ev.mitraOrg || ev.mitraName || 'Yayasan Penyelenggara'}</span>
                          <VerifiedBadge size="xs" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Icon name="calendar_month" className="text-[13px] text-slate-400" />
                        <span>{ev.tanggalKegiatan}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="place" className="text-[13px] text-slate-400" />
                        <span className="truncate max-w-[120px]">{ev.kota}, {ev.provinsi}</span>
                      </span>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (onOpenEventDetail) {
                            onOpenEventDetail(ev);
                          } else {
                            setActiveEventModal(ev);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-[#006316] hover:bg-[#004d11] text-white text-[12px] font-bold tracking-wide transition-all shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <Icon name="visibility" className="text-[15px]" />
                        <span>Lihat Detail Pelatihan</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Internal Modal fallback if not handled by parent */}
      {activeEventModal && !onOpenEventDetail && (
        <EventDetailModal
          event={activeEventModal}
          onClose={() => setActiveEventModal(null)}
          disabilities={dbDisabilities}
          onRegisterSubmit={async () => {
            if (onSelectEventForRegister) {
              onSelectEventForRegister(activeEventModal.id);
            }
          }}
        />
      )}
    </div>
  );
};
