@echo off
REM Script to configure Jenkins with AdminFiras account
echo === EY Expense Manager Jenkins Configuration ===
echo This script will configure Jenkins with the AdminFiras account

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\configure-jenkins-with-adminfiras.ps1"

echo.
echo Press any key to exit...
pause > nul
