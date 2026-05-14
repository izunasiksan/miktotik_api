#!/bin/bash
# API MIKROTIK: MANUAL BACKUP SCRIPT
# Versi: 1.0
# Lokasi: backend/scripts/backup_db.sh

# 1. Konfigurasi
TIMESTAMP=$(date +%Y%m%d_%H%M)
BACKUP_DIR="./backups"
DB_NAME="db_master_mikrotik"
ENV_FILE=".env"
OUTPUT_FILE="backup_${DB_NAME}_${TIMESTAMP}.sql"
ARCHIVE_FILE="backup_full_${TIMESTAMP}.zip"

# 2. Buat direktori backup jika belum ada
mkdir -p ${BACKUP_DIR}

echo "--- Memulai Backup Manual: ${TIMESTAMP} ---"

# 3. Backup Database (via Docker Compose)
echo "[1/4] Melakukan export database dari container 'db'..."
docker-compose exec -t db pg_dump -U postgres ${DB_NAME} > ${BACKUP_DIR}/${OUTPUT_FILE}

if [ $? -eq 0 ]; then
    echo "SUCCESS: Database exported to ${BACKUP_DIR}/${OUTPUT_FILE}"
else
    echo "ERROR: Gagal melakukan export database!"
    exit 1
fi

# 4. Backup .env
echo "[2/4] Menyalin konfigurasi .env..."
cp ${ENV_FILE} ${BACKUP_DIR}/.env_backup_${TIMESTAMP}

# 5. Verifikasi & Integrity (SHA256)
echo "[3/4] Melakukan verifikasi integritas file..."
cd ${BACKUP_DIR}
sha256sum ${OUTPUT_FILE} > ${OUTPUT_FILE}.sha256
cd ..

# 6. Archive & Encryption
# Pastikan zip terinstal: sudo apt install zip
echo "[4/4] Mengarsipkan file backup..."
# Ganti 'yourpassword' dengan password yang aman saat dijalankan manual
# zip -e -P yourpassword ${BACKUP_DIR}/${ARCHIVE_FILE} ${BACKUP_DIR}/${OUTPUT_FILE} ${BACKUP_DIR}/.env_backup_${TIMESTAMP}

echo "--- Backup Selesai ---"
echo "Lokasi: ${BACKUP_DIR}/${OUTPUT_FILE}"
echo "PENTING: Segera pindahkan file backup ke media penyimpanan luar (Offsite Storage)!"
