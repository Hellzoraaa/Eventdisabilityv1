import React, { useState } from 'react';
import { Icon } from './Icon.tsx';
import { SystemLog } from '../types.ts';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemLog[];
  onRefreshLogs?: () => void;
  onClearLogs?: () => void;
  onDeleteLogItem?: (id: string) => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onRefreshLogs,
  onClearLogs,
  onDeleteLogItem,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesModule = selectedModule === 'all' || log.module === selectedModule;
    const matchesSearch =
      searchQuery === '' ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  const getStatusBadge = (status: SystemLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getModuleBadge = (mod: SystemLog['module']) => {
    switch (mod) {
      case 'profile':
        return { label: 'Profil', color: 'bg-purple-100 text-purple-800' };
      case 'settings':
        return { label: 'Settings', color: 'bg-cyan-100 text-cyan-800' };
      case 'events':
        return { label: 'Event', color: 'bg-emerald-100 text-emerald-800' };
      case 'disability':
        return { label: 'Disabilitas', color: 'bg-indigo-100 text-indigo-800' };
      case 'participants':
        return { label: 'Peserta', color: 'bg-amber-100 text-amber-800' };
      case 'auth':
        return { label: 'Autentikasi', color: 'bg-rose-100 text-rose-800' };
      case 'support':
        return { label: 'Bantuan / Kontak', color: 'bg-teal-100 text-teal-800' };
      default:
        return { label: 'Sistem', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="history" className="text-[22px]" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-gray-900 leading-tight">
                Logs Aktivitas Sistem
              </h3>
              <p className="text-[12px] text-gray-500">
                Audit riwayat aksi pengguna, perubahan konfigurasi, event, dan sinkronisasi data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshLogs && (
              <button
                onClick={onRefreshLogs}
                title="Muat Ulang Data Logs"
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <Icon name="refresh" className="text-[20px]" />
              </button>
            )}
            {onClearLogs && logs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus SEMUA riwayat logs aktivitas sistem? Tindakan ini tidak dapat dibatalkan.')) {
                    onClearLogs();
                  }
                }}
                title="Hapus Semua Riwayat Logs"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 text-[12px] font-semibold transition-colors cursor-pointer"
              >
                <Icon name="delete_sweep" className="text-[17px]" />
                <span>Hapus Semua Log</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          {/* Module Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            <span className="text-gray-500 font-medium mr-1">Modul:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'support', label: 'Pesan / Kontak' },
              { id: 'profile', label: 'Profil' },
              { id: 'settings', label: 'Settings' },
              { id: 'events', label: 'Event' },
              { id: 'disability', label: 'Disabilitas' },
              { id: 'auth', label: 'Autentikasi' },
              { id: 'system', label: 'Sistem' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m.id)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  selectedModule === m.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari aktivitas..."
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-[12px] w-full sm:w-56 focus:outline-none focus:border-primary"
            />
            <Icon name="search" className="absolute left-2.5 top-2 text-[15px] text-gray-400" />
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Icon name="manage_search" className="text-[40px] mb-2 text-gray-300" />
              <p className="text-[13px]">Tidak ada rekaman logs yang sesuai dengan kriteria filter.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const mod = getModuleBadge(log.module);
              const formattedDate = new Date(log.timestamp).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        log.status === 'success'
                          ? 'bg-emerald-500'
                          : log.status === 'warning'
                          ? 'bg-amber-500'
                          : log.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-gray-900">{log.action}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mod.color}`}>
                          {mod.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 border rounded ${getStatusBadge(log.status)}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-[12px] text-gray-600 leading-snug">{log.details}</p>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Icon name="person" className="text-[13px]" />
                          <span>{log.user} ({log.userRole})</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[13px]" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {onDeleteLogItem && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus catatan log "${log.action}"?`)) {
                          onDeleteLogItem(log.id);
                        }
                      }}
                      title="Hapus log ini"
                      className="self-start sm:self-center p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[12px] text-gray-500">
          <span>Menampilkan {filteredLogs.length} dari {logs.length} catatan audit log</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium text-[12px] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
