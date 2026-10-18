import React, { useEffect, useMemo, useState } from 'react';

type RegionItem = { code: string; name: string };

interface IndonesiaLocationFieldsProps {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  variant?: 'admin' | 'mitra';
  required?: boolean;
}

const API_BASES = [
  'https://www.emsifa.com/api-wilayah-indonesia/v2',
  'https://wilayah.id/api',
];
const normalize = (value: string) => value.trim().toLocaleLowerCase('id-ID');

function normalizeRegionItems(payload: any): RegionItem[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((item: any) => ({
      code: String(item?.code ?? item?.id ?? '').trim(),
      name: String(item?.name ?? item?.nama ?? '').trim(),
    }))
    .filter((item: RegionItem) => item.code && item.name);
}

async function fetchRegionList(path: string, signal: AbortSignal): Promise<RegionItem[]> {
  let lastError: unknown;
  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}/${path}`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = normalizeRegionItems(await response.json());
      if (items.length) return items;
      throw new Error('Format data wilayah tidak dikenali atau kosong.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gagal memuat data wilayah.');
}

export const IndonesiaLocationFields: React.FC<IndonesiaLocationFieldsProps> = ({
  province,
  city,
  onProvinceChange,
  onCityChange,
  variant = 'admin',
  required = true,
}) => {
  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [cities, setCities] = useState<RegionItem[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProvinces(true);
    fetchRegionList('provinces.json', controller.signal)
      .then((items) => {
        setProvinces(items);
        setLoadError(items.length ? '' : 'Data provinsi tidak tersedia.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError('Data wilayah gagal dimuat dari sumber utama maupun cadangan. Periksa koneksi internet lalu coba lagi.');
      })
      .finally(() => setLoadingProvinces(false));
    return () => controller.abort();
  }, []);

  const selectedProvince = useMemo(
    () => provinces.find((item) => normalize(item.name) === normalize(province)),
    [provinces, province]
  );

  useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      return;
    }
    const controller = new AbortController();
    setLoadingCities(true);
    fetchRegionList(`regencies/${selectedProvince.code}.json`, controller.signal)
      .then((items) => {
        setCities(items);
        setLoadError(items.length ? '' : 'Daftar kota/kabupaten tidak tersedia untuk provinsi ini.');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setCities([]);
          setLoadError('Daftar kota/kabupaten gagal dimuat. Periksa koneksi internet lalu coba lagi.');
        }
      })
      .finally(() => setLoadingCities(false));
    return () => controller.abort();
  }, [selectedProvince]);

  const fieldClass = variant === 'mitra'
    ? 'w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100 disabled:text-slate-500'
    : 'w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60';
  const labelClass = variant === 'mitra'
    ? 'block text-[13px] font-semibold text-slate-800 mb-1.5'
    : 'block text-[12px] font-semibold text-on-surface mb-1';
  const wrapperClass = variant === 'mitra' ? 'request-field' : 'min-w-0';

  // Keep previously saved values visible if they are legacy names not in the API dataset.
  const cityExists = cities.some((item) => normalize(item.name) === normalize(city));
  const provinceExists = provinces.some((item) => normalize(item.name) === normalize(province));

  return (
    <>
      <div className={wrapperClass}>
        <label className={labelClass}>Provinsi {required ? '*' : ''}</label>
        <select
          required={required}
          value={province}
          disabled={loadingProvinces || provinces.length === 0}
          onChange={(event) => {
            onProvinceChange(event.target.value);
            onCityChange('');
          }}
          className={fieldClass}
        >
          <option value="">{loadingProvinces ? 'Memuat provinsi...' : 'Pilih provinsi'}</option>
          {province && !provinceExists && <option value={province}>{province} (data tersimpan)</option>}
          {provinces.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
        </select>
      </div>
      <div className={wrapperClass}>
        <label className={labelClass}>Kota / Kabupaten {required ? '*' : ''}</label>
        <select
          required={required}
          value={city}
          disabled={!selectedProvince || loadingCities || cities.length === 0}
          onChange={(event) => onCityChange(event.target.value)}
          className={fieldClass}
        >
          <option value="">{!province ? 'Pilih provinsi terlebih dahulu' : loadingCities ? 'Memuat kota/kabupaten...' : 'Pilih kota/kabupaten'}</option>
          {city && !cityExists && <option value={city}>{city} (data tersimpan)</option>}
          {cities.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
        </select>
      </div>
      {loadError && <p className={variant === 'mitra' ? 'request-field request-full text-amber-700 text-xs' : 'text-xs text-amber-700 sm:col-span-2'} role="status">{loadError}</p>}
    </>
  );
};
