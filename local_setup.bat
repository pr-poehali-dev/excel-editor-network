@echo off
chcp 65001 >nul
echo ================================================
echo   Установка зависимостей...
echo ================================================
pip install flask flask-cors psycopg2-binary

echo.
echo ================================================
echo   Запуск локального сервера...
echo   Адрес: http://localhost:8000
echo   Для остановки нажмите Ctrl+C
echo ================================================
python local_server.py
pause
