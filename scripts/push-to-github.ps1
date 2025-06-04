# PowerShell script to push project to GitHub and configure Jenkins
$GitHubRepo = "https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git"
$JenkinsUrl = "http://localhost:8080"

Write-Host "=== Pushing EY Expense Manager to GitHub ===" -ForegroundColor Cyan
Write-Host "Repository: $GitHubRepo"

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
Write-Host "This may prompt for your GitHub credentials."
Write-Host "Note: If you have two-factor authentication enabled, use a personal access token instead of your password."
Write-Host "Personal access tokens can be created at: https://github.com/settings/tokens"
git push -u origin master 2>$null
if ($LASTEXITCODE -ne 0) {
    git push -u origin main
}

Write-Host ""
Write-Host "=== GitHub push complete! ===" -ForegroundColor Green
Write-Host ""

Write-Host "=== Configuring Jenkins to use the GitHub repository ===" -ForegroundColor Cyan
Write-Host "Please access Jenkins at $JenkinsUrl and create/update your pipeline job with:"
Write-Host "- Repository URL: $GitHubRepo"
Write-Host "- Branch Specifier: */main (or */master)"
Write-Host "- Script Path: Jenkinsfile"
Write-Host ""

$updateJenkins = Read-Host "Do you want to automatically update the Jenkins pipeline configuration? (y/n)"

if ($updateJenkins -eq "y" -or $updateJenkins -eq "Y") {
    # Download Jenkins CLI if not already present
    if (-not (Test-Path "jenkins-cli.jar")) {
        Write-Host "Downloading Jenkins CLI..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "$JenkinsUrl/jnlpJars/jenkins-cli.jar" -OutFile "jenkins-cli.jar"
    }
    
    # Ask for Jenkins credentials
    $jenkinsUser = Read-Host "Please enter your Jenkins admin username (usually 'AdminFiras')"
    
    $securePassword = Read-Host "Please enter your Jenkins admin password" -AsSecureString
    $jenkinsPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    
    # Update Jenkins job configuration
    Write-Host "Updating Jenkins job configuration..." -ForegroundColor Yellow
    $jenkinsJobConfig = @"
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>EY Expense Manager CI/CD Pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.SCMTrigger>
          <spec>H/15 * * * *</spec>
          <ignorePostCommitHooks>false</ignorePostCommitHooks>
        </hudson.triggers.SCMTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition">
    <scm class="hudson.plugins.git.GitSCM">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>$GitHubRepo</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/main</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="empty-list"/>
      <extensions/>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
"@
    $jenkinsJobConfig | Out-File -FilePath "jenkins-job-update.xml" -Encoding utf8
    
    # Check if job exists already
    try {
        $webRequest = Invoke-WebRequest -Uri "$JenkinsUrl/job/EYExpenseManager-Pipeline/" -UseBasicParsing -Headers @{
            Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$jenkinsUser`:$jenkinsPass"))
        } -ErrorAction SilentlyContinue
        
        $jobExists = $true
    } catch {
        $jobExists = $false
    }
    
    if ($jobExists) {
        # Update existing job
        Write-Host "Updating existing Jenkins pipeline job..." -ForegroundColor Yellow
        java -jar jenkins-cli.jar -s $JenkinsUrl -auth "$jenkinsUser`:$jenkinsPass" update-job EYExpenseManager-Pipeline < jenkins-job-update.xml
    } else {
        # Create new job
        Write-Host "Creating new Jenkins pipeline job..." -ForegroundColor Yellow
        java -jar jenkins-cli.jar -s $JenkinsUrl -auth "$jenkinsUser`:$jenkinsPass" create-job EYExpenseManager-Pipeline < jenkins-job-update.xml
    }
    
    # Clean up
    Remove-Item -Path "jenkins-job-update.xml" -Force
    
    Write-Host "Jenkins pipeline job has been configured with the GitHub repository." -ForegroundColor Green
    Write-Host "Building the pipeline job..." -ForegroundColor Yellow
    java -jar jenkins-cli.jar -s $JenkinsUrl -auth "$jenkinsUser`:$jenkinsPass" build EYExpenseManager-Pipeline -s
}

Write-Host ""
Write-Host "=== Configuration complete! ===" -ForegroundColor Green
Write-Host "Your project is now on GitHub and Jenkins is configured to use it."
Write-Host "Access Jenkins at $JenkinsUrl to see your pipeline in action."
