# PowerShell script to set up GitHub and Jenkins integration
$ErrorActionPreference = "Stop"

# Define colors for output
$colorSuccess = "Green"
$colorInfo = "Cyan" 
$colorWarning = "Yellow"
$colorError = "Red"

# Function to display colored messages
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Output header
Write-ColorMessage "=======================================================" $colorInfo
Write-ColorMessage "   EY Expense Manager - GitHub & Jenkins Integration   " $colorInfo
Write-ColorMessage "=======================================================" $colorInfo
Write-ColorMessage ""

# Check if we're running from the project root
$currentDir = Get-Location
$scriptsDir = Join-Path $currentDir "scripts"
if (-not (Test-Path $scriptsDir)) {
    Write-ColorMessage "ERROR: This script must be run from the project root directory!" $colorError
    Write-ColorMessage "Current directory: $currentDir" $colorError
    Write-ColorMessage "Please navigate to the 'devops-Projet-Gestion-Missions' directory and try again." $colorError
    exit 1
}

# Menu function
function Show-Menu {
    Write-ColorMessage "Please select an action:" $colorInfo
    Write-ColorMessage "1. Push project to GitHub repository"
    Write-ColorMessage "2. Configure Jenkins with GitHub integration"
    Write-ColorMessage "3. Complete setup (push to GitHub AND configure Jenkins)"
    Write-ColorMessage "Q. Quit"
    Write-ColorMessage ""
    $choice = Read-Host "Enter your choice (1-3, or Q)"
    return $choice
}

# Function to push to GitHub
function Push-ToGitHub {
    Write-ColorMessage "Starting GitHub push process..." $colorInfo
    
    # Check if the script exists
    $pushScript = Join-Path $scriptsDir "push-to-github.ps1"
    if (-not (Test-Path $pushScript)) {
        Write-ColorMessage "ERROR: GitHub push script not found at: $pushScript" $colorError
        return $false
    }
    
    # Execute the script
    try {
        & $pushScript
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "GitHub push completed successfully!" $colorSuccess
            return $true
        } else {
            Write-ColorMessage "GitHub push encountered an error. Exit code: $LASTEXITCODE" $colorError
            return $false
        }
    } catch {
        Write-ColorMessage "Error executing GitHub push script: $_" $colorError
        return $false
    }
}

# Function to configure Jenkins
function Configure-Jenkins {
    Write-ColorMessage "Starting Jenkins configuration process..." $colorInfo
    
    # Check if the script exists
    $jenkinsScript = Join-Path $scriptsDir "configure-jenkins-with-adminfiras.ps1"
    if (-not (Test-Path $jenkinsScript)) {
        Write-ColorMessage "ERROR: Jenkins configuration script not found at: $jenkinsScript" $colorError
        return $false
    }
    
    # Execute the script
    try {
        & $jenkinsScript
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "Jenkins configuration completed successfully!" $colorSuccess
            return $true
        } else {
            Write-ColorMessage "Jenkins configuration encountered an error. Exit code: $LASTEXITCODE" $colorError
            return $false
        }
    } catch {
        Write-ColorMessage "Error executing Jenkins configuration script: $_" $colorError
        return $false
    }
}

# Main program
$quit = $false
while (-not $quit) {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" {
            Push-ToGitHub
            Write-ColorMessage "Press any key to continue..." $colorInfo
            $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "2" {
            Configure-Jenkins
            Write-ColorMessage "Press any key to continue..." $colorInfo
            $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "3" {
            $gitHubSuccess = Push-ToGitHub
            if ($gitHubSuccess) {
                Write-ColorMessage "GitHub push successful, proceeding to Jenkins configuration..." $colorSuccess
                Configure-Jenkins
            }
            Write-ColorMessage "Press any key to continue..." $colorInfo
            $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        "Q" { $quit = $true }
        "q" { $quit = $true }
        default {
            Write-ColorMessage "Invalid choice. Please select 1-3 or Q." $colorWarning
            Write-ColorMessage "Press any key to continue..." $colorInfo
            $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    }
    
    if (-not $quit) {
        Clear-Host
    }
}

Write-ColorMessage "Setup completed. Thank you!" $colorSuccess
