@echo off
echo ===== EY Expense Manager - GitHub Push =====
echo.
echo This script will push your project to GitHub.
echo Repository: https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
echo.
echo Press any key to continue or CTRL+C to cancel...
pause > nul

echo.
cd %~dp0
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\push-github-simple.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo GitHub push completed successfully!
) else (
    echo.
    echo There was an error pushing to GitHub.
    echo Please check the output above for details.
)

echo.
echo After pushing to GitHub, you can configure Jenkins manually:
echo 1. Go to Jenkins at http://localhost:8080
echo 2. Log in with your AdminFiras account
echo 3. Create or update a job with your GitHub repository URL:
echo    https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
echo.
echo Press any key to exit...
pause > nul
