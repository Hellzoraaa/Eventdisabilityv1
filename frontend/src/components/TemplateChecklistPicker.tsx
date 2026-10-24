import React, { useState } from 'react';
import { Icon } from './Icon.tsx';

/** Teks tersimpan satu butir per baris; penomoran di awal baris diabaikan. */
export const parseChecklist = (value?: string | null): string[] =>
  String(value || '').split('\n').map(v => v.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);

interface TemplateChecklistPickerProps {
  /** Daftar template baku yang bisa dicentang. */
  templates: string[];
  /** Nilai tersimpan sebagai teks, satu butir per baris. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  helpText: string;
  addButtonLabel: string;
  addPlaceholder: string;
  emptyDraftMessage?: string;
  duplicateMessage?: string;
}

/**
 * Pilihan berbasis template: centang dari template baku, atau tambahkan butir sendiri dan hapus lagi.
 * Dipakai untuk Persyaratan Peserta dan Benefit agar fungsi dan tampilannya sama.
 * Harus dipakai di dalam form yang memuat kelas .request-field.
 */
export const TemplateChecklistPicker: React.FC<TemplateChecklistPickerProps> = ({
  templates,
  value,
  onChange,
  label,
  helpText,
  addButtonLabel,
  addPlaceholder,
  emptyDraftMessage = 'Tulis isian terlebih dahulu.',
  duplicateMessage = 'Isian tersebut sudah ada dalam daftar.',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const current = parseChecklist(value);
  const templateChecked = templates.filter(item => current.includes(item));
  const customItems = current.filter(item => !templates.includes(item));

  const compose = (checked: string[], customs: string[]) => [...checked, ...customs].join('\n');

  const toggleTemplate = (item: string) => {
    const next = templateChecked.includes(item)
      ? templateChecked.filter(t => t !== item)
      : templates.filter(t => t === item || templateChecked.includes(t));
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
    if (!text) { setError(emptyDraftMessage); return; }
    if (text.length > 200) { setError('Isian maksimal 200 karakter.'); return; }
    if (current.some(item => item.toLowerCase() === text.toLowerCase())) {
      setError(duplicateMessage);
      return;
    }
    onChange(compose(templateChecked, [...customItems, text]));
    closeAddForm();
  };

  return (
    <div className="request-field request-full">
      <label>{label}</label>
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {templates.map(item => (
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
              aria-label={`Hapus: ${item}`}
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
              placeholder={addPlaceholder}
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
            {addButtonLabel}
          </button>
        )}
      </div>
      <small>{helpText}</small>
    </div>
  );
};
