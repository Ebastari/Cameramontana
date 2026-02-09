
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { getCameraDevices, startCamera } from '../services/cameraService';
import { GpsLocation, FormState } from '../types';
import { Compass } from './Compass';
import { InfoOverlay } from './InfoOverlay';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  formState: FormState;
  onFormStateChange: React.Dispatch<React.SetStateAction<FormState>>;
  entriesCount: number;
  gps: GpsLocation | null;
  onGpsUpdate: (gps: GpsLocation) => void;
  onShowSheet: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isOnline: boolean;
}

const PLANT_TYPES = ['Sengon', 'Nangka', 'Mahoni', 'Malapari'];
const DAILY_TARGET = 50;
const BRAND_NAME = "PT ENERGI BATUBARA LESTARI";

const SHUTTER_SOUND_BASE64 = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU92T18AZm9vYmFyYmF6cXV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4enV4";

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, formState, onFormStateChange, entriesCount, gps, onGpsUpdate, onShowSheet, showToast, isOnline }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shutterSoundRef = useRef<HTMLAudioElement>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [needsUserAction, setNeedsUserAction] = useState(false);
  
  const progressPercentage = useMemo(() => Math.min(100, (entriesCount / DAILY_TARGET) * 100), [entriesCount]);

  const stopCurrentStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const initializeCamera = useCallback(async (deviceId?: string) => {
    setCameraLoading(true);
    setCameraError(null);
    setNeedsUserAction(false);
    stopCurrentStream();
    
    try {
      const stream = await startCamera(deviceId);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        try {
          await videoRef.current.play();
          setCameraLoading(false);
        } catch (playErr) {
          console.error("Autoplay blocked:", playErr);
          setNeedsUserAction(true);
          setCameraLoading(false);
        }

        const currentTrack = stream.getVideoTracks()[0];
        if (currentTrack) {
          setCurrentDeviceId(currentTrack.getSettings().deviceId);
        }
      }
    } catch (err: any) {
      console.error("Camera init error:", err);
      setCameraError(err.name === 'NotAllowedError' ? 'Izin kamera ditolak' : 'Gagal memuat kamera');
      setCameraLoading(false);
      showToast('Gagal mengakses kamera.', 'error');
    }
  }, [stopCurrentStream, showToast]);

  useEffect(() => {
    const startup = async () => {
      try {
        const videoDevices = await getCameraDevices();
        setDevices(videoDevices);
        const backCamera = videoDevices.find(d => /back|rear|environment/i.test(d.label));
        await initializeCamera(backCamera?.deviceId || videoDevices[0]?.deviceId);
      } catch (e) {
        setCameraError('Perangkat tidak didukung');
        setCameraLoading(false);
      }
    };
    startup();
    return () => stopCurrentStream();
  }, [initializeCamera, stopCurrentStream]);
  
  const handleRetryPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setNeedsUserAction(false);
      } catch (err) {
        showToast('Gagal memulai video.', 'error');
      }
    }
  };

  const handleSwitchCamera = useCallback(() => {
    if (devices.length < 2) {
      showToast('Hanya satu kamera terdeteksi.', 'info');
      return;
    }
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    if (nextDevice) {
      initializeCamera(nextDevice.deviceId);
    }
  }, [devices, currentDeviceId, initializeCamera, showToast]);

  const handleCaptureClick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // VALIDASI: Pastikan video sudah memiliki dimensi nyata
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      showToast('Tunggu kamera siap...', 'info');
      return;
    }

    if (navigator.vibrate) navigator.vibrate([50]);
    if (shutterSoundRef.current) {
      shutterSoundRef.current.currentTime = 0;
      shutterSoundRef.current.play().catch(() => {});
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw frame video asli
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay Watermark
    const margin = 20;
    const lh = Math.max(18, Math.round(canvas.height * 0.022));
    ctx.font = `bold ${lh}px sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.max(2, Math.round(lh * 0.1));

    const tanggal = new Date().toLocaleString('id-ID');
    const koordinat = gps ? `${gps.lat.toFixed(6)},${gps.lon.toFixed(6)}` : 'GPS Searching...';

    const lines = [
      `Lokasi: ${koordinat}`,
      `Pohon: ${entriesCount + 1} | Jenis: ${formState.jenis}`,
      `Tinggi: ${formState.tinggi} cm | Status: ${formState.kesehatan}`,
      `Waktu: ${tanggal}`
    ];

    lines.forEach((t, i) => {
      const y = canvas.height - margin - (lines.length - 1 - i) * (lh + 8);
      ctx.strokeText(t, margin, y);
      ctx.fillText(t, margin, y);
    });

    const brandWidth = ctx.measureText(BRAND_NAME).width;
    ctx.strokeText(BRAND_NAME, canvas.width - margin - brandWidth, margin + lh);
    ctx.fillText(BRAND_NAME, canvas.width - margin - brandWidth, margin + lh);

    // Kirim data JPEG kualitas tinggi
    onCapture(canvas.toDataURL('image/jpeg', 0.85));
  }, [onCapture, formState, gps, entriesCount, showToast]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${cameraLoading ? 'opacity-0' : 'opacity-100'}`} 
      />
      
      {(cameraError || needsUserAction) && (
        <div className="z-50 flex flex-col items-center gap-6 px-10 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20">
            <span className="text-4xl">{cameraError ? '⚠️' : '📷'}</span>
          </div>
          <div className="space-y-2">
            <p className="text-white font-black text-sm uppercase tracking-widest leading-relaxed">
              {cameraError || 'Kamera Siap'}
            </p>
            {needsUserAction && (
              <p className="text-white/60 text-[10px] uppercase tracking-tighter">
                Kebijakan browser memerlukan interaksi manual untuk memulai stream.
              </p>
            )}
          </div>
          {needsUserAction && (
            <button 
              onClick={handleRetryPlay}
              className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full shadow-2xl active:scale-95 transition-transform"
            >
              Aktifkan Kamera
            </button>
          )}
        </div>
      )}

      {cameraLoading && !cameraError && (
        <div className="z-20 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Initializing Lens...</span>
        </div>
      )}

      {!isOnline && (
        <div className="absolute top-[calc(var(--safe-area-inset-top)+80px)] left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-amber-500 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Mode Offline</span>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <audio ref={shutterSoundRef} src={SHUTTER_SOUND_BASE64} preload="auto" />

      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start z-30 pointer-events-none safe-top">
        <div className="flex flex-col gap-3 pointer-events-auto">
          <Compass />
          <a 
            href="https://www.montana-tech.info/" 
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-black/60"
          >
            <span className="text-lg">🏠</span>
          </a>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
           <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 flex flex-col items-end shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Progress</span>
                <span className="text-[10px] font-bold text-white">{entriesCount} / {DAILY_TARGET}</span>
              </div>
              <div className="w-20 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
              </div>
           </div>
           
           {!gps && (
             <div className="bg-red-500/20 backdrop-blur-md px-2 py-1 rounded-lg border border-red-500/30 flex items-center gap-2 animate-pulse">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
               <span className="text-[7px] font-black text-red-200 uppercase tracking-widest">GPS SEARCHING...</span>
             </div>
           )}
        </div>
      </div>

      <InfoOverlay formState={formState} entriesCount={entriesCount} gps={gps} />
      
      <div className="absolute bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="mx-4 mb-6 space-y-4">
          
          <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Pengaturan Tinggi</span>
              </div>
              <span className="text-sm font-black text-white bg-blue-600 px-4 py-1.5 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/30">
                {formState.tinggi} cm
              </span>
            </div>
            
            <div className="relative px-2 py-4">
              <input 
                type="range" min="5" max="1500" value={formState.tinggi} 
                onChange={e => onFormStateChange(prev => ({ ...prev, tinggi: parseInt(e.target.value) }))}
                className="w-full h-4 bg-blue-600/30 rounded-full appearance-none cursor-pointer outline-none
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:shadow-[0_0_25px_rgba(255,255,255,0.9),0_0_10px_rgba(0,0,0,0.2)] 
                  [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-blue-500
                  [&::-moz-range-thumb]:w-10 [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-blue-500
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white" 
              />
            </div>
          </div>

          <div className="flex justify-between items-center px-2">
            <button 
              onClick={onShowSheet} 
              className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-black/60"
            >
              <span className="text-xl">📊</span>
            </button>

            {/* TOMBOL CAPTURE PUTIH BOLD (SOLID) */}
            <button 
              onClick={handleCaptureClick} 
              disabled={cameraLoading || !!cameraError || needsUserAction}
              className="group relative w-28 h-28 flex items-center justify-center active:scale-95 transition-all disabled:opacity-20"
            >
              {/* Ring Luar Putih Solid */}
              <div className="absolute inset-0 rounded-full border-[6px] border-white scale-110 group-active:scale-100 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
              
              {/* Lingkaran Dalam Putih Solid */}
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-all group-hover:scale-105 shadow-2xl ring-4 ring-black/5">
                {/* Visual Gap Circle */}
                <div className="w-16 h-16 rounded-full border border-black/5" />
              </div>
              
              {/* Efek Sentuh */}
              <div className="absolute w-8 h-8 bg-black/5 rounded-full opacity-0 group-active:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={handleSwitchCamera} 
              className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all hover:bg-black/60"
            >
              <span className="text-xl">🔄</span>
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1">
            {PLANT_TYPES.map(type => (
              <button 
                key={type} 
                onClick={() => onFormStateChange(prev => ({ ...prev, jenis: type }))}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all duration-300 ${
                  formState.jenis === type 
                  ? 'bg-white border-white text-slate-900 shadow-[0_10px_20px_rgba(255,255,255,0.2)] scale-105' 
                  : 'bg-black/30 border-white/10 text-white/40 backdrop-blur-md hover:bg-black/50'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
};
