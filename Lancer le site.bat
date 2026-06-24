@echo off
chcp 65001 >nul
title Site Timeo Renard - Serveur
cd /d "%~dp0"

echo.
echo   ============================================
echo     Site Timeo Renard - demarrage du serveur
echo   ============================================
echo.

REM Verifie que Node est installe
where node >nul 2>nul
if errorlevel 1 (
  echo   [ERREUR] Node.js n'est pas installe ou introuvable.
  echo   Installe-le depuis https://nodejs.org puis relance ce fichier.
  echo.
  pause
  exit /b 1
)

REM Ouvre le navigateur sur le site (apres un court delai)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4399"

echo   Serveur en cours... Le site va s'ouvrir dans ton navigateur.
echo   Adresse : http://localhost:4399
echo.
echo   >>> LAISSE CETTE FENETRE OUVERTE tant que tu utilises le site. <<<
echo   Ferme-la pour arreter le serveur.
echo.

node server.js

echo.
echo   Le serveur s'est arrete.
pause
