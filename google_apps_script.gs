
/**
 * GOOGLE APPS SCRIPT: MONITORING TANAMAN CERDAS (V2 COMPLETE)
 * Integrasi Otomatis Google Sheets + Google Drive
 */

const SHEET_NAME = "Data Monitoring";
const FOLDER_NAME = "Montana V2_Images";

/**
 * Fungsi GET: Mengambil data dari Sheet untuk ditampilkan di Dashboard Online
 * Dipanggil saat Anda membuka tab 'Dashboard' di aplikasi.
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Jika sheet belum ada, kembalikan array kosong
    if (!sheet) {
      return createJsonResponse([]);
    }
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return createJsonResponse([]); // Hanya ada header, belum ada data
    }
    
    const headers = rows[0];
    const data = [];
    
    // Iterasi baris data (mulai dari baris ke-2)
    for (let i = 1; i < rows.length; i++) {
      let record = {};
      for (let j = 0; j < headers.length; j++) {
        let key = headers[j];
        let value = rows[i][j];
        
        // Format tanggal agar seragam
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
        }
        
        record[key] = value;
      }
      data.push(record);
    }
    
    return createJsonResponse(data);
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Fungsi POST: Menerima kiriman data baru dari Kamera (Capture)
 * Mengonversi Base64 ke File Gambar di Drive dan mencatat data ke Sheet.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // 1. Setup Header jika Sheet Baru
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        "ID", "Tanggal", "Lokasi", "Pekerjaan", "Tinggi", "Koordinat", "Y", "X", 
        "Tanaman", "Tahun Tanam", "Pengawas", "Vendor", "Link Drive", "No Pohon", "Kesehatan"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
    
    // 2. Kelola Folder Google Drive
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    
    // 3. Simpan Gambar ke Drive
    let fileUrl = "";
    const rawBase64 = data.RawBase64 || (data.Gambar ? data.Gambar.split(',')[1] : null);
    
    if (rawBase64) {
      const fileName = `Montana_${data.ID || new Date().getTime()}.jpg`;
      const blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), "image/jpeg", fileName);
      const file = folder.createFile(blob);
      
      // Set agar file bisa dilihat oleh siapa saja yang memiliki link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    // 4. Catat ke Spreadsheet
    const rowData = [
      data.ID,
      data.Tanggal || new Date().toLocaleString(),
      data.Lokasi,
      data.Pekerjaan,
      data.Tinggi,
      data.Koordinat,
      data.Y,
      data.X,
      data.Tanaman,
      data["Tahun Tanam"] || data.tahunTanam,
      data.Pengawas,
      data.Vendor,
      fileUrl,
      data["No Pohon"] || data.noPohon,
      data.Kesehatan || "Sehat"
    ];
    
    sheet.appendRow(rowData);
    
    return createJsonResponse({ status: "success", message: "Data tersimpan", url: fileUrl });
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Helper: Membuat respons JSON yang benar untuk Web App
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
