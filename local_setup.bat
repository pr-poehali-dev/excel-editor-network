@echo off
cd /d "%~dp0"
pip install flask flask-cors psycopg2-binary
python local_server.py
pause
