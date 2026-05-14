@echo off
setlocal enabledelayedexpansion

REM UPDATE 2.4.1 - DEBUG VERSION (FORCE PAUSE ON EVERY STEP)
:MENU
cls
echo ==========================================================
echo   MIKROTIK API v2.4 - OPERATIONAL DASHBOARD (DEBUG)
echo ==========================================================
echo  1. Jalankan Backend
echo  2. Jalankan Frontend
echo  3. Jalankan Docker Redis + Celery (DEBUG MODE)
echo  4. Keluar
echo ==========================================================
set /p choice="Pilih opsi (1-4): "

if "%choice%"=="3" (
    echo [DEBUG] Memulai Opsi 3...
    pause
    
    set "ROOT_DIR=%~dp0"
    echo [DEBUG] ROOT_DIR is: "!ROOT_DIR!"
    pause

    set "TARGET_DIR=!ROOT_DIR!e2e_best_practice"
    echo [DEBUG] Target Dir is: "!TARGET_DIR!"
    if not exist "!TARGET_DIR!" (
        echo [ERROR] Folder !TARGET_DIR! tidak ditemukan!
        pause
        goto MENU
    )
    pause

    echo [DEBUG] Masuk ke folder...
    cd /d "!TARGET_DIR!"
    echo [DEBUG] Current dir: %CD%
    pause

    echo [DEBUG] Memeriksa Docker...
    where docker
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Docker tidak ditemukan!
        pause
        goto MENU
    )
    pause

    echo [DEBUG] Menjalankan Docker Compose...
    docker-compose up -d
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Docker Compose gagal dengan code !ERRORLEVEL!
        echo [TIPS] Pastikan Docker Desktop sudah berjalan.
        pause
        goto MENU
    )
    
    echo [SUCCESS] Opsi 3 selesai dijalankan.
    timeout /t 5 >nul
    goto MENU
)

if "%choice%"=="1" (
    echo [INFO] Force Closing any existing Backend on port 8000...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
        echo [INFO] Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    
    echo [INFO] Menjalankan Backend (v2.4.1) in NEW WINDOW...
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
    if not exist "!PYTHON_EXE!" (
        echo [ERROR] Virtual Environment tidak ditemukan di %~dp0.venv!
        echo [TIPS] Pastikan folder .venv ada di direktori root.
        pause
        goto MENU
    )
    
    set "PYTHONPATH=%~dp0e2e_best_practice\src"
    start "MIKROTIK_BACKEND" cmd /k "cd /d "%~dp0e2e_best_practice\src" && set "PYTHONPATH=%~dp0e2e_best_practice\src" && "!PYTHON_EXE!" -m app.main || (echo [ERROR] Backend failed to start! && pause)"
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Gagal meluncurkan jendela Backend!
        pause
    ) else (
        echo [SUCCESS] Backend started in separate window.
        timeout /t 3 >nul
    )
    goto MENU
)

if "%choice%"=="2" (
    echo [INFO] Force Closing any existing Frontend on port 5173...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
        echo [INFO] Killing PID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )

    echo [INFO] Menjalankan Frontend in NEW WINDOW...
    set "FRONTEND_DIR=%~dp0e2e_best_practice\src\frontend"
    if not exist "!FRONTEND_DIR!" (
        echo [ERROR] Folder Frontend tidak ditemukan di !FRONTEND_DIR!
        pause
        goto MENU
    )

    if not exist "!FRONTEND_DIR!\node_modules" (
        echo [WARNING] node_modules tidak ditemukan. Menjalankan 'npm install'...
        cd /d "!FRONTEND_DIR!"
        call npm install
        if !ERRORLEVEL! neq 0 (
            echo [ERROR] 'npm install' gagal! Periksa koneksi internet atau instalasi NodeJS.
            pause
            goto MENU
        )
    )
    
    start "MIKROTIK_FRONTEND" cmd /k "cd /d "!FRONTEND_DIR!" && npm run dev || (echo [ERROR] Frontend failed to start! && pause)"
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Gagal meluncurkan jendela Frontend!
        pause
    ) else (
        echo [SUCCESS] Frontend started in separate window.
        timeout /t 3 >nul
    )
    goto MENU
)

if "%choice%"=="4" (
    exit /b 0
)

goto MENU
