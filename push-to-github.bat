@echo off
REM Script to push project to GitHub and configure Jenkins
echo === EY Expense Manager GitHub Integration ===
echo This script will push your project to GitHub and configure Jenkins

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\push-to-github.ps1"

echo.
echo Press any key to exit...
pause > nul
