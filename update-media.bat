@echo off
rem Double-click me after adding photos/videos/shorts to any project folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-media.ps1"
pause
