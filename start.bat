@echo off
title SimuLink - Demarrage
color 0A

echo ========================================
echo     SIMULINK - DEMARRAGE
echo ========================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe !
    echo Telechargez-le sur : https://www.python.org/downloads/
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe !
    echo Telechargez-le sur : https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python et Node.js detectes
echo.

echo Installation des dependances Python...
cd backend
pip install -q flask flask-cors flask-socketio fpdf
cd ..
echo [OK] Dependances Python installees
echo.

if not exist "node_modules" (
    echo Installation des dependances Node.js...
    npm install
    echo [OK] Dependances Node installees
) else (
    echo [OK] Dependances Node deja installees
)
echo.

echo Demarrage du backend Python...
start "SimuLink Backend" cmd /k "cd /d %~dp0backend && python server.py"
timeout /t 3 /nobreak >nul
echo [OK] Backend demarre sur http://localhost:5000
echo.

echo Demarrage de l'application web...
echo Ouverture automatique dans le navigateur...
echo.
npx expo start --clear --web

echo.
echo Arret du backend...
taskkill /FI "WINDOWTITLE eq SimuLink Backend*" /F >nul 2>&1
echo SimuLink arrete.
pause
