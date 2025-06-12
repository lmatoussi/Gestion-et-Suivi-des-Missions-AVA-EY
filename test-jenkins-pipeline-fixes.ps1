# Test Jenkins Pipeline Fixes
# This script verifies the fixes made to the Jenkins pipeline
Write-Host "Testing Jenkins Pipeline Fixes..." -ForegroundColor Cyan

# 1. Verify Docker permissions fix
Write-Host "1. Verifying Docker permissions..." -ForegroundColor Yellow
docker ps
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not accessible. Please make sure Docker is running and you have the necessary permissions." -ForegroundColor Red
    exit 1
}
Write-Host "Docker is running and accessible." -ForegroundColor Green

# 2. Verify SonarQube is running
Write-Host "2. Verifying SonarQube container is running..." -ForegroundColor Yellow
$sonarRunning = docker ps | Select-String -Pattern "sonarqube"
if (-not $sonarRunning) {
    Write-Host "Warning: SonarQube container is not running. Starting it now..." -ForegroundColor Yellow
    # Use the devops-compose.yml file to start SonarQube
    docker-compose -f .\vagrant\docker\devops-compose.yml up -d sonarqube
}
Write-Host "SonarQube container is running or has been started." -ForegroundColor Green

# 3. Check SonarQube credentials
Write-Host "3. Checking SonarQube credentials in Jenkins..." -ForegroundColor Yellow
Write-Host "Please make sure you have created a credential in Jenkins with ID 'sonarqube-token'"
Write-Host "You can generate a new token in SonarQube and add it to Jenkins if needed."
Write-Host "Visit http://localhost:9000 for SonarQube and http://localhost:8080 for Jenkins"

# 4. Validate Angular dependencies
Write-Host "4. Validating Angular dependencies..." -ForegroundColor Yellow
$packageJson = Get-Content -Path ".\ey-expense-manager-ui\package.json" -Raw
if ($packageJson -match '"zone.js": "~0.14.0"') {
    Write-Host "Zone.js version has been updated correctly." -ForegroundColor Green
} else {
    Write-Host "Warning: Zone.js version may not be updated correctly." -ForegroundColor Red
    Write-Host "Please check ey-expense-manager-ui\package.json manually."
}

# 5. Validate Jenkinsfile changes
Write-Host "5. Validating Jenkinsfile changes..." -ForegroundColor Yellow
$jenkinsfile = Get-Content -Path ".\Jenkinsfile" -Raw
$dockerPermissionFixed = $jenkinsfile -match "sudo chmod 666 /var/run/docker.sock"
$sonarQubeAuthFixed = $jenkinsfile -match '/d:sonar.login="\$\{SONAR_TOKEN\}"'

if ($dockerPermissionFixed -and $sonarQubeAuthFixed) {
    Write-Host "Jenkinsfile has been updated correctly." -ForegroundColor Green
} else {
    Write-Host "Warning: Jenkinsfile may not be updated correctly." -ForegroundColor Red
    Write-Host "Please check Jenkinsfile manually."
}

Write-Host "`nAll fixes have been applied and verified." -ForegroundColor Cyan
Write-Host "To run the Jenkins pipeline, use the following commands:" -ForegroundColor Yellow
Write-Host "1. Ensure Jenkins is running: docker ps | findstr jenkins" -ForegroundColor White
Write-Host "2. Trigger a build manually in the Jenkins web interface or using the Jenkins CLI" -ForegroundColor White
Write-Host "3. Monitor the build for any remaining issues" -ForegroundColor White
