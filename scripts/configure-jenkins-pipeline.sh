#!/bin/bash
# This script sets up Jenkins pipeline and job for your application

echo "=== Setting up Jenkins Pipeline for EY Expense Manager ==="

# Directory for Jenkins CLI jar file
mkdir -p /tmp/jenkins-cli
cd /tmp/jenkins-cli

# Download Jenkins CLI
echo "Downloading Jenkins CLI..."
JENKINS_URL="http://localhost:8080"
curl -s -o jenkins-cli.jar $JENKINS_URL/jnlpJars/jenkins-cli.jar

# Retrieve Jenkins admin credentials
# In a real scenario, this would be stored securely
JENKINS_ADMIN_USER="admin"
# Replace with actual password
JENKINS_ADMIN_PASS=$(cat /var/jenkins_home/secrets/initialAdminPassword)

# Function to run Jenkins CLI commands
jenkins_cli() {
  java -jar jenkins-cli.jar -s $JENKINS_URL -auth $JENKINS_ADMIN_USER:$JENKINS_ADMIN_PASS "$@"
}

# Install required plugins
echo "Installing required Jenkins plugins..."
PLUGINS=(
  "git"
  "workflow-aggregator"
  "pipeline-stage-view"
  "blueocean"
  "sonar"
  "docker-workflow"
  "dotnet-sdk"
  "nodejs"
)

for plugin in "${PLUGINS[@]}"; do
  echo "Installing $plugin plugin..."
  jenkins_cli install-plugin $plugin -deploy
done

# Restart Jenkins after plugin installation
echo "Restarting Jenkins..."
jenkins_cli safe-restart
echo "Waiting for Jenkins to restart..."
sleep 60

# Create credentials for SonarQube
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

# Create the pipeline job
echo "Creating EY Expense Manager pipeline job..."
cat > eyexpensemanager-pipeline.xml << EOF
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@2.42">
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
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps@2.92">
    <scm class="hudson.plugins.git.GitSCM" plugin="git@4.8.0">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>https://github.com/yourusername/devops-Projet-Gestion-Missions.git</url>
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
jenkins_cli create-job EYExpenseManager-Pipeline < eyexpensemanager-pipeline.xml

# Configure SonarQube integration
echo "Configuring SonarQube integration..."
cat > sonarqube-config.xml << EOF
<?xml version='1.1' encoding='UTF-8'?>
<hudson.plugins.sonar.SonarGlobalConfiguration plugin="sonar@2.14">
  <installations>
    <hudson.plugins.sonar.SonarInstallation>
      <name>SonarQube</name>
      <serverUrl>http://sonarqube:9000</serverUrl>
      <credentialsId>sonarqube-token</credentialsId>
      <webhookSecretId></webhookSecretId>
      <mojoVersion></mojoVersion>
      <additionalProperties></additionalProperties>
      <additionalAnalysisProperties></additionalAnalysisProperties>
      <triggers>
        <skipScmCause>false</skipScmCause>
        <skipUpstreamCause>false</skipUpstreamCause>
        <envVar></envVar>
      </triggers>
    </hudson.plugins.sonar.SonarInstallation>
  </installations>
  <buildWrapperEnabled>false</buildWrapperEnabled>
  <dataMigrated>true</dataMigrated>
  <credentialsMigrated>true</credentialsMigrated>
</hudson.plugins.sonar.SonarGlobalConfiguration>
EOF
jenkins_cli groovy = < update-sonarqube.groovy

# Create Groovy script to update SonarQube config
cat > update-sonarqube.groovy << 'EOF'
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

# Run the job
echo "Triggering initial pipeline run..."
jenkins_cli build EYExpenseManager-Pipeline -s

echo "=== Jenkins Pipeline setup complete ==="
echo "Access Jenkins at: $JENKINS_URL"
