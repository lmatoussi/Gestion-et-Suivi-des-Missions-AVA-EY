@echo off
echo ===== EY Expense Manager - Setup GitHub & Jenkins Integration =====
echo.
echo This script will guide you through the process of:
echo 1. Pushing your project to GitHub
echo 2. Configuring Jenkins to use your GitHub repository
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0setup-github-jenkins.ps1"

echo.
if %ERRORLEVEL% NEQ 0 (
    echo There was an error during the setup process.
    echo Please check the output above for details.
) else (
    echo Setup process completed successfully!
)

echo.
echo Press any key to exit...
pause > nul
