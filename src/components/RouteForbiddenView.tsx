import React from 'react';
import { LayoutDashboard, Lock, ShieldAlert } from 'lucide-react';
import { AppUser } from '../types';

interface Props {
  targetRoute: string;
  currentUser: AppUser;
  schoolName: string;
  onBackToDashboard: () => void;
}

export const RouteForbiddenView: React.FC<Props> = ({
  targetRoute,
  currentUser,
  schoolName,
  onBackToDashboard
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-red-200 shadow-2xl p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
            <Lock className="w-3.5 h-3.5" />
            <span>HTTP 403 Forbidden • Akses Ditolak</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Izin Akses Terbatas: Khusus Dinas Pendidikan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Rute <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">{targetRoute}</span> hanya dapat diakses oleh akun pengawas tingkat <strong>Super Admin Dinas Pendidikan Provinsi</strong>. Akun pengguna tingkat sekolah tidak memiliki izin untuk melihat modul atau data ini.
          </p>
        </div>

        {/* Security Isolation Details */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2.5">
          <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider pb-1 border-b border-slate-200 flex items-center justify-between">
            <span>Detail Keamanan &amp; Hak Akses</span>
            <span className="font-mono text-[9px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
              SECURITY_GUARD
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Nama Pengguna:</span>
            <span className="font-semibold text-slate-900">{currentUser.nama} (@{currentUser.username})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Tingkat Akses (Role):</span>
            <span className="font-bold uppercase text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-[10px]">
              {currentUser.role}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Satuan Pendidikan:</span>
            <span className="font-semibold text-slate-900">{schoolName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Kebijakan Proteksi:</span>
            <span className="font-mono text-[11px] font-bold text-rose-700">RBAC_MULTI_TENANT_BARRIER</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Kembali ke Dashboard Operasional Sekolah</span>
          </button>
        </div>
      </div>
    </div>
  );
};
