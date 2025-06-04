#!/bin/bash
# This script configures Jenkins with the AdminFiras account and GitHub integration

JENKINS_URL="http://localhost:8080"
GITHUB_REPO="https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git"

echo "=== Configuring Jenkins with AdminFiras Account ==="
echo "This script will configure Jenkins for the EY Expense Manager project."

# Download Jenkins CLI if not present
if [ ! -f jenkins-cli.jar ]; then
    echo "Downloading Jenkins CLI..."
    curl -s -o jenkins-cli.jar $JENKINS_URL/jnlpJars/jenkins-cli.jar
fi

# Get AdminFiras credentials
echo "Please enter the AdminFiras password:"
read -s admin_password
echo ""

# Test connection
echo "Testing connection to Jenkins..."
java -jar jenkins-cli.jar -s $JENKINS_URL -auth AdminFiras:$admin_password who-am-i

if [ $? -ne 0 ]; then
    echo "Failed to authenticate with Jenkins. Please check your credentials."
    exit 1
fi

echo "Successfully authenticated with Jenkins."

# Install necessary plugins if not already installed
echo "Checking and installing required plugins..."
jenkins_cli() {
    java -jar jenkins-cli.jar -s $JENKINS_URL -auth AdminFiras:$admin_password "$@"
}

# Get list of installed plugins
installed_plugins=$(jenkins_cli list-plugins | cut -f 1 -d ' ')

# List of required plugins
plugins=(
    "git"
    "workflow-aggregator"
    "pipeline-stage-view"
    "blueocean"
    "sonar"
    "docker-workflow"
    "dotnet-sdk"
    "nodejs"
)

# Install missing plugins
for plugin in "${plugins[@]}"; do
    if ! echo "$installed_plugins" | grep -q "^$plugin$"; then
        echo "Installing plugin: $plugin"
        jenkins_cli install-plugin $plugin
        needs_restart=true
    fi
done

# Restart Jenkins if needed
if [ "$needs_restart" = true ]; then
    echo "Restarting Jenkins to apply plugin changes..."
    jenkins_cli safe-restart
    echo "Waiting for Jenkins to restart..."
    sleep 60
fi

# Create SonarQube credentials if they don't exist
echo "Checking SonarQube credentials..."
if ! jenkins_cli list-credentials system::system::jenkins | grep -q "sonarqube-token"; then
    echo "Creating SonarQube credentials..."
    cat > sonarqube-credentials.xml << EOF
<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>sonarqube-token</id>
  <description>SonarQube Authentication Token</description>
  <username>admin</username>
  <password>admin</password>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
EOF
    jenkins_cli create-credentials-by-xml "SystemCredentialsProvider::SystemContextResolver::jenkins" "global" < sonarqube-credentials.xml
    rm sonarqube-credentials.xml
fi

# Configure SonarQube integration
echo "Configuring SonarQube integration..."
cat > sonarqube-config.groovy << 'EOF'
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
EOF
jenkins_cli groovy = < sonarqube-config.groovy
rm sonarqube-config.groovy

# Configure pipeline job for GitHub
echo "Setting up Jenkins pipeline job for GitHub repository..."
cat > eyexpensemanager-pipeline.xml << EOF
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
          <url>${GITHUB_REPO}</url>
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
EOF

# Check if job exists
if jenkins_cli get-job EYExpenseManager-Pipeline > /dev/null 2>&1; then
    # Update existing job
    echo "Updating existing Jenkins pipeline job..."
    jenkins_cli update-job EYExpenseManager-Pipeline < eyexpensemanager-pipeline.xml
else
    # Create new job
    echo "Creating new Jenkins pipeline job..."
    jenkins_cli create-job EYExpenseManager-Pipeline < eyexpensemanager-pipeline.xml
fi
rm eyexpensemanager-pipeline.xml

# Configure tools in Jenkins
echo "Configuring Jenkins tools for .NET and Node.js..."
cat > configure-tools.groovy << 'EOF'
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
EOF
jenkins_cli groovy = < configure-tools.groovy
rm configure-tools.groovy

# Run a build
echo "Triggering a build to test the setup..."
jenkins_cli build EYExpenseManager-Pipeline -s || echo "Build triggered. Check Jenkins UI for progress."

echo ""
echo "=== Jenkins configuration completed! ==="
echo "Jenkins is now configured with the AdminFiras account and GitHub integration."
echo "Access Jenkins at $JENKINS_URL to monitor your build."
