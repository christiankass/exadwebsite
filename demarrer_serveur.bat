@echo off
title EXAD - Serveur Local
echo ==========================================
echo    EXAD - Serveur Web Local
echo ==========================================
echo.
echo Le site est accessible sur :
echo    http://127.0.0.1:8001
echo.
echo Pour arreter le serveur, fermez cette fenetre.
echo.
cd /d d:\exadsite
python -m http.server 8001
pause
