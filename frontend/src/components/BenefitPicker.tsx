import React from 'react';
import { BENEFIT_TEMPLATE } from '../utils/benefitTemplate.ts';
import { TemplateChecklistPicker } from './TemplateChecklistPicker.tsx';

interface BenefitPickerProps {
  /** Benefit tersimpan sebagai teks, satu benefit per baris. */
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  label?: string;
}

/** Benefit event: template baku + tambah/hapus sendiri (hanya dipakai di Form Event Baru). */
export const BenefitPicker: React.FC<BenefitPickerProps> = ({
  value,
  onChange,
  helpText = 'Centang benefit yang diperoleh peserta, atau tambahkan benefit sendiri. Daftar tampil pada Detail Event.',
  label = 'Benefit (Template)',
}) => (
  <TemplateChecklistPicker
    templates={BENEFIT_TEMPLATE}
    value={value}
    onChange={onChange}
    label={label}
    helpText={helpText}
    addButtonLabel="Tambahkan Benefit"
    addPlaceholder="Tulis benefit untuk peserta, contoh: Mushaf Al-Qur’an untuk dibawa pulang"
    emptyDraftMessage="Tulis benefit terlebih dahulu."
    duplicateMessage="Benefit tersebut sudah ada dalam daftar."
  />
);
