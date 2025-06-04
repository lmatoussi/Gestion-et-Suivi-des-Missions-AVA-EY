#!/bin/bash
# This script helps set up a Jenkins pipeline for your .NET and Angular project

# Install necessary Jenkins plugins
# Run this from Jenkins Script Console or use Jenkins CLI

JENKINS_URL="http://localhost:8080"
JENKINS_USER="admin"
# Replace with your actual Jenkins admin password
JENKINS_PASSWORD="YOUR_JENKINS_PASSWORD"

# List of required plugins
PLUGINS=(
  "git"
  "dotnet-sdk"
  "nodejs"
  "docker-plugin"
  "docker-workflow"
  "docker-build-step"
  "pipeline"
  "pipeline-stage-view"
  "blueocean"
  "sonar"
  "jacoco"
  "slack"
  "email-ext"
  "junit"
  "msbuild"
)

# Install each plugin
for plugin in "${PLUGINS[@]}"; do
  echo "Installing plugin: $plugin"
  # To be run using Jenkins CLI or through Jenkins Script Console
  # Example using curl (replace with actual implementation):
  # curl -X POST -u "$JENKINS_USER:$JENKINS_PASSWORD" "$JENKINS_URL/pluginManager/install?plugin.$plugin=true"
done

# Create the pipeline job
# This should be run with Jenkins CLI or through Jenkins API
cat <<EOF
Instructions to create a pipeline job in Jenkins:

1. Log in to Jenkins at $JENKINS_URL
2. Click "New Item" on the dashboard
3. Enter "EYExpenseManager-Pipeline" as the item name
4. Select "Pipeline" as the job type and click OK
5. In the configuration page:
   - Under "Pipeline":
     - Definition: Select "Pipeline script from SCM"
     - SCM: Select "Git"
     - Repository URL: Enter your Git repository URL
     - Branch Specifier: */main (or */master, as appropriate)
     - Script Path: Jenkinsfile
6. Click Save

You'll also need to configure these credentials in Jenkins:
1. SonarQube token (for SonarQube integration)
2. Docker registry credentials (if using a private registry)
3. Git repository credentials

Make sure Jenkins has the following tools installed:
1. .NET 8 SDK
2. Node.js 18+ and NPM
3. Docker
4. SonarQube Scanner for .NET and JavaScript
EOF
