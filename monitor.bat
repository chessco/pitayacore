@echo off
setlocal
cd /d "%~dp0\cs_scripts"
start "" pythonw.exe monitor_app.py
exit
