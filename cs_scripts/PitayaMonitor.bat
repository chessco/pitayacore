@echo off
setlocal
cd /d "%~dp0"
start "" pythonw.exe monitor_app.py
exit
