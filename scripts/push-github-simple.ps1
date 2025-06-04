# Simple PowerShell script to push project to GitHub
$GitHubRepo = "https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git"

Write-Host "=== Pushing EY Expense Manager to GitHub ===" -ForegroundColor Cyan
Write-Host "Repository: $GitHubRepo"
Write-Host ""

# Confirm sanitization to prevent accidental push of sensitive data
Write-Host "IMPORTANT: Before continuing, please confirm that you have:" -ForegroundColor Yellow
Write-Host "1. Sanitized all configuration files (removed passwords, API keys, secrets)" -ForegroundColor Yellow
Write-Host "2. Created .env.example file (with placeholders instead of real values)" -ForegroundColor Yellow
Write-Host "3. Updated .gitignore to exclude sensitive files like .env" -ForegroundColor Yellow
$confirmation = Read-Host "Have you completed these steps? (y/n)"
if ($confirmation -ne "y") {
    Write-Host "Process cancelled. Please sanitize your files before pushing to GitHub." -ForegroundColor Red
    exit
}

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
}

# Configure Git (if needed)
$gitUsername = git config --get user.name
if ([string]::IsNullOrEmpty($gitUsername)) {
    $gitUsername = Read-Host "Please enter your Git username"
    git config user.name $gitUsername
}

$gitEmail = git config --get user.email
if ([string]::IsNullOrEmpty($gitEmail)) {
    $gitEmail = Read-Host "Please enter your Git email"
    git config user.email $gitEmail
}

# Setup .gitignore if it doesn't exist properly
if (-not (Test-Path ".gitignore")) {
    Write-Host "Creating .gitignore file..." -ForegroundColor Yellow
    @'
# .NET Core
bin/
obj/
*.user
*.dll
*.pdb
*.cache
*.suo

# Angular
node_modules/
dist/
.angular/
.vscode/
npm-debug.log
yarn-error.log

# Environment files
.env
.env.local
appsettings.Development.json
appsettings.Production.json

# IDE
.idea/
.vs/
*.sln.DotSettings.user

# Docker
.docker/

# Vagrant
.vagrant/

# Credentials and tokens
**/credentials.xml
**/secrets/
**/initialAdminPassword
*token*

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# System Files
.DS_Store
Thumbs.db

# Build results
[Dd]ebug/
[Dd]ebugPublic/
[Rr]elease/
[Rr]eleases/

# Coverage results
coverage/
*.coverage
*.coveragexml
'@ | Out-File -FilePath ".gitignore" -Encoding utf8
}

# Add remote repository if it doesn't exist
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin $GitHubRepo
} else {
    # Update remote URL if needed
    $currentRemote = git remote get-url origin
    if ($currentRemote -ne $GitHubRepo) {
        Write-Host "Updating GitHub remote URL..." -ForegroundColor Yellow
        git remote set-url origin $GitHubRepo
    }
}

# Stage all files
Write-Host "Staging files..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Yellow
$commitMessage = Read-Host "Please enter a commit message (e.g., 'Initial commit of EY Expense Manager')"
git commit -m $commitMessage

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "This may prompt for your GitHub credentials." -ForegroundColor Yellow
Write-Host "Note: If you have two-factor authentication enabled, use a personal access token instead of your password." -ForegroundColor Yellow
Write-Host "Personal access tokens can be created at: https://github.com/settings/tokens" -ForegroundColor Yellow

# Try pushing to main branch, then master if that fails
Write-Host "Attempting to push to main branch..." -ForegroundColor Yellow
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Main branch push failed, trying master branch..." -ForegroundColor Yellow
    git push -u origin master
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Failed to push to GitHub. Please check the error messages above." -ForegroundColor Red
}

Write-Host ""
Write-Host "=== GitHub push complete! ===" -ForegroundColor Green
