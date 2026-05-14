@echo off
setlocal enabledelayedexpansion

REM ==========================================================
REM   MIKROTIK API v2.4 - BACKEND SHORTCUT (STRICT DEBUG)
REM ==========================================================

echo [DEBUG] Script started.
echo [DEBUG] Current Directory: %CD%
echo [DEBUG] Script Directory: %~dp0

REM Gunakan path absolut untuk netstat dan taskkill untuk menghindari error "command not found"
set "NETSTAT=C:\Windows\System32\netstat.exe"
set "TASKKILL=C:\Windows\System32\taskkill.exe"
set "FINDSTR=C:\Windows\System32\findstr.exe"

echo [INFO] Memeriksa proses pada port 8000...
if exist "!NETSTAT!" (
    for /f "tokens=5" %%a in ('!NETSTAT! -aon ^| !FINDSTR! :8000 ^| !FINDSTR! LISTENING 2^>nul') do (
        echo [INFO] Mematikan proses lama (PID: %%a)...
        if exist "!TASKKILL!" (
            !TASKKILL! /F /PID %%a >nul 2>&1
        )
    )
) else (
    echo [WARNING] netstat.exe tidak ditemukan di path sistem. Melewati pembersihan port.
)

set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
set "SRC_DIR=%~dp0e2e_best_practice\src"

echo [DEBUG] Checking PYTHON_EXE: "!PYTHON_EXE!"
if not exist "!PYTHON_EXE!" (
    echo [ERROR] Virtual Environment tidak ditemukan di: "!PYTHON_EXE!"
    echo [TIPS] Pastikan folder .venv ada di direktori root dan berisi Scripts\python.exe.
    echo [TIPS] Coba jalankan: python -m venv .venv
    pause
    exit /b 1
)

echo [DEBUG] Checking SRC_DIR: "!SRC_DIR!"
if not exist "!SRC_DIR!" (
    echo [ERROR] Direktori sumber tidak ditemukan: "!SRC_DIR!"
    pause
    exit /b 1
)

echo [INFO] Menjalankan Backend (app.main)...
echo [INFO] PYTHONPATH: !SRC_DIR!
cd /d "!SRC_DIR!"
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Gagal berpindah ke direktori: "!SRC_DIR!"
    pause
    exit /b 1
)

set "PYTHONPATH=!SRC_DIR!"

echo [DEBUG] Executing: "!PYTHON_EXE!" -m app.main
"!PYTHON_EXE!" -m app.main

echo.
echo [INFO] Backend process has exited.
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Backend berhenti dengan error code !ERRORLEVEL!
) else (
    echo [SUCCESS] Backend stopped gracefully.
)

echo Menekan tombol apapun akan menutup jendela ini.
pause
