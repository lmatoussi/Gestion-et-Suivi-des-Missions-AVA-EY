# PowerShell script for setting up local development environment

Write-Host "=== Setting up EY Expense Manager Development Environment ===" -ForegroundColor Cyan

# Check prerequisites
$prereqs = @{
    "dotnet" = "dotnet --version"
    "npm" = "npm --version"
    "node" = "node --version"
    "docker" = "docker --version"
}

$allPrereqsMet = $true
foreach ($prereq in $prereqs.GetEnumerator()) {
    try {
        $result = Invoke-Expression $prereq.Value
        Write-Host "✓ $($prereq.Key) is installed: $result" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($prereq.Key) is not installed!" -ForegroundColor Red
        $allPrereqsMet = $false
    }
}

if (-not $allPrereqsMet) {
    Write-Host "Please install the missing prerequisites before continuing." -ForegroundColor Red
    exit 1
}

# Setup backend
Write-Host "`n=== Setting up Backend (.NET) ===" -ForegroundColor Cyan
Set-Location -Path ".\EYExpenseManager"

# Restore NuGet packages
Write-Host "Restoring NuGet packages..." -ForegroundColor Yellow
dotnet restore
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restore NuGet packages!" -ForegroundColor Red
    exit 1
}

# Install required packages for monitoring
Write-Host "Installing required packages for monitoring..." -ForegroundColor Yellow
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package Serilog.AspNetCore
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package Serilog.Sinks.Seq
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package prometheus-net.AspNetCore
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package AspNetCore.HealthChecks.SqlServer
dotnet add .\EYExpenseManager.API\EYExpenseManager.API.csproj package AspNetCore.HealthChecks.Redis

# Build the solution
Write-Host "Building the solution..." -ForegroundColor Yellow
dotnet build --configuration Debug
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Setup frontend
Write-Host "`n=== Setting up Frontend (Angular) ===" -ForegroundColor Cyan
Set-Location -Path "..\ey-expense-manager-ui"

# Install npm packages
Write-Host "Installing npm packages..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install npm packages!" -ForegroundColor Red
    exit 1
}

# Setup Docker environment
Write-Host "`n=== Setting up Docker Environment ===" -ForegroundColor Cyan
Set-Location -Path ".."

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Setup SQL Server container if not already running
$sqlContainer = docker ps -q -f name=sqlserver
if (-not $sqlContainer) {
    Write-Host "Setting up SQL Server container..." -ForegroundColor Yellow
    docker run -d --name sqlserver -p 11433:1433 `
        -e "ACCEPT_EULA=Y" `
        -e "SA_PASSWORD=YourStrong@Password123" `
        -e "MSSQL_PID=Developer" `
        mcr.microsoft.com/mssql/server:2022-latest
}

# Setup Redis container if not already running
$redisContainer = docker ps -q -f name=redis
if (-not $redisContainer) {
    Write-Host "Setting up Redis container..." -ForegroundColor Yellow
    docker run -d --name redis -p 6379:6379 redis:7-alpine
}

# Setup Seq for logging if not already running
$seqContainer = docker ps -q -f name=seq
if (-not $seqContainer) {
    Write-Host "Setting up Seq container for logging..." -ForegroundColor Yellow
    docker run -d --name seq -p 5341:80 `
        -e "ACCEPT_EULA=Y" `
        datalust/seq:latest
}

# Create appsettings.Development.json with local connection strings
$appSettingsPath = ".\EYExpenseManager\EYExpenseManager.API\appsettings.Development.json"
$appSettings = @{
    "ConnectionStrings" = @{
        "DefaultConnection" = "Server=localhost,11433;Database=EYExpenseDB;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=True;"
        "Redis" = "localhost:6379"
    }
    "Logging" = @{
        "LogLevel" = @{
            "Default" = "Information"
            "Microsoft.AspNetCore" = "Warning"
        }
    }
    "Serilog" = @{
        "MinimumLevel" = @{
            "Default" = "Information"
            "Override" = @{
                "Microsoft" = "Warning"
                "System" = "Warning"
            }
        }
        "WriteTo" = @(
            @{
                "Name" = "Console"
            },
            @{
                "Name" = "Seq"
                "Args" = @{
                    "serverUrl" = "http://localhost:5341"
                }
            }
        )
    }
    "AllowedHosts" = "*"
    "Authentication" = @{
        "JwtSecret" = "mY`$up3r`$3cur3!JWTk3y2025@#eyexpens3manager"
    }
}

Write-Host "Creating development appsettings.json..." -ForegroundColor Yellow
$appSettings | ConvertTo-Json -Depth 10 | Out-File -FilePath $appSettingsPath

# Create environment.development.ts with correct API URLs
$envPath = ".\ey-expense-manager-ui\src\environments\environment.development.ts"
$envContent = @"
export const environment = {
    production: false,
    apiBaseUrl: 'http://localhost:5000/api'
};
"@

Write-Host "Creating development environment settings for Angular..." -ForegroundColor Yellow
$envContent | Out-File -FilePath $envPath

Write-Host "`n=== Development Environment Setup Completed! ===" -ForegroundColor Green
Write-Host "You can now run the following commands to start the applications:" -ForegroundColor Yellow
Write-Host "Backend: cd EYExpenseManager && dotnet run --project .\EYExpenseManager.API\EYExpenseManager.API.csproj" -ForegroundColor White
Write-Host "Frontend: cd ey-expense-manager-ui && npm start" -ForegroundColor White
Write-Host "`nAdditional Resources:" -ForegroundColor Yellow
Write-Host "SQL Server: localhost,11433 (user: sa, password: YourStrong@Password123)" -ForegroundColor White
Write-Host "Redis: localhost:6379" -ForegroundColor White
Write-Host "Seq (logging): http://localhost:5341" -ForegroundColor White
