@echo off
echo ===== Starting EY Expense Manager DevOps Toolchain =====

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    exit /b 1
)

REM Navigate to the docker directory
cd vagrant\docker

REM Build and start the DevOps services
echo Starting DevOps environment services...
docker-compose -f devops-compose.yml up -d

echo.
echo ===== DevOps Environment Started Successfully! =====
echo.
echo The following services are now available:
echo.
echo Jenkins: http://localhost:8080
echo SonarQube: http://localhost:9000 (admin/admin)
echo Grafana: http://localhost:3000 (admin/admin123)
echo Prometheus: http://localhost:9090
echo Seq: http://localhost:5341
echo Portainer: https://localhost:9443
echo.
echo To stop the services, run: docker-compose -f devops-compose.yml down
echo To view logs, run: docker-compose -f devops-compose.yml logs -f
echo.

REM Check if the fix-devops-setup.sh script needs to be run
if not exist %~dp0\vagrant\docker\fix-devops-setup.sh (
    echo Creating fix-devops-setup.sh script...
    echo #!/bin/bash > %~dp0\vagrant\docker\fix-devops-setup.sh
    echo # Fix script for DevOps environment >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo # Jenkins setup >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo echo "Waiting for Jenkins to start..." >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo sleep 30 >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo docker exec jenkins jenkins-plugin-cli --plugins docker-workflow git sonar bitbucket blueocean pipeline-stage-view ws-cleanup dotnet-sdk nodejs >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo # SonarQube setup >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo echo "Setting up SonarQube..." >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo sleep 10 >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo # More setup commands could be added here >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo >> %~dp0\vagrant\docker\fix-devops-setup.sh
    echo echo "DevOps environment is ready!" >> %~dp0\vagrant\docker\fix-devops-setup.sh
    
    echo Created fix-devops-setup.sh script. You can customize it further for your needs.
)

echo.
echo Do you want to run the fix-devops-setup.sh script? (y/n)
set /p runfix=

if "%runfix%"=="y" (
    echo Running fix-devops-setup.sh script...
    docker exec -it jenkins bash -c "bash /var/jenkins_home/fix-devops-setup.sh"
)

echo.
echo ===== Starting logs (Ctrl+C to exit logs) =====
docker-compose -f devops-compose.yml logs -f
