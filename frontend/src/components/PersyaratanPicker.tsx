import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { PERSYARATAN_TEMPLATE, parsePersyaratan } from '../utils/persyaratanTemplate.ts';

interface PersyaratanPickerProps {
  /** Persyaratan tersimpan sebagai teks, satu persyaratan per baris. */
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  label?: string;
}

/**
 * Pilihan persyaratan peserta: centang dari template baku, atau tambahkan persyaratan sendiri.
 * Dipakai bersama oleh Form Event Baru dan Form Pengajuan Pendidikan agar fungsi dan tampilannya sama.
 * Harus dipakai di dalam elemen yang memuat kelas .request-field (sama seperti kedua form tersebut).
 */
export const PersyaratanPicker: React.FC<PersyaratanPickerProps> = ({
  value,
  onChange,
  helpText = 'Persyaratan memakai template baku. Centang yang berlaku, atau tambahkan persyaratan sendiri dengan tombol di bawah.',
  label = 'Persyaratan Peserta (Template)',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const current = parsePersyaratan(value);
  const templateChecked = PERSYARATAN_TEMPLATE.filter(item => current.includes(item));
  const customItems = current.filter(item => !PERSYARATAN_TEMPLATE.includes(item));

  const compose = (templates: string[], customs: string[]) => [...templates, ...customs].join('\n');

  const toggleTemplate = (item: string) => {
    const next = templateChecked.includes(item)
      ? templateChecked.filter(t => t !== item)
      : PERSYARATAN_TEMPLATE.filter(t => t === item || templateChecked.includes(t));
    onChange(compose(next, customItems));
  };

  const removeCustom = (item: string) => {
    onChange(compose(templateChecked, customItems.filter(c => c !== item)));
  };

  const closeAddForm = () => {
    setDraft('');
    setError('');
    setIsAdding(false);
  };

  const addCustom = () => {
    const text = draft.replace(/\s+/g, ' ').trim();
    if (!text) { setError('Tulis persyaratan terlebih dahulu.'); return; }
    if (text.length > 200) { setError('Persyaratan maksimal 200 karakter.'); return; }
    if (current.some(item => item.toLowerCase() === text.toLowerCase())) {
      setError('Persyaratan tersebut sudah ada dalam daftar.');
      return;
    }
    onChange(compose(templateChecked, [...customItems, text]));
    closeAddForm();
  };

  return (
    <div className="request-field request-full">
      <label>{label}</label>
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {PERSYARATAN_TEMPLATE.map(item => (
          <label key={item} className="!flex-row items-start gap-2 !font-medium">
            <input
              type="checkbox"
              className="!w-auto mt-0.5"
              checked={templateChecked.includes(item)}
              onChange={() => toggleTemplate(item)}
            />
            <span>{item}</span>
          </label>
        ))}

        {customItems.map(item => (
          <div key={item} className="flex items-start gap-2">
            <input type="checkbox" className="!w-auto mt-0.5" checked readOnly disabled />
            <span className="flex-1 text-[13px] font-medium break-words">{item}</span>
            <button
              type="button"
              onClick={() => removeCustom(item)}
              className="shrink-0 text-[12px] font-semibold text-red-600 hover:underline cursor-pointer"
              aria-label={`Hapus persyaratan: ${item}`}
            >
              Hapus
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="flex flex-col gap-2 pt-1">
            <input
              type="text"
              autoFocus
              maxLength={200}
              value={draft}
              onChange={e => { setDraft(e.target.value); if (error) setError(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
                if (e.key === 'Escape') { e.preventDefault(); closeAddForm(); }
              }}
              placeholder="Tulis persyaratan peserta, contoh: Membawa Al-Qur’an pribadi"
            />
            {error && <p className="text-red-600 text-[12px]">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addCustom}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-[12px] font-semibold cursor-pointer"
              >
                Tambah
              </button>
              <button
                type="button"
                onClick={closeAddForm}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 self-start px-3 py-2 mt-1 rounded-lg border border-dashed border-primary/50 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <Icon name="add" className="text-[16px]" />
            Tambahkan Persyaratan Peserta
          </button>
        )}
      </div>
      <small>{helpText}</small>
    </div>
  );
};
