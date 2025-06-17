# AIOps-Powered IP Investigation & Threat Detection System

**Final Project - Security Operations Center (SOC)**  
**Kelompok 5 - Institut Teknologi Sepuluh Nopember**
**Kelas Security Operations Center A**
**Tahun Akademik 2025**

| Nama                | NRP        |
| ------------------- | ---------- |
| Hazwan Adhikara     | 5027231017 |
| Rafael Gunawan      | 5027231019 |
| Tio Axellino        | 5027231065 |
| Nisrina Atiqah Dwiputri Ridzki | 5027231075 |
| Rafika Azzahra Kusumastuti         | 5027231050 |

---

## Arsitektur & Teknologi
Arsitektur proyek ini terbagi menjadi tiga komponen utama yang saling terhubung:
### 1. Backend (Server-Side Logic)
Framework: Node.js dengan Express.js <br>
Database: MongoDB (dengan Mongoose sebagai ODM) untuk menyimpan data IP, aktivitas terdeteksi, dan hasil analisis AI. <br>

### 2. Frontend (User Interface)
Framework: Vue  <br>

### 3. AI & Log Integration
- AI Generatif: Google Gemini (model gemini-2.0-flash) digunakan sebagai otak di balik analisis ancaman. Prompt yang dirancang khusus dikirimkan ke Gemini, berisi kumpulan log aktivitas, untuk mendapatkan analisis terstruktur dalam format JSON.
- Log Forwarder: Sebuah skrip Bash (log_forwarder.sh) yang ditempatkan di server target (misalnya, Droplet DigitalOcean). Skrip ini bertindak sebagai agen yang:
- Memantau file log sistem secara real-time (/var/log/auth.log, journalctl).
- Mengenali pola log yang mencurigakan (misalnya, Failed password, UFW BLOCK).
- Mengklasifikasikan aktivitas tersebut dan mengirimkannya ke endpoint ingest di backend.
- API Eksternal: ip-api.com digunakan untuk pengayaan data geolokasi (negara, kota, ISP) berdasarkan alamat IP.

## Fitur
- Deteksi Brute-Force SSH: Menganalisis log otentikasi untuk mendeteksi upaya login gagal yang berulang dari satu atau beberapa sumber.
- Deteksi Port Scanning: Menganalisis log firewall (UFW BLOCK) untuk mengidentifikasi upaya pemindaian port dari alamat IP tertentu.
- Deteksi Web Enumeration & RCE (Dasar): Mampu memantau log akses web server (jika ada) untuk mendeteksi upaya mengakses file sensitif atau menjalankan perintah berbahaya.
- Analisis Risiko Berbasis AI: Menggunakan Gemini untuk memberikan skor risiko (0-100), level risiko (Low, Medium, High, Critical), ringkasan ancaman, temuan spesifik, dan rekomendasi mitigasi yang konkret.
- Manajemen Monitoring: Kemampuan untuk memulai dan menghentikan pemantauan pada IP target melalui antarmuka pengguna.
- Visualisasi Data: Dashboard interaktif untuk melihat gambaran keamanan secara keseluruhan, termasuk distribusi geografis dan tingkat risiko.
- Sistem Anti-Bottleneck: Implementasi debouncing pada backend untuk menangani lonjakan data log tanpa membuat server crash atau tidak responsif.

## Cara Menjalankan
### Terminal A: Jalankan Backend
`npm run dev`

### Terminal B: Jalankan Frontend
`npm run dev`

### Terminal C: Jalankan ngrok
`Perintah: ngrok http 3000`

### Terminal D: Konfigurasi & Jalankan Log Forwarder
Hentikan proses lama jika ada: <br>
`pkill -f log_forwarder.sh` <br> <br>
Jalankan skrip di latar belakang: <br>
`nohup ./log_forwarder.sh > log_forwarder.out 2>&1 &`
