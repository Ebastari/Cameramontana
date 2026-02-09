
import React, { useState, useEffect, useMemo } from 'react';
import { fetchCloudData } from '../services/fetchService';

interface OnlineDashboardTabProps {
  appsScriptUrl: string;
  isOnline: boolean;
}

export const OnlineDashboardTab: React.FC<OnlineDashboardTabProps> = ({ appsScriptUrl, isOnline }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!isOnline) {
      setError("Perlu koneksi internet untuk memuat dashboard.");
      return;
    }
    
    if (!appsScriptUrl || appsScriptUrl.includes('/s/.../exec')) {
      setError("URL Apps Script belum dikonfigurasi di Tab Pengaturan.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchCloudData(appsScriptUrl);
      // Memastikan hasil adalah array sebelum disimpan ke state
      setData(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data cloud.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [appsScriptUrl, isOnline]);

  const stats = useMemo(() => {
    // Defensif: pastikan data adalah array sebelum memanggil metode array
    const safeData = Array.isArray(data) ? data : [];
    
    if (safeData.length === 0) return { total: 0, sehat: 0, persenSehat: "0", rataTinggi: "0" };
    
    const total = safeData.length;
    const sehat = safeData.filter(d => d && d.Kesehatan === 'Sehat').length;
    const totalTinggi = safeData.reduce((acc, curr) => acc + (parseFloat(curr.Tinggi) || 0), 0);
    
    return {
      total,
      sehat,
      persenSehat: ((sehat / total) * 100).toFixed(1),
      rataTinggi: (totalTinggi / total).toFixed(1)
    };
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="font-black text-slate-800 uppercase tracking-tighter">Cloud Dashboard</h3>
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Real-time Sheets Integration</p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm border border-slate-200 disabled:opacity-50"
        >
          {loading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : '🔄'}
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center space-y-3">
          <p className="text-red-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            {error}
          </p>
          <button 
            onClick={loadData} 
            className="px-6 py-2 bg-red-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-600 p-5 rounded-[2rem] text-white shadow-xl shadow-blue-200">
               <span className="text-[8px] font-black opacity-60 uppercase tracking-widest">Total Terealisasi</span>
               <h2 className="text-3xl font-black mt-1">{stats.total}</h2>
               <p className="text-[9px] mt-2 font-bold opacity-80 uppercase">Pohon Terdata</p>
            </div>
            <div className="bg-emerald-500 p-5 rounded-[2rem] text-white shadow-xl shadow-emerald-200">
               <span className="text-[8px] font-black opacity-60 uppercase tracking-widest">Kesehatan Bibit</span>
               <h2 className="text-3xl font-black mt-1">{stats.persenSehat || 0}%</h2>
               <p className="text-[9px] mt-2 font-bold opacity-80 uppercase">Kondisi Sehat</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-inner">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rata-rata Tinggi</span>
            <span className="text-sm font-black text-slate-800 mr-2">{stats.rataTinggi} CM</span>
          </div>

          {/* List Data Terakhir */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data Terbaru di Cloud</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {Array.isArray(data) && data.length > 0 ? (
                data.slice().reverse().map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-blue-100 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-800">POHON #{item["No Pohon"] || 'N/A'}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                        {item.Tanaman || 'Unknown'} - {item.Tanggal || '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                         <p className="text-[9px] font-black text-blue-600">{item.Tinggi || 0} CM</p>
                         <p className="text-[7px] text-slate-300 font-mono">{item.Koordinat || '-'}</p>
                      </div>
                      {item["Link Drive"] && item["Link Drive"] !== "DATA_HIDDEN" && (
                        <a 
                          href={item["Link Drive"]} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-xs shadow-sm hover:bg-blue-50 transition-colors"
                        >
                          📂
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                !loading && (
                  <div className="text-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Belum ada data di Cloud</p>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
      
      <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100/50">
        <p className="text-[8px] text-blue-500 font-bold uppercase leading-relaxed text-center italic">
          Data ini disinkronkan langsung dari Google Sheets. Pastikan skrip telah di-deploy sebagai Web App dengan akses publik.
        </p>
      </div>
    </div>
  );
};
