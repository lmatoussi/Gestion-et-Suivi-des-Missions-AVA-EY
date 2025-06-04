# Clean repository for GitHub push
$ErrorActionPreference = "Stop"

Write-Host "=== Cleaning Repository for GitHub Push ===" -ForegroundColor Cyan

# Clean binary files and output directories that might contain sensitive data
Write-Host "Removing bin and obj directories..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include bin,obj -Recurse -Directory | Remove-Item -Recurse -Force

# Replace placeholders in sensitive files
Write-Host "Sanitizing configuration files..." -ForegroundColor Yellow

# Function to sanitize a JSON file
function Sanitize-JsonFile {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        try {
            $json = Get-Content -Path $FilePath -Raw | ConvertFrom-Json
            
            # Check and sanitize ConnectionStrings
            if ($json.PSObject.Properties.Name -contains "ConnectionStrings") {
                foreach ($prop in $json.ConnectionStrings.PSObject.Properties.Name) {
                    if ($json.ConnectionStrings.$prop -match "Password=([^;]+)") {
                        $json.ConnectionStrings.$prop = $json.ConnectionStrings.$prop -replace "Password=([^;]+)", "Password=PLACEHOLDER_PASSWORD"
                    }
                }
            }
            
            # Check and sanitize Authentication
            if ($json.PSObject.Properties.Name -contains "Authentication") {
                if ($json.Authentication.PSObject.Properties.Name -contains "JwtSecret") {
                    $json.Authentication.JwtSecret = "PLACEHOLDER_JWT_SECRET_KEY"
                }
                if ($json.Authentication.PSObject.Properties.Name -contains "GoogleClientId") {
                    $json.Authentication.GoogleClientId = "PLACEHOLDER_GOOGLE_CLIENT_ID"
                }
                if ($json.Authentication.PSObject.Properties.Name -contains "GoogleClientSecret") {
                    $json.Authentication.GoogleClientSecret = "PLACEHOLDER_GOOGLE_CLIENT_SECRET"
                }
            }
            
            # Check and sanitize EmailSettings
            if ($json.PSObject.Properties.Name -contains "EmailSettings") {
                if ($json.EmailSettings.PSObject.Properties.Name -contains "SmtpPassword") {
                    $json.EmailSettings.SmtpPassword = "PLACEHOLDER_SMTP_PASSWORD"
                }
                if ($json.EmailSettings.PSObject.Properties.Name -contains "SenderEmail") {
                    $json.EmailSettings.SenderEmail = "example@example.com"
                }
                if ($json.EmailSettings.PSObject.Properties.Name -contains "SmtpUsername") {
                    $json.EmailSettings.SmtpUsername = "example@example.com"
                }
            }
            
            # Check for apiKey in Serilog or other sections
            if ($json.PSObject.Properties.Name -contains "Serilog") {
                $writeTo = $json.Serilog.WriteTo
                for ($i=0; $i -lt $writeTo.Length; $i++) {
                    if ($writeTo[$i].PSObject.Properties.Name -contains "Args") {
                        if ($writeTo[$i].Args.PSObject.Properties.Name -contains "apiKey") {
                            $writeTo[$i].Args.apiKey = "PLACEHOLDER_API_KEY"
                        }
                    }
                }
            }
            
            # Write the sanitized JSON back
            $json | ConvertTo-Json -Depth 10 | Set-Content -Path $FilePath
            Write-Host "  Sanitized: $FilePath" -ForegroundColor Green
        }        catch {
            $errorMsg = $_.Exception.Message
            Write-Host "  Failed to sanitize $FilePath`: $errorMsg" -ForegroundColor Red
        }
    }
}

# Find all appsettings files in the repo
Get-ChildItem -Path . -Include appsettings*.json -Recurse | ForEach-Object {
    Sanitize-JsonFile -FilePath $_.FullName
}

# Also check docker-compose files for environment variables
Write-Host "Sanitizing Docker Compose files..." -ForegroundColor Yellow

# Function to sanitize Docker Compose files
function Sanitize-DockerComposeFile {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content -Path $FilePath -Raw
        
        # Replace connection strings with environment variables
        $content = $content -replace 'ConnectionStrings__DefaultConnection=Server=.*?Password=.*?;', 'ConnectionStrings__DefaultConnection=Server=sqlserver;Database=EYExpenseDB;User Id=sa;Password=${DB_PASSWORD};TrustServerCertificate=True;'
        
        # Replace SA_PASSWORD with environment variable
        $content = $content -replace 'SA_PASSWORD=.*?(\s|$)', 'SA_PASSWORD=${DB_PASSWORD}$1'
        
        # Set the sanitized content back
        Set-Content -Path $FilePath -Value $content
        Write-Host "  Sanitized: $FilePath" -ForegroundColor Green
    }
}

# Find all docker-compose files
Get-ChildItem -Path . -Include docker-compose*.yml -Recurse | ForEach-Object {
    Sanitize-DockerComposeFile -FilePath $_.FullName
}

Write-Host "All sensitive files have been sanitized." -ForegroundColor Green
Write-Host "Ready to push to GitHub!" -ForegroundColor Cyan
