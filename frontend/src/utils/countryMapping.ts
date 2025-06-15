// Objek pemetaan dari nama negara (seperti yang didapat dari API Anda) ke kode negara ISO 3166-1 alpha-2
// Tambahkan lebih banyak sesuai kebutuhan data Anda
const countryMapping: { [key: string]: string } = {
  "United States": "US",
  "China": "CN",
  "Russia": "RU",
  "Germany": "DE",
  "United Kingdom": "GB",
  "Canada": "CA",
  "France": "FR",
  "Japan": "JP",
  "Brazil": "BR",
  "India": "IN",
  "Netherlands": "NL",
  "Australia": "AU",
  // Tambahkan negara lain yang sering muncul di sini...
  "Unknown": "XX", // Kode 'XX' digunakan untuk entitas tidak dikenal atau bendera placeholder
};

export default countryMapping;