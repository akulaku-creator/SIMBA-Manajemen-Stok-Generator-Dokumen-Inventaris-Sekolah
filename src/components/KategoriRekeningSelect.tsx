import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, ChevronDown, ShieldCheck, Tag, X } from 'lucide-react';
import { MASTER_40_REKENING_OPTIONS, ALL_REKENING_MASTER_OPTIONS } from '../data/kodeRekeningData';
import { JenisBarang } from '../types';

export interface SelectedRekening {
  kode: string;
  nama: string;
  kategori: string;
  jenisAset: JenisBarang;
  label: string;
}

interface Props {
  valueKode?: string;
  valueKategori?: string;
  jenisBarang?: JenisBarang;
  onSelect: (selected: SelectedRekening) => void;
  className?: string;
  required?: boolean;
}

export const KategoriRekeningSelect: React.FC<Props> = ({
  valueKode,
  valueKategori,
  jenisBarang = 'BHP',
  onSelect,
  className = '',
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    if (valueKode) {
      const match = ALL_REKENING_MASTER_OPTIONS.find(item => item.kode === valueKode);
      if (match) return match;
    }
    if (valueKategori) {
      const cleanKat = valueKategori.toLowerCase().trim();
      const match = ALL_REKENING_MASTER_OPTIONS.find(
        item => item.nama.toLowerCase().trim() === cleanKat || item.label.toLowerCase().trim() === cleanKat
      );
      if (match) return match;
    }
    // Default fallback to 5.1.02.01.01.0024 ATK
    return ALL_REKENING_MASTER_OPTIONS.find(i => i.kode === '5.1.02.01.01.0024') || MASTER_40_REKENING_OPTIONS[0];
  }, [valueKode, valueKategori]);

  // Filter options based on user search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const sourceList = jenisBarang === 'Belanja Modal' ? ALL_REKENING_MASTER_OPTIONS : MASTER_40_REKENING_OPTIONS;

    if (!query) {
      return sourceList;
    }

    return sourceList.filter(
      item =>
        item.kode.toLowerCase().includes(query) ||
        item.nama.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query)
    );
  }, [searchQuery, jenisBarang]);

  const handleSelect = (item: SelectedRekening) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left bg-white border rounded-lg transition-all shadow-2xs focus:outline-hidden ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          {selectedItem ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
              <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded shrink-0">
                {selectedItem.kode}
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate" title={selectedItem.nama}>
                {selectedItem.nama}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Pilih Kategori &amp; Kode Rekening Belanja...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {/* Hidden input to satisfy form required check */}
      {required && (
        <input
          type="hidden"
          value={selectedItem?.kode || ''}
          required
        />
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik kode (misal: 0024) atau nama kategori (misal: Kertas)..."
                className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-1.5 px-0.5 text-[10px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                40 Daftar Master Rekening Resmi
              </span>
              <span>{filteredOptions.length} kategori ditemukan</span>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Tidak ditemukan kategori atau rekening yang cocok dengan "{searchQuery}".
              </div>
            ) : (
              filteredOptions.map(item => {
                const isSelected = selectedItem?.kode === item.kode;
                return (
                  <button
                    key={item.kode}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.kode}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-snug">
                        {item.nama}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.jenisAset === 'Belanja Modal' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        <span>{item.jenisAset === 'Belanja Modal' ? 'Belanja Modal (Aset Tetap)' : 'Belanja Operasional (BHP)'}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Information */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center font-medium">
            Single Source of Truth: 1 Kategori Barang = 1 Kode Rekening Belanja
          </div>
        </div>
      )}
    </div>
  );
};
