import React from 'react';
import { KopSuratConfig, Pejabat, TransaksiPengeluaran } from '../../types';
import { A4Container } from '../A4Container';
import { DocBAST } from './DocBAST';
import { DocNPB } from './DocNPB';
import { DocSPB } from './DocSPB';
import { DocSPPB } from './DocSPPB';

interface Props {
  transaksi: TransaksiPengeluaran;
  kopConfig: KopSuratConfig;
  pejabatList: Pejabat[];
  minRows?: number;
  paperSize?: 'A4' | 'F4';
}

export const DocumentBundle: React.FC<Props> = ({
  transaksi,
  kopConfig,
  pejabatList,
  minRows = 10,
  paperSize = 'A4'
}) => {
  return (
    <div className="flex flex-col gap-8 print:gap-0 print:block">
      {/* 1. Nota Permintaan Barang (NPB) - Halaman 1 */}
      <A4Container paperSize={paperSize} orientation="portrait" breakAfter={true}>
        <DocNPB 
          transaksi={transaksi} 
          kopConfig={kopConfig} 
          pejabatList={pejabatList} 
          minRows={minRows} 
        />
      </A4Container>

      {/* 2. Surat Permintaan Barang (SPB) - Halaman 2 */}
      <A4Container paperSize={paperSize} orientation="portrait" breakAfter={true}>
        <DocSPB 
          transaksi={transaksi} 
          kopConfig={kopConfig} 
          pejabatList={pejabatList} 
          minRows={minRows} 
        />
      </A4Container>

      {/* 3. Surat Perintah Penyaluran Barang (SPPB) - Halaman 3 */}
      <A4Container paperSize={paperSize} orientation="portrait" breakAfter={true}>
        <DocSPPB 
          transaksi={transaksi} 
          kopConfig={kopConfig} 
          pejabatList={pejabatList} 
          minRows={minRows} 
        />
      </A4Container>

      {/* 4. Berita Acara Serah Terima Barang (BAST) - Halaman 4 */}
      <A4Container paperSize={paperSize} orientation="portrait" breakAfter={false}>
        <DocBAST 
          transaksi={transaksi} 
          kopConfig={kopConfig} 
          pejabatList={pejabatList} 
          minRows={minRows} 
        />
      </A4Container>
    </div>
  );
};
