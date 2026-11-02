import React from 'react';
import { Barang, KopSuratConfig, Pejabat, TransaksiPenerimaan, TransaksiPengeluaran } from '../../types';
import { formatRupiah, formatTanggalIndonesia } from '../../utils/numberGenerator';
import { resolveKepalaSekolah, resolvePengurusBarang } from '../../utils/pejabatResolver';
import { KopSuratView } from '../KopSuratView';
import { SignatoryBukuPersediaan } from './SignatoryBlocks';

import { buildMergeKey } from '../../utils/barangDeduplicationHelper';

interface Props {
  transaksiPengeluaranList: TransaksiPengeluaran[];
  transaksiPenerimaanList: TransaksiPenerimaan[];
  masterBarang: Barang[];
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  settings?: any;
  pejabatSettings?: any;
  dataDokumen?: any;
  minRows?: number;
}

interface RekapRow {
  id: string;
  mergeKey: string;
  tanggal: string;
  noBukti: string;
  kodeBarang: string;
  nusp: string;
  namaBarang: string;
  satuan: string;
  tipe: 'masuk' | 'keluar';
  jumlahMasuk: number;
  hargaSatuanMasuk: number;
  totalMasuk: number;
  jumlahKeluar: number;
  hargaSatuanKeluar: number;
  totalKeluar: number;
  saldoJumlah: number;
  keterangan: string;
}

export const DocBukuRekap: React.FC<Props> = ({
  transaksiPengeluaranList,
  transaksiPenerimaanList,
  masterBarang,
  kopConfig,
  pejabatList,
  settings,
  pejabatSettings,
  dataDokumen,
  minRows = 16
}) => {
  const kepsek = resolveKepalaSekolah(pejabatList);
  const pengurusBarang = resolvePengurusBarang(pejabatList);

  // 1. Initial balance map by unique identity key (Nama + Kode Rekening + Harga Satuan)
  const initialStockMap = new Map<string, number>();
  masterBarang.forEach(b => {
    const key = buildMergeKey(b);
    initialStockMap.set(key, (initialStockMap.get(key) || 0) + (Number(b.stokAwal) || 0));
  });

  // 2. Deduplicate incoming transactions by unique ID or signature
  const uniqueTrxMasuk: TransaksiPenerimaan[] = [];
  const seenTrxMasukKeys = new Set<string>();
  transaksiPenerimaanList.forEach(trx => {
    const trxKey = trx.id ? `id_${trx.id}` : `${trx.noBukti}_${trx.tanggal}_${trx.penyedia}`;
    if (!seenTrxMasukKeys.has(trxKey)) {
      seenTrxMasukKeys.add(trxKey);
      uniqueTrxMasuk.push(trx);
    }
  });

  // 3. Deduplicate outgoing transactions by unique ID or signature
  const uniqueTrxKeluar: TransaksiPengeluaran[] = [];
  const seenTrxKeluarKeys = new Set<string>();
  transaksiPengeluaranList.forEach(trx => {
    const trxKey = trx.id ? `id_${trx.id}` : `${trx.noSPPB}_${trx.noBAST}_${trx.tanggal}_${trx.unitPemohon}`;
    if (!seenTrxKeluarKeys.has(trxKey)) {
      seenTrxKeluarKeys.add(trxKey);
      uniqueTrxKeluar.push(trx);
    }
  });

  // Compile combined ledger entries chronologically
  const rows: RekapRow[] = [];

  // Add incoming items
  uniqueTrxMasuk.forEach(trx => {
    trx.items?.forEach((item, itemIdx) => {
      const matchedMaster = masterBarang.find(mb => mb.id === item.barangId);
      const effectiveKode = (item.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
      const effectiveHarga = Number(item.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0;
      const mergeKey = buildMergeKey({
        namaBarang: item.namaBarang,
        kodeRekening: effectiveKode,
        hargaSatuan: effectiveHarga
      });
      const subtotal = item.subtotal || (item.jumlahMasuk * effectiveHarga);
      rows.push({
        id: `rcv-${trx.id || trx.noBukti}-${itemIdx}-${item.barangId || ''}`,
        mergeKey,
        tanggal: trx.tanggal,
        noBukti: trx.noBukti,
        kodeBarang: item.kodeBarang || matchedMaster?.kodeBarang || '',
        nusp: item.nusp || matchedMaster?.nusp || '',
        namaBarang: item.namaBarang,
        satuan: item.satuan || matchedMaster?.satuan || 'Pcs',
        tipe: 'masuk',
        jumlahMasuk: Number(item.jumlahMasuk) || 0,
        hargaSatuanMasuk: effectiveHarga,
        totalMasuk: subtotal,
        jumlahKeluar: 0,
        hargaSatuanKeluar: 0,
        totalKeluar: 0,
        saldoJumlah: 0, // Calculated sequentially below
        keterangan: `${trx.sumberDana || 'BOS'} (${trx.penyedia || 'Penyedia'})`
      });
    });
  });

  // Add outgoing disbursement items
  uniqueTrxKeluar.forEach(trx => {
    trx.items?.forEach((item, itemIdx) => {
      const matchedMaster = masterBarang.find(mb => mb.id === item.barangId);
      const effectiveKode = (item.kodeRekening || matchedMaster?.kodeRekening || '5.1.02.01.01.0024').trim();
      const effectiveHarga = Number(item.hargaSatuan) || Number(matchedMaster?.hargaSatuan) || 0;
      const mergeKey = buildMergeKey({
        namaBarang: item.namaBarang,
        kodeRekening: effectiveKode,
        hargaSatuan: effectiveHarga
      });
      const subtotal = (Number(item.usulanJumlah) || 0) * effectiveHarga;
      rows.push({
        id: `out-${trx.id || trx.noSPPB}-${itemIdx}-${item.barangId || ''}`,
        mergeKey,
        tanggal: trx.tanggal,
        noBukti: trx.noBAST || trx.noSPPB,
        kodeBarang: item.kodeBarang || matchedMaster?.kodeBarang || '',
        nusp: item.nusp || matchedMaster?.nusp || '',
        namaBarang: item.namaBarang,
        satuan: item.satuan || matchedMaster?.satuan || 'Pcs',
        tipe: 'keluar',
        jumlahMasuk: 0,
        hargaSatuanMasuk: 0,
        totalMasuk: 0,
        jumlahKeluar: Number(item.usulanJumlah) || 0,
        hargaSatuanKeluar: effectiveHarga,
        totalKeluar: subtotal,
        saldoJumlah: 0, // Calculated sequentially below
        keterangan: `${trx.unitPemohon || 'Unit'}: ${item.keperluan || trx.keperluanUmum || 'Operasional'}`
      });
    });
  });

  // Sort rows chronologically
  rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Sequential calculation of running balance per unique item identity:
  // Saldo Awal + Masuk - Keluar = Saldo Akhir (guaranteed non-negative)
  const runningStockMap = new Map<string, number>();
  rows.forEach(r => {
    const current = runningStockMap.has(r.mergeKey)
      ? runningStockMap.get(r.mergeKey)!
      : (initialStockMap.get(r.mergeKey) || 0);

    let nextStock = current;
    if (r.tipe === 'masuk') {
      nextStock = current + r.jumlahMasuk;
    } else if (r.tipe === 'keluar') {
      nextStock = Math.max(0, current - r.jumlahKeluar);
    }
    runningStockMap.set(r.mergeKey, nextStock);
    r.saldoJumlah = nextStock;
  });

  // Accumulate totals
  const grandTotalMasuk = rows.reduce((acc, r) => acc + r.totalMasuk, 0);
  const grandTotalKeluar = rows.reduce((acc, r) => acc + r.totalKeluar, 0);
  const totalVolumeMasuk = rows.reduce((acc, r) => acc + r.jumlahMasuk, 0);
  const totalVolumeKeluar = rows.reduce((acc, r) => acc + r.jumlahKeluar, 0);

  const totalEmptyRows = Math.max(0, minRows - rows.length);

  return (
    <div className="doc-content font-serif text-black select-text">
      {/* Official Kop (Preserved Proportion) */}
      <div className="doc-header-kop avoid-break">
        <KopSuratView config={kopConfig} />
      </div>

      {/* Report Title */}
      <div className="doc-meta-block avoid-break">
        <div className="doc-title-block">
          <h2>BUKU PENERIMAAN DAN PENGELUARAN BARANG PERSEDIAAN</h2>
          <p className="font-bold text-slate-800 tracking-wide">REKAPITULASI DANA BANTUAN OPERASIONAL SEKOLAH (BOS) &amp; APBD</p>
          <p className="italic text-slate-700">Tahun Anggaran {new Date().getFullYear()} — Semester Berjalan</p>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto w-full">
        <table className="doc-table w-full border-collapse border border-black text-[8.5pt] mb-3" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th rowSpan={2} style={{ width: '3%' }} className="border border-black px-1 py-1">No</th>
              <th rowSpan={2} style={{ width: '8%' }} className="border border-black px-1 py-1">Tanggal</th>
              <th rowSpan={2} style={{ width: '11%' }} className="border border-black px-1 py-1">No. Bukti / Dokumen</th>
              <th rowSpan={2} style={{ width: '9%' }} className="border border-black px-1 py-1">Kode / NUSP</th>
              <th rowSpan={2} style={{ width: '17%' }} className="border border-black px-1.5 py-1">Uraian Nama Barang</th>
              <th rowSpan={2} style={{ width: '4%' }} className="border border-black px-1 py-1">Sat.</th>
              <th colSpan={3} style={{ width: '18%' }} className="border border-black px-1 py-1 bg-emerald-50/50">PENERIMAAN (MASUK)</th>
              <th colSpan={3} style={{ width: '18%' }} className="border border-black px-1 py-1 bg-amber-50/50">PENGELUARAN (DISALURKAN)</th>
              <th rowSpan={2} style={{ width: '4%' }} className="border border-black px-1 py-1">Sisa</th>
              <th rowSpan={2} style={{ width: '8%' }} className="border border-black px-1.5 py-1">Keterangan / Sumber</th>
            </tr>
            <tr className="bg-slate-50 text-center font-semibold text-[8pt]">
              <th style={{ width: '4%' }} className="border border-black px-1 py-0.5">Vol</th>
              <th style={{ width: '6%' }} className="border border-black px-1 py-0.5">Harga (Rp)</th>
              <th style={{ width: '8%' }} className="border border-black px-1 py-0.5">Total (Rp)</th>
              <th style={{ width: '4%' }} className="border border-black px-1 py-0.5">Vol</th>
              <th style={{ width: '6%' }} className="border border-black px-1 py-0.5">Harga (Rp)</th>
              <th style={{ width: '8%' }} className="border border-black px-1 py-0.5">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="align-top hover:bg-slate-50/50">
                <td className="border border-black px-1 py-1 text-center font-medium">{idx + 1}.</td>
                <td className="border border-black px-1 py-1 text-center text-[8pt]">{formatTanggalIndonesia(row.tanggal)}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">{row.noBukti}</td>
                <td className="border border-black px-1 py-1 font-mono text-[8pt]">
                  <div>{row.kodeBarang}</div>
                  <div className="text-[7pt] text-slate-500">{row.nusp}</div>
                </td>
                <td className="border border-black px-1.5 py-1 font-medium">{row.namaBarang}</td>
                <td className="border border-black px-1 py-1 text-center">{row.satuan}</td>

                {/* Masuk */}
                <td className="border border-black px-1 py-1 text-center font-medium bg-emerald-50/10">
                  {row.jumlahMasuk > 0 ? row.jumlahMasuk : ''}
                </td>
                <td className="border border-black px-1 py-1 text-right text-[8pt] bg-emerald-50/10">
                  {row.jumlahMasuk > 0 && row.hargaSatuanMasuk > 0 ? formatRupiah(row.hargaSatuanMasuk).replace('Rp', '') : ''}
                </td>
                <td className="border border-black px-1 py-1 text-right font-medium text-[8pt] bg-emerald-50/10">
                  {row.jumlahMasuk > 0 && row.totalMasuk > 0 ? formatRupiah(row.totalMasuk).replace('Rp', '') : ''}
                </td>

                {/* Keluar */}
                <td className="border border-black px-1 py-1 text-center font-medium bg-amber-50/10">
                  {row.jumlahKeluar > 0 ? row.jumlahKeluar : ''}
                </td>
                <td className="border border-black px-1 py-1 text-right text-[8pt] bg-amber-50/10">
                  {row.jumlahKeluar > 0 && row.hargaSatuanKeluar > 0 ? formatRupiah(row.hargaSatuanKeluar).replace('Rp', '') : ''}
                </td>
                <td className="border border-black px-1 py-1 text-right font-medium text-[8pt] bg-amber-50/10">
                  {row.jumlahKeluar > 0 && row.totalKeluar > 0 ? formatRupiah(row.totalKeluar).replace('Rp', '') : ''}
                </td>

                {/* Sisa & Ket */}
                <td className="border border-black px-1 py-1 text-center font-bold">
                  {row.saldoJumlah > 0 ? row.saldoJumlah : ''}
                </td>
                <td className="border border-black px-1 py-1 text-[8pt]">{row.keterangan}</td>
              </tr>
            ))}

            {/* Standard blank grid rows */}
            {Array.from({ length: totalEmptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-6">
                <td className="border border-black px-1 py-1 text-center text-slate-300">
                  {rows.length + i + 1}.
                </td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
                <td className="border border-black px-1 py-1"></td>
              </tr>
            ))}

            {/* TOTAL / JUMLAH ACCUMULATION ROW */}
            <tr className="bg-slate-200/80 font-bold text-center">
              <td colSpan={6} className="border border-black px-2 py-1.5 text-right uppercase tracking-wider">
                JUMLAH TOTAL:
              </td>
              {/* Masuk Totals */}
              <td className="border border-black px-1 py-1.5">
                {totalVolumeMasuk > 0 ? totalVolumeMasuk : ''}
              </td>
              <td className="border border-black px-1 py-1.5 bg-slate-100/50"></td>
              <td className="border border-black px-1 py-1.5 text-right font-mono text-[8pt]">
                {grandTotalMasuk > 0 ? formatRupiah(grandTotalMasuk) : ''}
              </td>
              {/* Keluar Totals */}
              <td className="border border-black px-1 py-1.5">
                {totalVolumeKeluar > 0 ? totalVolumeKeluar : ''}
              </td>
              <td className="border border-black px-1 py-1.5 bg-slate-100/50"></td>
              <td className="border border-black px-1 py-1.5 text-right font-mono text-[8pt]">
                {grandTotalKeluar > 0 ? formatRupiah(grandTotalKeluar) : ''}
              </td>
              {/* Balance */}
              <td colSpan={2} className="border border-black px-2 py-1.5 text-left text-[8pt]">
                Saldo Buku: {formatRupiah(grandTotalMasuk - grandTotalKeluar)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legal Signatures */}
      <SignatoryBukuPersediaan
        pejabatList={pejabatList}
        kopConfig={kopConfig}
        settings={settings}
        pejabatSettings={pejabatSettings}
        dataDokumen={dataDokumen}
      />
    </div>
  );
};
