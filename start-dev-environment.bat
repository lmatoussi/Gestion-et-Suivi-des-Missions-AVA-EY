@echo off
echo ===== Starting EY Expense Manager DevOps Environment =====

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    exit /b 1
)

REM Build and start the services
echo Starting development environment services...

REM Build and start the development services
docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml up -d --build

echo.
echo ===== Environment Started Successfully! =====
echo.
echo The following services are now available:
echo.
echo API: http://localhost:5000
echo Angular UI: http://localhost:4200
echo SQL Server: localhost,11433
echo Redis: localhost:6379
echo Seq (logging): http://localhost:5341
echo.
echo To stop the services, run: docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml down
echo To view logs, run: docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml logs -f
echo.
echo ===== Starting logs (Ctrl+C to exit logs) =====
docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml logs -f
