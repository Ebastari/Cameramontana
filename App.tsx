
import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { BottomSheet } from './components/BottomSheet';
import { useLocalStorage } from './hooks/useLocalStorage';
import { writeExifData } from './services/exifService';
import { uploadToAppsScript } from './services/uploadService';
import { watchGpsLocation } from './services/gpsService';
import { PlantEntry, GpsLocation, ToastState, FormState } from './types';
import { Toast } from './components/Toast';
import { getAllEntries, saveEntry, updateEntryStatus, clearAllEntries } from './services/dbService';

const App: React.FC = () => {
  const [entries, setEntries] = useState<PlantEntry[]>([]);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [formState, setFormState] = useLocalStorage<FormState>('formState', {
    tinggi: 10,
    tahunTanam: new Date().getFullYear(),
    jenis: 'Sengon',
    pekerjaan: '',
    pengawas: '',
    vendor: '',
    tim: '',
    kesehatan: 'Sehat',
  });

  const [gps, setGps] = useState<GpsLocation | null>(null);
  const [appsScriptUrl, setAppsScriptUrl] = useLocalStorage<string>(
    'appsScriptUrl', 
    'https://script.google.com/macros/s/AKfycbz_lxW9C6HYzFLlrJmY9PuQNDKx1UUwjdKsdpVs8rtWgJxFcAmFg-MIYRT5zlkjH5aoDQ/exec'
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllEntries();
        setEntries(data);
      } catch (err) {
        console.error("Gagal memuat database:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi Terhubung', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode Offline Aktif', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let watchId: number;
    try {
      watchId = watchGpsLocation(
        (location) => setGps(location),
        (error) => console.error("GPS Error:", error)
      );
    } catch (e) {
      console.error("GPS Geolocation not available");
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const syncPendingEntries = useCallback(async () => {
    const pending = entries.filter(e => !e.uploaded);
    if (pending.length === 0) {
      showToast('Semua data sudah tersinkronisasi', 'success');
      return;
    }

    if (!navigator.onLine) {
      showToast('Tidak ada internet untuk sinkronisasi', 'error');
      return;
    }

    showToast(`Sinkronisasi ${pending.length} data...`, 'info');
    
    let successCount = 0;
    for (const entry of pending) {
      try {
        await uploadToAppsScript(appsScriptUrl, entry);
        await updateEntryStatus(entry.id, true);
        successCount++;
      } catch (error) {
        console.error(`Gagal upload entri ${entry.id}:`, error);
      }
    }

    if (successCount > 0) {
      const updatedData = await getAllEntries();
      setEntries(updatedData);
      showToast(`${successCount} data berhasil diunggah`, 'success');
    } else {
      showToast('Gagal sinkronisasi data', 'error');
    }
  }, [entries, appsScriptUrl, showToast]);

  const handleCapture = useCallback(async (dataUrl: string) => {
    const timestamp = new Date();
    const pad = (n: number, len: number = 2) => n.toString().padStart(len, '0');
    const id = `${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}-${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}${pad(timestamp.getMilliseconds(), 3)}`;

    const lat = gps ? gps.lat : 0;
    const lon = gps ? gps.lon : 0;

    const newEntryMeta: Omit<PlantEntry, 'foto'> = {
      id,
      tanggal: timestamp.toLocaleString('id-ID'),
      timestamp: timestamp.toISOString(),
      gps: gps || undefined,
      lokasi: `${lat.toFixed(6)},${lon.toFixed(6)}`,
      pekerjaan: formState.pekerjaan,
      tinggi: formState.tinggi,
      koordinat: `${lat.toFixed(6)},${lon.toFixed(6)}`,
      y: lon,
      x: lat,
      tanaman: formState.jenis,
      tahunTanam: formState.tahunTanam,
      pengawas: formState.pengawas,
      vendor: formState.vendor,
      tim: formState.tim,
      kesehatan: formState.kesehatan,
      noPohon: entries.length + 1,
      uploaded: false,
      statusDuplikat: "UNIK"
    };

    try {
      showToast('Memproses Geotag...', 'info', 1000);
      
      // Injeksi data EXIF ke biner gambar
      const photoWithExif = await writeExifData(dataUrl, newEntryMeta);
      
      const finalEntry: PlantEntry = { ...newEntryMeta, foto: photoWithExif };
      
      await saveEntry(finalEntry);
      setEntries(prev => [...prev, finalEntry]);

      // DOWNLOAD OTOMATIS
      setTimeout(() => {
        const downloadLink = document.createElement('a');
        downloadLink.href = photoWithExif;
        downloadLink.download = `TREE_${formState.jenis.toUpperCase()}_${id}.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }, 300);

      if (appsScriptUrl && navigator.onLine) {
        showToast('Mengirim ke Cloud...', 'info');
        try {
          await uploadToAppsScript(appsScriptUrl, finalEntry);
          await updateEntryStatus(finalEntry.id, true);
          setEntries(prev => prev.map(e => e.id === finalEntry.id ? { ...e, uploaded: true } : e));
          showToast('Berhasil Tersinkron!', 'success');
        } catch (error) {
          showToast('Gagal Sinkron, Tersimpan Lokal.', 'info');
        }
      } else {
        showToast('Tersimpan dengan Geotag.', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Gagal memproses gambar.', 'error');
    }
  }, [formState, gps, entries.length, appsScriptUrl, showToast]);

  const handleClearData = async () => {
    if (window.confirm('Hapus semua data dari database lokal?')) {
      await clearAllEntries();
      setEntries([]);
      showToast('Database dibersihkan.', 'success');
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-slate-800">
      <CameraView 
        onCapture={handleCapture}
        formState={formState}
        onFormStateChange={setFormState}
        entriesCount={entries.length}
        gps={gps}
        onGpsUpdate={setGps}
        onShowSheet={() => setBottomSheetOpen(true)}
        showToast={showToast}
        isOnline={isOnline}
      />
      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        entries={entries}
        formState={formState}
        onFormStateChange={setFormState}
        onClearData={handleClearData}
        appsScriptUrl={appsScriptUrl}
        onAppsScriptUrlChange={setAppsScriptUrl}
        showToast={showToast}
        gps={gps}
        onGpsUpdate={setGps}
        onSyncPending={syncPendingEntries}
        isOnline={isOnline}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
};

export default App;
