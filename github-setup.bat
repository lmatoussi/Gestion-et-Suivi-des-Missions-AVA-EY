@echo off
echo ===== EY Expense Manager - GitHub Setup =====
echo.
echo This script will help you push your project to GitHub and configure Jenkins.
echo.
echo 1. First, we'll push your project to GitHub
echo 2. Then we'll configure Jenkins to use your GitHub repository
echo.
echo Press any key to continue or CTRL+C to cancel...
pause > nul

echo.
echo Starting GitHub push process...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\push-to-github.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo There was an error pushing to GitHub.
    echo Please check the output above for details.
    goto :end
)

echo.
echo GitHub push completed successfully!
echo.
echo Do you want to configure Jenkins now? (Y/N)
set /p configure_jenkins=

if /i "%configure_jenkins%"=="Y" (
    echo.
    echo Starting Jenkins configuration process...
    powershell -ExecutionPolicy Bypass -File "%~dp0scripts\configure-jenkins-with-adminfiras.ps1"
    
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo There was an error configuring Jenkins.
        echo Please check the output above for details.
        goto :end
    )
    
    echo.
    echo Jenkins configuration completed successfully!
)

:end
echo.
echo Press any key to exit...
pause > nul
