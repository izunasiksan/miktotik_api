#!/bin/bash
# API MIKROTIK: COMPREHENSIVE MANUAL BACKUP SCRIPT (DB, BACKEND, FRONTEND)
# Versi: 1.1
# Lokasi: backend/scripts/manual_backup_all.sh

# 1. Konfigurasi
TIMESTAMP=$(date +%Y%m%d_%H%M)
ROOT_DIR=$(pwd)
BACKUP_ROOT="${ROOT_DIR}/backups/${TIMESTAMP}"
DB_NAME="db_master_mikrotik"

# Direktori Output
DB_BACKUP_DIR="${BACKUP_ROOT}/database"
BACKEND_BACKUP_DIR="${BACKUP_ROOT}/backend"
FRONTEND_BACKUP_DIR="${BACKUP_ROOT}/frontend"

# 2. Persiapan Direktori
mkdir -p "${DB_BACKUP_DIR}" "${BACKEND_BACKUP_DIR}" "${FRONTEND_BACKUP_DIR}"

echo "=========================================================="
echo "🚀 MEMULAI BACKUP MENYELURUH (COMPREHENSIVE BACKUP)"
echo "Waktu: ${TIMESTAMP}"
echo "Lokasi: ${BACKUP_ROOT}"
echo "=========================================================="

# 3. BACKUP DATABASE (PostgreSQL via Docker)
echo "📦 [1/3] Memproses Backup Database..."
docker-compose exec -t db pg_dump -U postgres ${DB_NAME} > "${DB_BACKUP_DIR}/db_dump_${TIMESTAMP}.sql"
if [ $? -eq 0 ]; then
    echo "✅ Database berhasil di-export."
    sha256sum "${DB_BACKUP_DIR}/db_dump_${TIMESTAMP}.sql" > "${DB_BACKUP_DIR}/db_dump_${TIMESTAMP}.sql.sha256"
else
    echo "❌ GAGAL memproses backup database!"
    exit 1
fi

# 4. BACKUP BACKEND (Source Code & Config)
echo "📦 [2/3] Memproses Backup Backend (Source & Config)..."
# Menyalin .env dan folder app (kecuali __pycache__ dan venv)
cp "${ROOT_DIR}/backend/.env" "${BACKEND_BACKUP_DIR}/.env.backup"
tar -czf "${BACKEND_BACKUP_DIR}/backend_src_${TIMESTAMP}.tar.gz" \
    -C "${ROOT_DIR}/backend" --exclude="__pycache__" --exclude=".venv" .
echo "✅ Backend source dan config berhasil diamankan."

# 5. BACKUP FRONTEND (Source Code & Config)
echo "📦 [3/3] Memproses Backup Frontend (Source & Config)..."
cp "${ROOT_DIR}/frontend/.env" "${FRONTEND_BACKUP_DIR}/.env.backup" 2>/dev/null || echo "⚠️  Frontend .env tidak ditemukan, dilewati."
tar -czf "${FRONTEND_BACKUP_DIR}/frontend_src_${TIMESTAMP}.tar.gz" \
    -C "${ROOT_DIR}/frontend" --exclude="node_modules" --exclude="dist" .
echo "✅ Frontend source dan config berhasil diamankan."

# 6. FINALISASI & INTEGRITY CHECK
echo "=========================================================="
echo "🏁 PROSES BACKUP SELESAI"
echo "=========================================================="
echo "Hasil Backup:"
ls -R "${BACKUP_ROOT}"
echo "=========================================================="
echo "PENTING: Segera pindahkan direktori ${BACKUP_ROOT} ke media luar!"
