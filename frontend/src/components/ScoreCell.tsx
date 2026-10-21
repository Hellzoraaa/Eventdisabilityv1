import React, { useEffect, useState } from 'react';
import { Participant } from '../types.ts';

interface Props {
  participant: Participant;
  field: 'nilaiPretest' | 'nilaiPostest';
  onSaved?: (p: Participant) => void;
}

/** Sel nilai yang bisa diisi langsung; tersimpan otomatis saat fokus berpindah. */
export const ScoreCell: React.FC<Props> = ({ participant, field, onSaved }) => {
  const initial = participant[field];
  const [value, setValue] = useState(initial == null ? '' : String(initial));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => { setValue(participant[field] == null ? '' : String(participant[field])); }, [participant, field]);

  const save = async () => {
    const current = participant[field] == null ? '' : String(participant[field]);
    if (value === current) return;
    const num = value === '' ? null : Number(value);
    if (num !== null && (!Number.isFinite(num) || num < 0 || num > 100)) { setState('error'); return; }
    setState('saving');
    try {
      const res = await fetch(`/api/participants/${encodeURIComponent(participant.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.participant) throw new Error(data.error || 'gagal');
      setState('saved'); onSaved?.(data.participant);
      setTimeout(() => setState('idle'), 1500);
    } catch { setState('error'); }
  };

  return (
    <input
      type="number" min={0} max={100} step="0.01" inputMode="decimal"
      value={value}
      onChange={e => { setValue(e.target.value); setState('idle'); }}
      onBlur={() => void save()}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      placeholder="0–100"
      aria-label={field === 'nilaiPretest' ? 'Nilai pretest' : 'Nilai postest'}
      className={`w-20 px-2 py-1.5 border rounded-lg text-[12px] text-center focus:outline-none focus:ring-1 focus:ring-primary ${state === 'error' ? 'border-red-400 bg-red-50' : state === 'saved' ? 'border-emerald-400 bg-emerald-50' : 'border-outline-variant/50 bg-white'}`}
    />
  );
};
