# UPDATE 2.4 - Dashboard Operasional E2E Best Practice (Shell Script)

show_menu() {
    clear
    echo "=========================================================="
    echo "  MIKROTIK API v2.4 - OPERATIONAL DASHBOARD"
    echo "=========================================================="
    echo " 1. Jalankan Backend (FastAPI - E2E Practice)"
    echo " 2. Jalankan Frontend (Vite/React - E2E Practice)"
    echo " 3. Jalankan Docker Redis + Celery (Sidecar Services)"
    echo " 4. Keluar"
    echo "=========================================================="
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

while true; do
    show_menu
    read -p "Pilih opsi (1-4): " choice
    
    case $choice in
        1)
            echo "[INFO] Menjalankan Backend v2.4..."
            VENV_PATH="$SCRIPT_DIR/.venv"
            if [ -f "$VENV_PATH/Scripts/activate" ]; then
                source "$VENV_PATH/Scripts/activate"
            elif [ -f "$VENV_PATH/bin/activate" ]; then
                source "$VENV_PATH/bin/activate"
            fi
            cd "$SCRIPT_DIR/docs/analisis_data_v2.4/e2e_best_practice/src"
            python3 -m app.main || python -m app.main
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        2)
            echo "[INFO] Menjalankan Frontend v2.4..."
            cd "$SCRIPT_DIR/docs/analisis_data_v2.4/e2e_best_practice/src/frontend"
            npm run dev
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        3)
            echo "[INFO] Menjalankan Docker Redis + Celery Services..."
            cd "$SCRIPT_DIR/docs/analisis_data_v2.4/e2e_best_practice"
            docker-compose up -d
            echo "[SUCCESS] Redis & Celery containers berjalan di latar belakang."
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        4)
            echo "Keluar..."
            exit 0
            ;;
        *)
            echo "[ERROR] Pilihan tidak valid."
            sleep 1
            ;;
    esac
done
