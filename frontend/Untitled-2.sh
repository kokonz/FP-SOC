#!/bin/bash

# ####################################################################
# ###                    KONFIGURASI WAJIB                         ###
# ####################################################################
#
# GANTI URL DI BAWAH INI DENGAN URL NGROK ANDA.
# PASTIKAN DIAKHIRI DENGAN /api/logs/ingest
#
API_ENDPOINT="https://f6fc-103-94-190-18.ngrok-free.app/api/logs/ingest"
#
# ####################################################################


# Dapatkan IP publik server ini secara otomatis
MONITORED_IP=$(curl -s ifconfig.me)

# Cek apakah IP berhasil didapatkan
if [ -z "$MONITORED_IP" ]; then
    echo "Error: Tidak bisa mendapatkan IP publik. Keluar."
    exit 1
fi

# Menentukan file log yang benar (berbeda untuk OS yang berbeda)
LOG_FILE="/var/log/auth.log" # Untuk Debian/Ubuntu (paling umum di DO)
if [ ! -f "$LOG_FILE" ]; then
    LOG_FILE="/var/log/secure" # Untuk CentOS/RHEL
fi

if [ ! -f "$LOG_FILE" ]; then
    echo "Error: File log tidak ditemukan di /var/log/auth.log atau /var/log/secure. Keluar."
    exit 1
fi

echo "========================================="
echo " AIOps Log Forwarder Dijalankan"
echo "========================================="
echo "Monitoring IP      : $MONITORED_IP"
echo "Monitoring File    : $LOG_FILE"
echo "Mengirim ke        : $API_ENDPOINT"
echo "========================================="
echo "Mengawasi log baru..."

# Perintah utama: Mengikuti file log dan memproses baris baru
tail -n 0 -F "$LOG_FILE" | while read -r line; do
    PAYLOAD=""

    # Cek jika baris log mengandung "Failed password"
    if echo "$line" | grep -q "Failed password"; then
        # Ekstrak alamat IP penyerang
        SOURCE_IP=$(echo "$line" | grep -oE 'from ([0-9]{1,3}\.){3}[0-9]{1,3}' | awk '{print $2}')
        if [ -n "$SOURCE_IP" ]; then
            # Membuat payload JSON
            PAYLOAD=$(printf '{"monitoredIP": "%s", "sourceIP": "%s", "logLine": "%s"}' \
                            "$MONITORED_IP" \
                            "$SOURCE_IP" \
                            "$(echo "$line" | sed 's/"/\\"/g')") # Meng-escape kutip ganda
        fi
    fi

    # Jika payload berhasil dibuat, kirim ke backend
    if [ -n "$PAYLOAD" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Mendeteksi Gagal Login dari $SOURCE_IP. Mengirim..."
        curl -s -o /dev/null -w "Status HTTP: %{http_code}\n" -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$API_ENDPOINT"
    fi
done