
import React, { useMemo, useEffect, useState } from 'react';
import { PlantEntry } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { ensureLeaflet } from '../services/resourceLoader';

const HEALTH_COLORS = {
  Sehat: '#10b981',
  Merana: '#f59e0b',
  Mati: '#ef4444'
};

const getHighResImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const driveIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    const fileId = driveIdMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  return url;
};

const MapRecenter = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 18);
  }, [center, map]);
  return null;
};

export const AnalyticsPanel: React.FC<{ entries: PlantEntry[] }> = ({ entries }) => {
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  useEffect(() => {
    ensureLeaflet().then(() => setIsLeafletReady(true));
  }, []);

  // Data untuk Scatter Chart (Tinggi)
  const scatterData = useMemo(() => {
    return entries.map((e, idx) => ({
      index: e.noPohon || idx + 1,
      tinggi: typeof e.tinggi === 'string' ? parseFloat(e.tinggi) : e.tinggi,
      kesehatan: e.kesehatan,
      name: `Pohon #${e.noPohon}`
    }));
  }, [entries]);

  // Data untuk Horizontal Bar (Pengawas)
  const supervisorData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      const name = e.pengawas || 'Anonim';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const mapCenter = useMemo(() => {
    const valid = entries.filter(e => e.gps && e.gps.lat !== 0);
    if (valid.length === 0) return [-2.979129, 115.199507];
    const last = valid[valid.length - 1];
    return [last.gps!.lat, last.gps!.lon];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-2xl">📊</div>
        <p className="font-bold text-[10px] uppercase tracking-widest text-center">Belum ada data analitik<br/><span className="text-[8px] opacity-60">Ambil foto untuk melihat visualisasi</span></p>
      </div>
    );
  }

  if (!isLeafletReady) {
    return <div className="h-[300px] w-full rounded-[2.5rem] bg-slate-100 shimmer flex items-center justify-center text-[10px] font-black uppercase text-slate-400">Memuat GIS...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* PETA SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Spatial Distribution (GIS)
          </h4>
          <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">Real-time Location</span>
        </div>
        <div className="h-[350px] w-full rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl relative z-0">
          <MapContainer center={mapCenter as [number, number]} zoom={18} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            <MapRecenter center={mapCenter as [number, number]} />
            {entries.filter(e => e.gps && e.gps.lat !== 0).map((entry) => (
              <Marker key={entry.id} position={[entry.gps!.lat, entry.gps!.lon]}>
                <Popup minWidth={220}>
                  <div className="w-full overflow-hidden">
                    {entry.foto && (
                      <img src={getHighResImageUrl(entry.foto)} className="w-full h-32 object-cover rounded-xl mb-2" alt="Pohon" />
                    )}
                    <p className="font-black text-xs uppercase">Pohon #{entry.noPohon}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{entry.tanaman} • {entry.tinggi} CM</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* SCATTER TINGGI SECTION */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest px-1">Scatter: Tinggi per Indeks Pohon</h4>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" dataKey="index" name="Indeks" unit="" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} />
              <YAxis type="number" dataKey="tinggi" name="Tinggi" unit="cm" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} />
              <ZAxis type="number" range={[100, 100]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
              <Scatter name="Pohon" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.kesehatan as keyof typeof HEALTH_COLORS] || '#3b82f6'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* HORIZONTAL BAR PENGAWAS SECTION */}
      <section className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest px-1">Produktivitas Pengawas (Realisasi)</h4>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supervisorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" fontSize={9} fontWeight="black" tickLine={false} axisLine={false} stroke="#64748b" width={80} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey="count" name="Jumlah" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20}>
                 {supervisorData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#1d4ed8' : '#60a5fa'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
