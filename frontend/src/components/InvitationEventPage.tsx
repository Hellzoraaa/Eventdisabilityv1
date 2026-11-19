import React, { useEffect, useState } from 'react';
import { EventDetailPage } from './EventDetailPage.tsx';
import { TrainingProposal, Participant, DisabilityMaster } from '../types.ts';

interface Props {
  token: string;
  disabilities: DisabilityMaster[];
  appSettings: any;
  onRegisterSuccess: (participant: Participant) => void;
}

export const InvitationEventPage: React.FC<Props> = ({ token, disabilities, appSettings, onRegisterSuccess }) => {
  const [event, setEvent] = useState<TrainingProposal | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/invitation/${encodeURIComponent(token)}`)
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Undangan tidak ditemukan.');
        return data;
      })
      .then(data => { if (!cancelled) { setEvent(data.event); setStatus('ready'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [token]);

  if (status === 'loading') return <main className="min-h-screen grid place-items-center p-6">Memuat undangan...</main>;
  if (status === 'error' || !event) return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-md text-center rounded-2xl border p-8"><h1 className="text-xl font-bold">Undangan tidak tersedia</h1><p className="mt-2 text-sm text-slate-600">Link mungkin salah, sudah tidak berlaku, atau event belum disetujui.</p></div></main>;
  return <EventDetailPage eventId={event.id} step="form" event={event} disabilities={disabilities} appSettings={appSettings} onRegisterSuccess={onRegisterSuccess} />;
};
