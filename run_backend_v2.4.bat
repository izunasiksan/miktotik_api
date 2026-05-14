@echo off
setlocal enabledelayedexpansion

REM UPDATE 2.4 - Dashboard Operasional E2E Best Practice
:MENU
cls
echo ==========================================================
echo   MIKROTIK API v2.4 - OPERATIONAL DASHBOARD
echo ==========================================================
echo  1. Jalankan Backend (FastAPI - E2E Practice)
echo  2. Jalankan Frontend (Vite/React - E2E Practice)
echo  3. Jalankan Docker Redis + Celery (Sidecar Services)
echo  4. Keluar
echo ==========================================================
set /p choice="Pilih opsi (1-4): "

set CURRENT_DIR=%~dp0

if "%choice%"=="1" (
    echo [INFO] Menjalankan Backend v2.4...
    set VENV_PATH=%CURRENT_DIR%.venv
    if exist "!VENV_PATH!\Scripts\activate.bat" (
        call "!VENV_PATH!\Scripts\activate.bat"
    )
    cd /d "%CURRENT_DIR%docs\analisis_data_v2.4\e2e_best_practice\src"
    python -m app.main
    pause
    goto MENU
)

if "%choice%"=="2" (
    echo [INFO] Menjalankan Frontend v2.4...
    cd /d "%CURRENT_DIR%docs\analisis_data_v2.4\e2e_best_practice\src\frontend"
    npm run dev
    pause
    goto MENU
)

if "%choice%"=="3" (
    echo [INFO] Menjalankan Docker Redis + Celery Services...
    cd /d "%CURRENT_DIR%docs\analisis_data_v2.4\e2e_best_practice"
    docker-compose up -d
    echo [SUCCESS] Redis & Celery containers berjalan di latar belakang.
    pause
    goto MENU
)

if "%choice%"=="4" (
    exit /b 0
)

echo [ERROR] Pilihan tidak valid.
pause
goto MENU
