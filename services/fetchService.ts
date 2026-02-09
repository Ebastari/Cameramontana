
export const fetchCloudData = async (url: string): Promise<any[]> => {
  // Jangan mencoba melakukan fetch jika URL masih berupa placeholder atau kosong
  if (!url || url === "" || url.includes('/s/.../exec')) {
    console.warn("URL Apps Script belum diatur atau masih menggunakan placeholder.");
    return [];
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Validasi apakah result adalah array. Google Apps Script doGet kami mengembalikan array.
    // Jika result bukan array (misal: pesan error JSON dari script), kembalikan array kosong.
    if (Array.isArray(result)) {
      return result;
    } else {
      console.error("Data dari cloud bukan berbentuk array:", result);
      // Jika Apps Script mengembalikan object error {status: 'error', message: '...'}
      if (result && result.status === 'error') {
        throw new Error(result.message || "Script mengembalikan error");
      }
      return [];
    }
  } catch (error) {
    console.error("Fetch Cloud Data Error:", error);
    throw error;
  }
};
