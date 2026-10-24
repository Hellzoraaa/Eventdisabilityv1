import React from 'react';
import { PERSYARATAN_TEMPLATE } from '../utils/persyaratanTemplate.ts';
import { TemplateChecklistPicker } from './TemplateChecklistPicker.tsx';

interface PersyaratanPickerProps {
  /** Persyaratan tersimpan sebagai teks, satu persyaratan per baris. */
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  label?: string;
}

/** Persyaratan peserta: template baku + tambah/hapus sendiri. Dipakai di form event dan form pendidikan. */
export const PersyaratanPicker: React.FC<PersyaratanPickerProps> = ({
  value,
  onChange,
  helpText = 'Persyaratan memakai template baku. Centang yang berlaku, atau tambahkan persyaratan sendiri dengan tombol di bawah.',
  label = 'Persyaratan Peserta (Template)',
}) => (
  <TemplateChecklistPicker
    templates={PERSYARATAN_TEMPLATE}
    value={value}
    onChange={onChange}
    label={label}
    helpText={helpText}
    addButtonLabel="Tambahkan Persyaratan Peserta"
    addPlaceholder="Tulis persyaratan peserta, contoh: Membawa Al-Qur’an pribadi"
    emptyDraftMessage="Tulis persyaratan terlebih dahulu."
    duplicateMessage="Persyaratan tersebut sudah ada dalam daftar."
  />
);
