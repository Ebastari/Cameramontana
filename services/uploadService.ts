
import { PlantEntry } from '../types';

export const uploadToAppsScript = async (url: string, entry: PlantEntry): Promise<Response> => {
  // Mengonversi titik ke koma untuk koordinat X dan Y sesuai format laporan di snippet
  const formatCoord = (num: number) => num.toString().replace('.', ',');

  // Teks path yang akan digunakan sebagai nama file di Drive dan referensi di Sheet
  const pathName = `Montana V2_Images/Gambar Montana (${entry.id}).jpg`;
  
  /**
   * Mengikuti logika snippet yang berhasil:
   * 1. 'Gambar' diisi dengan data base64 LENGKAP (termasuk header data:image/jpeg...)
   * 2. 'Gambar_Nama_File' diisi dengan path teks
   */
  const payload = {
    "ID": entry.id,
    "Tanggal": entry.tanggal,
    "Lokasi": entry.lokasi,
    "Pekerjaan": entry.pekerjaan || "",
    "Tinggi": entry.tinggi,
    "Koordinat": entry.koordinat,
    "Y": formatCoord(entry.y), // Longitude
    "X": formatCoord(entry.x), // Latitude
    "Tanaman": entry.tanaman,
    "Tahun Tanam": entry.tahunTanam,
    "Pengawas": entry.pengawas,
    "Vendor": entry.vendor,
    "Gambar": entry.foto, // MENGIRIM DATA BASE64 LENGKAP (seperti di snippet)
    "Gambar_Nama_File": pathName, // PATH UNTUK DRIVE
    "Description": entry.description || "",
    "Link Drive": entry.linkDrive || "",
    "Status_Duplikat": entry.statusDuplikat || "UNIK",
    "Status_Verifikasi": entry.statusVerifikasi || "",
    "No Pohon": entry.noPohon,
    "Base64": entry.foto.split(',')[1], // Cadangan data bersih jika dibutuhkan
    "RawBase64": entry.foto.split(',')[1] // Cadangan data bersih jika dibutuhkan
  };

  // Menggunakan konfigurasi fetch yang paling simpel (meniru snippet)
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors', // Sangat penting untuk Google Apps Script
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
};
