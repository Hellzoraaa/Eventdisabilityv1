import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Settings,
  Upload,
  X,
} from 'lucide-react';

import type { ApplicationSettings, User } from '../types.ts';

interface ApplicationSettingsDashboardProps {
  currentUser?: User | null;
  onSettingsUpdated?: (settings: ApplicationSettings) => void;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  applicationName: 'Sistem Informasi Disabilitas',
  logo: '/logo-quran.svg',
  favicon: '/favicon.svg',
  topbarColor: '#0f766e',
  primaryColor: '#0f766e',
  secondaryColor: '#14b8a6',
  accentColor: '#f59e0b',
  publicRoleLabel: 'Mitra',
  institutionSubtitle: '',
  logoSize: '112px',
  headerBgImage: '/header-bg-islamic.svg',
  headerBgOverlay: 'dark',
  logoContainerBg: 'white',
};

const MAX_LOGO_SIZE = 600;
const MAX_FAVICON_SIZE = 128;
const MAX_BACKGROUND_SIZE = 1600;

const getLogoSizeNumber = (value?: string): number => {
  if (!value) {
    return 112;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 112;
  }

  return Math.min(Math.max(parsed, 40), 240);
};

const compressImage = (
  file: File,
  maxSize: number,
  quality = 0.85,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new Error('File bukan gambar yang valid.'));
      };

      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > maxSize || height > maxSize) {
          const scale = Math.min(
            maxSize / width,
            maxSize / height,
          );

          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
          return;
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const isPng =
          file.type === 'image/png' ||
          file.type === 'image/svg+xml';

        const outputType = isPng
          ? 'image/png'
          : 'image/jpeg';

        const dataUrl = canvas.toDataURL(
          outputType,
          quality,
        );

        resolve(dataUrl);
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file.'));
    };

    reader.onload = () => {
      resolve(String(reader.result));
    };

    reader.readAsDataURL(file);
  });
};

const normalizeSettings = (
  settings?: Partial<ApplicationSettings> | null,
): ApplicationSettings => {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    applicationName:
      settings?.applicationName ||
      DEFAULT_SETTINGS.applicationName,

    logo:
      settings?.logo ||
      DEFAULT_SETTINGS.logo,

    favicon:
      settings?.favicon ||
      DEFAULT_SETTINGS.favicon,

    topbarColor:
      settings?.topbarColor ||
      DEFAULT_SETTINGS.topbarColor,

    primaryColor:
      settings?.primaryColor ||
      settings?.topbarColor ||
      DEFAULT_SETTINGS.primaryColor,

    secondaryColor:
      settings?.secondaryColor ||
      DEFAULT_SETTINGS.secondaryColor,

    accentColor:
      settings?.accentColor ||
      DEFAULT_SETTINGS.accentColor,

    publicRoleLabel:
      settings?.publicRoleLabel ||
      DEFAULT_SETTINGS.publicRoleLabel,

    institutionSubtitle:
      settings?.institutionSubtitle ||
      DEFAULT_SETTINGS.institutionSubtitle,

    logoSize:
      settings?.logoSize ||
      DEFAULT_SETTINGS.logoSize,

    headerBgImage:
      settings?.headerBgImage ||
      DEFAULT_SETTINGS.headerBgImage,

    headerBgOverlay:
      settings?.headerBgOverlay ||
      DEFAULT_SETTINGS.headerBgOverlay,

    logoContainerBg:
      settings?.logoContainerBg ||
      DEFAULT_SETTINGS.logoContainerBg,
  };
};

const ApplicationSettingsDashboard: React.FC<
  ApplicationSettingsDashboardProps
> = ({
  currentUser,
  onSettingsUpdated,
}) => {
  const [formData, setFormData] =
    useState<ApplicationSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [uploadingField, setUploadingField] = useState<
    'logo' | 'favicon' | 'background' | null
  >(null);

  const logoPreviewSize = useMemo(
    () => getLogoSizeNumber(formData.logoSize),
    [formData.logoSize],
  );

  /**
   * ============================================================
   * LOAD APPLICATION SETTINGS
   * ============================================================
   */
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/app-settings', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Gagal mengambil Application Settings (${response.status}).`,
        );
      }

      const settings =
        result?.data ||
        result?.settings ||
        result ||
        DEFAULT_SETTINGS;

      const normalized = normalizeSettings(settings);

      setFormData(normalized);

      if (onSettingsUpdated) {
        onSettingsUpdated(normalized);
      }
    } catch (loadError) {
      console.error(
        '[Application Settings] GET error:',
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Gagal mengambil Application Settings.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * ============================================================
   * UPDATE FIELD
   * ============================================================
   */
  const updateField = <K extends keyof ApplicationSettings>(
    field: K,
    value: ApplicationSettings[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSuccessMessage('');
    setError('');
  };

  /**
   * ============================================================
   * IMAGE UPLOAD
   * ============================================================
   */
  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'favicon' | 'background',
  ) => {
    const file = event.target.files?.[0];

    // Reset input agar file yang sama bisa dipilih lagi.
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File yang dipilih harus berupa gambar.');
      return;
    }

    try {
      setUploadingField(field);
      setError('');
      setSuccessMessage('');

      let dataUrl = '';

      if (field === 'logo') {
        dataUrl = await compressImage(
          file,
          MAX_LOGO_SIZE,
          0.9,
        );
      } else if (field === 'favicon') {
        dataUrl = await compressImage(
          file,
          MAX_FAVICON_SIZE,
          0.9,
        );
      } else {
        dataUrl = await compressImage(
          file,
          MAX_BACKGROUND_SIZE,
          0.82,
        );
      }

      updateField(field === 'background' ? 'headerBgImage' : field, dataUrl);
    } catch (uploadError) {
      console.error(
        `[Application Settings] Upload ${field} error:`,
        uploadError,
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Gagal memproses gambar.',
      );
    } finally {
      setUploadingField(null);
    }
  };

  /**
   * ============================================================
   * REMOVE IMAGE
   * ============================================================
   */
  const clearImage = (
    field: 'logo' | 'favicon' | 'background',
  ) => {
    if (field === 'logo') {
      updateField('logo', '');
    }

    if (field === 'favicon') {
      updateField('favicon', '');
    }

    if (field === 'background') {
      updateField('headerBgImage', '');
    }
  };

  /**
   * ============================================================
   * DEFAULT ASSETS
   * ============================================================
   */
  const useDefaultLogo = () => {
    updateField('logo', '/logo-quran.svg');
  };

  const useDefaultFavicon = () => {
    updateField('favicon', '/favicon.svg');
  };

  const useIslamicBackground = () => {
    updateField(
      'headerBgImage',
      '/header-bg-islamic.svg',
    );
  };

  const useKemenagBackground = () => {
    updateField(
      'headerBgImage',
      '/header-bg-kemenag.svg',
    );
  };

  /**
   * ============================================================
   * SAVE
   * ============================================================
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      const payload: ApplicationSettings = {
        applicationName:
          formData.applicationName.trim() ||
          DEFAULT_SETTINGS.applicationName,

        logo: formData.logo || '',

        favicon: formData.favicon || '',

        topbarColor:
          formData.topbarColor ||
          DEFAULT_SETTINGS.topbarColor,

        primaryColor:
          formData.primaryColor ||
          formData.topbarColor ||
          DEFAULT_SETTINGS.primaryColor,

        secondaryColor:
          formData.secondaryColor ||
          DEFAULT_SETTINGS.secondaryColor,

        accentColor:
          formData.accentColor ||
          DEFAULT_SETTINGS.accentColor,

        publicRoleLabel:
          formData.publicRoleLabel || '',

        institutionSubtitle:
          formData.institutionSubtitle || '',

        logoSize:
          formData.logoSize || '112px',

        headerBgImage:
          formData.headerBgImage || '',

        headerBgOverlay:
          formData.headerBgOverlay || 'dark',

        logoContainerBg:
          formData.logoContainerBg || 'white',

        updatedAt: new Date().toISOString(),

        updatedBy:
          currentUser?.id ||
          formData.updatedBy ||
          '',
      };

      console.log(
        '[Application Settings] Saving payload:',
        {
          ...payload,

          // Jangan memenuhi console dengan Base64.
          logo: payload.logo
            ? `[IMAGE ${payload.logo.length} chars]`
            : '',

          favicon: payload.favicon
            ? `[IMAGE ${payload.favicon.length} chars]`
            : '',

          headerBgImage: payload.headerBgImage
            ? `[IMAGE ${payload.headerBgImage.length} chars]`
            : '',
        },
      );

      const response = await fetch('/api/app-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Gagal menyimpan Application Settings (${response.status}).`,
        );
      }

      const savedSettings = normalizeSettings(
        result?.data ||
          result?.settings ||
          payload,
      );

      setFormData(savedSettings);

      if (onSettingsUpdated) {
        onSettingsUpdated(savedSettings);
      }

      setSuccessMessage(
        'Application Settings berhasil disimpan.',
      );

      /**
       * Terapkan favicon langsung.
       */
      if (savedSettings.favicon) {
        let faviconElement =
          document.querySelector<HTMLLinkElement>(
            'link[rel="icon"]',
          );

        if (!faviconElement) {
          faviconElement =
            document.createElement('link');

          faviconElement.rel = 'icon';

          document.head.appendChild(
            faviconElement,
          );
        }

        faviconElement.href =
          savedSettings.favicon;
      }

      /**
       * Terapkan title langsung.
       */
      if (savedSettings.applicationName) {
        document.title =
          savedSettings.applicationName;
      }
    } catch (saveError) {
      console.error(
        '[Application Settings] POST error:',
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Gagal menyimpan Application Settings.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ============================================================
   * RESET FORM
   * ============================================================
   */
  const handleReset = () => {
    loadSettings();
    setSuccessMessage('');
    setError('');
  };

  /**
   * ============================================================
   * LOADING
   * ============================================================
   */
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />

          <p className="text-sm text-gray-500">
            Memuat Application Settings...
          </p>
        </div>
      </div>
    );
  }

  /**
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <div className="w-full space-y-6">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />

            <h1 className="text-xl font-bold text-gray-800">
              Application Settings
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Atur branding, logo, warna, favicon, dan
            tampilan aplikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />

            Muat Ulang
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {/* ====================================================== */}
      {/* SUCCESS */}
      {/* ====================================================== */}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <Check className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Berhasil
            </p>

            <p className="mt-0.5">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="min-w-0">
            <p className="font-semibold">
              Terjadi kesalahan
            </p>

            <p className="mt-0.5 break-words">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ====================================================== */}
      {/* MAIN GRID */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ==================================================== */}
        {/* GENERAL SETTINGS */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold text-gray-800">
                  Informasi Aplikasi
                </h2>

                <p className="text-xs text-gray-500">
                  Informasi utama yang ditampilkan di
                  aplikasi.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Application Name */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                Nama Aplikasi
              </label>

              <input
                type="text"
                value={formData.applicationName}
                onChange={(event) =>
                  updateField(
                    'applicationName',
                    event.target.value,
                  )
                }
                placeholder="Nama aplikasi"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Institution Subtitle */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                Subjudul / Institusi
              </label>

              <input
                type="text"
                value={
                  formData.institutionSubtitle || ''
                }
                onChange={(event) =>
                  updateField(
                    'institutionSubtitle',
                    event.target.value,
                  )
                }
                placeholder="Contoh: Kementerian Agama Republik Indonesia"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Public Role */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-700">
                Label Role Publik
              </label>

              <input
                type="text"
                value={
                  formData.publicRoleLabel || ''
                }
                onChange={(event) =>
                  updateField(
                    'publicRoleLabel',
                    event.target.value,
                  )
                }
                placeholder="Contoh: Mitra"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* LOGO SETTINGS */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold text-gray-800">
                  Logo Aplikasi
                </h2>

                <p className="text-xs text-gray-500">
                  Logo utama yang digunakan aplikasi.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Logo Preview */}
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt="Preview Logo"
                  className="object-contain"
                  style={{
                    width: `${logoPreviewSize}px`,
                    height: `${logoPreviewSize}px`,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <ImageIcon className="h-12 w-12" />

                  <span className="text-sm">
                    Belum ada logo
                  </span>
                </div>
              )}
            </div>

            {/* Upload Logo */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Upload Logo
              </label>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                  {uploadingField === 'logo' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  Pilih Logo

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={
                      uploadingField === 'logo'
                    }
                    onChange={(event) =>
                      handleImageUpload(
                        event,
                        'logo',
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={useDefaultLogo}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Gunakan Logo Default
                </button>

                {formData.logo && (
                  <button
                    type="button"
                    onClick={() =>
                      clearImage('logo')
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />

                    Hapus
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-400">
                Maksimal ukuran gambar diproses hingga
                sekitar 600px.
              </p>
            </div>

            {/* Logo Size */}
            <div className="border-t border-gray-100 pt-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Ukuran Logo di Halaman Web Utama
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: '80px',
                    label: 'Normal (80px)',
                    desc: 'Ukuran standar',
                  },
                  {
                    id: '112px',
                    label: 'Besar (112px) - Default',
                    desc: 'Ukuran proporsional direkomendasikan',
                  },
                  {
                    id: '144px',
                    label: 'Ekstra Besar (144px)',
                    desc: 'Tampilan logo maksimal',
                  },
                ].map((sizeOpt) => (
                  <button
                    type="button"
                    key={sizeOpt.id}
                    onClick={() =>
                      updateField(
                        'logoSize',
                        sizeOpt.id,
                      )
                    }
                    className={`rounded-lg border px-3.5 py-2 text-left transition-all ${
                      formData.logoSize ===
                      sizeOpt.id
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-[13px]">
                      {sizeOpt.label}
                    </div>

                    <div className="text-[11px] font-normal text-gray-500">
                      {sizeOpt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* FAVICON */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold text-gray-800">
                  Favicon
                </h2>

                <p className="text-xs text-gray-500">
                  Ikon yang tampil pada tab browser.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
              {formData.favicon ? (
                <img
                  src={formData.favicon}
                  alt="Preview Favicon"
                  className="h-24 w-24 object-contain"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-gray-300" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                {uploadingField === 'favicon' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

                Upload Favicon

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={
                    uploadingField === 'favicon'
                  }
                  onChange={(event) =>
                    handleImageUpload(
                      event,
                      'favicon',
                    )
                  }
                />
              </label>

              <button
                type="button"
                onClick={useDefaultFavicon}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Gunakan Default
              </button>

              {formData.favicon && (
                <button
                  type="button"
                  onClick={() =>
                    clearImage('favicon')
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  <X className="h-4 w-4" />

                  Hapus
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              Disarankan menggunakan gambar persegi.
            </p>
          </div>
        </section>

        {/* ==================================================== */}
        {/* COLORS */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold text-gray-800">
                  Warna Aplikasi
                </h2>

                <p className="text-xs text-gray-500">
                  Warna utama untuk tampilan aplikasi.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {/* Topbar */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Warna Topbar
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    formData.topbarColor ||
                    '#0f766e'
                  }
                  onChange={(event) =>
                    updateField(
                      'topbarColor',
                      event.target.value,
                    )
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />

                <input
                  type="text"
                  value={
                    formData.topbarColor ||
                    '#0f766e'
                  }
                  onChange={(event) =>
                    updateField(
                      'topbarColor',
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Primary */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Warna Primary
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    formData.primaryColor ||
                    '#0f766e'
                  }
                  onChange={(event) =>
                    updateField(
                      'primaryColor',
                      event.target.value,
                    )
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />

                <input
                  type="text"
                  value={
                    formData.primaryColor ||
                    '#0f766e'
                  }
                  onChange={(event) =>
                    updateField(
                      'primaryColor',
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Secondary */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Warna Secondary
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    formData.secondaryColor ||
                    '#14b8a6'
                  }
                  onChange={(event) =>
                    updateField(
                      'secondaryColor',
                      event.target.value,
                    )
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />

                <input
                  type="text"
                  value={
                    formData.secondaryColor ||
                    '#14b8a6'
                  }
                  onChange={(event) =>
                    updateField(
                      'secondaryColor',
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Accent */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Warna Accent
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    formData.accentColor ||
                    '#f59e0b'
                  }
                  onChange={(event) =>
                    updateField(
                      'accentColor',
                      event.target.value,
                    )
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />

                <input
                  type="text"
                  value={
                    formData.accentColor ||
                    '#f59e0b'
                  }
                  onChange={(event) =>
                    updateField(
                      'accentColor',
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* HEADER BACKGROUND */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />

              <div>
                <h2 className="font-bold text-gray-800">
                  Background Header
                </h2>

                <p className="text-xs text-gray-500">
                  Background yang digunakan pada bagian
                  header/login.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Background Preview */}
            <div
              className="relative min-h-[240px] overflow-hidden rounded-2xl border border-gray-200 bg-cover bg-center"
              style={{
                backgroundImage:
                  formData.headerBgImage
                    ? `url("${formData.headerBgImage}")`
                    : undefined,
              }}
            >
              {!formData.headerBgImage && (
                <div className="absolute inset-0 bg-linear-to-br from-slate-800 via-slate-700 to-teal-800" />
              )}

              {formData.headerBgOverlay ===
                'dark' && (
                <div className="absolute inset-0 bg-slate-950/60" />
              )}

              {formData.headerBgOverlay ===
                'light' && (
                <div className="absolute inset-0 bg-white/35" />
              )}

              <div className="relative z-10 flex min-h-[240px] items-center justify-center p-6">
                <div
                  className={`flex items-center justify-center overflow-hidden rounded-2xl p-3 shadow-xl ${
                    formData.logoContainerBg ===
                    'transparent'
                      ? 'bg-transparent'
                      : formData.logoContainerBg ===
                        'glass'
                        ? 'border border-white/30 bg-white/20 backdrop-blur-md'
                        : 'bg-white'
                  }`}
                >
                  {formData.logo ? (
                    <img
                      src={formData.logo}
                      alt="Preview"
                      className="object-contain"
                      style={{
                        width: `${Math.min(
                          logoPreviewSize,
                          144,
                        )}px`,
                        height: `${Math.min(
                          logoPreviewSize,
                          144,
                        )}px`,
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Upload */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Background
              </label>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
                  {uploadingField ===
                  'background' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}

                  Upload Background

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={
                      uploadingField ===
                      'background'
                    }
                    onChange={(event) =>
                      handleImageUpload(
                        event,
                        'background',
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  onClick={
                    useIslamicBackground
                  }
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Background Islamic
                </button>

                <button
                  type="button"
                  onClick={
                    useKemenagBackground
                  }
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Background Kemenag
                </button>

                {formData.headerBgImage && (
                  <button
                    type="button"
                    onClick={() =>
                      clearImage(
                        'background',
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <X className="h-4 w-4" />

                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Overlay */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Overlay Background
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: 'dark',
                    label: 'Gelap',
                  },
                  {
                    id: 'light',
                    label: 'Terang',
                  },
                  {
                    id: 'none',
                    label: 'Tanpa Overlay',
                  },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() =>
                      updateField(
                        'headerBgOverlay',
                        option.id as
                          | 'dark'
                          | 'light'
                          | 'none',
                      )
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      formData.headerBgOverlay ===
                      option.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Container */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Background Container Logo
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: 'white',
                    label: 'Putih',
                  },
                  {
                    id: 'transparent',
                    label: 'Transparan',
                  },
                  {
                    id: 'glass',
                    label: 'Glass',
                  },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() =>
                      updateField(
                        'logoContainerBg',
                        option.id as
                          | 'white'
                          | 'transparent'
                          | 'glass',
                      )
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      formData.logoContainerBg ===
                      option.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* LIVE SUMMARY */}
        {/* ==================================================== */}

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-800">
              Ringkasan Pengaturan
            </h2>

            <p className="text-xs text-gray-500">
              Nilai yang akan disimpan ke database.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">
                Nama Aplikasi
              </p>

              <p className="mt-1 truncate text-sm font-bold text-gray-800">
                {formData.applicationName ||
                  '-'}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">
                Ukuran Logo
              </p>

              <p className="mt-1 text-sm font-bold text-gray-800">
                {formData.logoSize ||
                  '112px'}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">
                Primary Color
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded-md border border-gray-200"
                  style={{
                    backgroundColor:
                      formData.primaryColor ||
                      '#0f766e',
                  }}
                />

                <span className="text-sm font-bold uppercase text-gray-800">
                  {formData.primaryColor ||
                    '#0f766e'}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">
                Background Overlay
              </p>

              <p className="mt-1 text-sm font-bold capitalize text-gray-800">
                {formData.headerBgOverlay ||
                  'dark'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================== */}
      {/* BOTTOM SAVE */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800">
            Simpan perubahan
          </p>

          <p className="text-xs text-gray-500">
            Pastikan semua pengaturan sudah sesuai
            sebelum menyimpan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}

          {isSaving
            ? 'Menyimpan...'
            : 'Simpan Application Settings'}
        </button>
      </div>
    </div>
  );
};

export { ApplicationSettingsDashboard };
export default ApplicationSettingsDashboard;