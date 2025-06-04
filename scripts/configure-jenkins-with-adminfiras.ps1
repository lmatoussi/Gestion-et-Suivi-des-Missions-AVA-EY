# PowerShell script to configure Jenkins with AdminFiras account
$JenkinsUrl = "http://localhost:8080"
$GitHubRepo = "https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git"

Write-Host "=== Configuring Jenkins with AdminFiras Account ===" -ForegroundColor Cyan
Write-Host "This script will configure Jenkins for the EY Expense Manager project."

# Download Jenkins CLI if not present
if (-not (Test-Path "jenkins-cli.jar")) {
    Write-Host "Downloading Jenkins CLI..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "$JenkinsUrl/jnlpJars/jenkins-cli.jar" -OutFile "jenkins-cli.jar"
}

# Get AdminFiras credentials
$jenkinsUser = "AdminFiras"
$securePassword = Read-Host "Please enter the AdminFiras password" -AsSecureString
$adminPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

# Test connection
Write-Host "Testing connection to Jenkins..." -ForegroundColor Yellow
$output = java -jar jenkins-cli.jar -s $JenkinsUrl -auth "$jenkinsUser`:$adminPassword" who-am-i 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to authenticate with Jenkins. Please check your credentials." -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    exit 1
}

Write-Host "Successfully authenticated with Jenkins." -ForegroundColor Green

# Function to run Jenkins CLI commands
function Invoke-JenkinsCLI {
    param(
        [Parameter(Mandatory=$true)]
        [string] $Command,
        
        [Parameter(Mandatory=$false)]
        [string] $Input = $null
    )
    
    $cliArgs = "-jar jenkins-cli.jar -s $JenkinsUrl -auth $jenkinsUser`:$adminPassword $Command"
    
    if ($Input) {
        $Input | java $cliArgs
    } else {
        java $cliArgs
    }
}

# Install necessary plugins if not already installed
Write-Host "Checking and installing required plugins..." -ForegroundColor Yellow

# Get list of installed plugins
$installedPlugins = Invoke-JenkinsCLI "list-plugins" | ForEach-Object { $_ -split ' ' | Select-Object -First 1 }

# List of required plugins
$plugins = @(
    "git",
    "workflow-aggregator",
    "pipeline-stage-view",
    "blueocean",
    "sonar",
    "docker-workflow",
    "dotnet-sdk",
    "nodejs"
)

# Install missing plugins
$needsRestart = $false
foreach ($plugin in $plugins) {
    if ($installedPlugins -notcontains $plugin) {
        Write-Host "Installing plugin: $plugin" -ForegroundColor Yellow
        Invoke-JenkinsCLI "install-plugin $plugin"
        $needsRestart = $true
    }
}

# Restart Jenkins if needed
if ($needsRestart) {
    Write-Host "Restarting Jenkins to apply plugin changes..." -ForegroundColor Yellow
    Invoke-JenkinsCLI "safe-restart"
    Write-Host "Waiting for Jenkins to restart..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
}

# Create SonarQube credentials if they don't exist
Write-Host "Checking SonarQube credentials..." -ForegroundColor Yellow
$credentialsExist = Invoke-JenkinsCLI "list-credentials system::system::jenkins" | Select-String "sonarqube-token"
if (-not $credentialsExist) {
    Write-Host "Creating SonarQube credentials..." -ForegroundColor Yellow
    $sonarqubeCredentials = @"
<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>sonarqube-token</id>
  <description>SonarQube Authentication Token</description>
  <username>admin</username>
  <password>admin</password>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
"@
    $sonarqubeCredentials | Out-File -FilePath "sonarqube-credentials.xml" -Encoding utf8
    Invoke-JenkinsCLI "create-credentials-by-xml 'SystemCredentialsProvider::SystemContextResolver::jenkins' 'global'" -Input (Get-Content -Raw "sonarqube-credentials.xml")
    Remove-Item -Path "sonarqube-credentials.xml" -Force
}

# Configure SonarQube integration
Write-Host "Configuring SonarQube integration..." -ForegroundColor Yellow
$sonarqubeConfig = @'
import hudson.plugins.sonar.SonarGlobalConfiguration
import hudson.plugins.sonar.SonarInstallation
import jenkins.model.Jenkins

def sonarConfig = Jenkins.instance.getDescriptorByType(SonarGlobalConfiguration.class)
def sonarInstallation = new SonarInstallation(
  "SonarQube", 
  "http://sonarqube:9000", 
  "sonarqube-token", 
  "", 
  "", 
  "", 
  "", 
  false, 
  false, 
  ""
)
sonarConfig.setInstallations(sonarInstallation)
sonarConfig.save()
'@
$sonarqubeConfig | Out-File -FilePath "sonarqube-config.groovy" -Encoding utf8
Invoke-JenkinsCLI "groovy =" -Input (Get-Content -Raw "sonarqube-config.groovy")
Remove-Item -Path "sonarqube-config.groovy" -Force

# Configure pipeline job for GitHub
Write-Host "Setting up Jenkins pipeline job for GitHub repository..." -ForegroundColor Yellow
$pipelineConfig = @"
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
$pipelineConfig | Out-File -FilePath "eyexpensemanager-pipeline.xml" -Encoding utf8

# Check if job exists
try {
    $null = Invoke-JenkinsCLI "get-job EYExpenseManager-Pipeline" 2>$null
    # Update existing job
    Write-Host "Updating existing Jenkins pipeline job..." -ForegroundColor Yellow
    Invoke-JenkinsCLI "update-job EYExpenseManager-Pipeline" -Input (Get-Content -Raw "eyexpensemanager-pipeline.xml")
} catch {
    # Create new job
    Write-Host "Creating new Jenkins pipeline job..." -ForegroundColor Yellow
    Invoke-JenkinsCLI "create-job EYExpenseManager-Pipeline" -Input (Get-Content -Raw "eyexpensemanager-pipeline.xml")
}
Remove-Item -Path "eyexpensemanager-pipeline.xml" -Force

# Configure tools in Jenkins
Write-Host "Configuring Jenkins tools for .NET and Node.js..." -ForegroundColor Yellow
$toolsConfig = @'
import jenkins.model.Jenkins
import hudson.plugins.sonar.SonarRunnerInstallation
import hudson.plugins.sonar.SonarRunnerInstaller
import hudson.tools.InstallSourceProperty
import jenkins.plugins.nodejs.tools.NodeJSInstallation
import jenkins.plugins.nodejs.tools.NodeJSInstaller
import hudson.plugins.sonar.SonarRunnerInstallation
import hudson.plugins.sonar.SonarRunnerInstaller
import io.jenkins.plugins.dotnet.DotNetSDK
import io.jenkins.plugins.dotnet.DotNetSDKInstaller

def jenkins = Jenkins.instance

// Configure SonarQube Scanner
def sonarDesc = jenkins.getDescriptor("hudson.plugins.sonar.SonarRunnerInstallation")
def sonarInstaller = new SonarRunnerInstaller("4.8.0.2856")
def installSourceProperty = new InstallSourceProperty([sonarInstaller])
def sonarRunner = new SonarRunnerInstallation("SonarScanner", "", [installSourceProperty])
sonarDesc.setInstallations(sonarRunner)
sonarDesc.save()

// Configure NodeJS
def nodeJSDesc = jenkins.getDescriptor("jenkins.plugins.nodejs.tools.NodeJSInstallation")
if(nodeJSDesc) {
  def nodeJSInstaller = new NodeJSInstaller("18.18.0", "", 10)
  def nodeJSInstallation = new NodeJSInstallation("NodeJS", "", [new InstallSourceProperty([nodeJSInstaller])])
  nodeJSDesc.setInstallations(nodeJSInstallation)
  nodeJSDesc.save()
}

// Configure .NET SDK
try {
  def dotnetDesc = jenkins.getDescriptor(DotNetSDK.class)
  if(dotnetDesc) {
    def dotnetInstaller = new DotNetSDKInstaller("8.0.100")
    def dotnetInstallation = new DotNetSDK("DotNet8", "", [new InstallSourceProperty([dotnetInstaller])])
    dotnetDesc.setInstallations(dotnetInstallation)
    dotnetDesc.save()
  }
} catch(Exception e) {
  println "Couldn't configure .NET SDK: " + e.message
}

jenkins.save()
'@
$toolsConfig | Out-File -FilePath "configure-tools.groovy" -Encoding utf8
Invoke-JenkinsCLI "groovy =" -Input (Get-Content -Raw "configure-tools.groovy")
Remove-Item -Path "configure-tools.groovy" -Force

# Run a build
Write-Host "Triggering a build to test the setup..." -ForegroundColor Yellow
Invoke-JenkinsCLI "build EYExpenseManager-Pipeline -s" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build triggered. Check Jenkins UI for progress." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Jenkins configuration completed! ===" -ForegroundColor Green
Write-Host "Jenkins is now configured with the AdminFiras account and GitHub integration."
Write-Host "Access Jenkins at $JenkinsUrl to monitor your build."
