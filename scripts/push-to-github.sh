#!/bin/bash
# This script helps push the project to GitHub and configure Jenkins to use the repository

GITHUB_REPO="https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git"
JENKINS_URL="http://localhost:8080"

echo "=== Pushing EY Expense Manager to GitHub ==="
echo "Repository: $GITHUB_REPO"

# Check if git is initialized
if [ ! -d .git ]; then
    echo "Initializing Git repository..."
    git init
fi

# Configure Git (if needed)
if [ -z "$(git config --get user.name)" ]; then
    echo "Please enter your Git username:"
    read git_username
    git config user.name "$git_username"
fi

if [ -z "$(git config --get user.email)" ]; then
    echo "Please enter your Git email:"
    read git_email
    git config user.email "$git_email"
fi

# Setup .gitignore if it doesn't exist properly
if [ ! -f .gitignore ]; then
    echo "Creating .gitignore file..."
    cat > .gitignore << 'EOF'
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
EOF
fi

# Add remote repository if it doesn't exist
if ! git remote | grep -q origin; then
    echo "Adding GitHub remote..."
    git remote add origin $GITHUB_REPO
else
    # Update remote URL if needed
    current_remote=$(git remote get-url origin)
    if [ "$current_remote" != "$GITHUB_REPO" ]; then
        echo "Updating GitHub remote URL..."
        git remote set-url origin $GITHUB_REPO
    fi
fi

# Stage all files
echo "Staging files..."
git add .

# Commit changes
echo "Committing changes..."
echo "Please enter a commit message (e.g., 'Initial commit of EY Expense Manager'):"
read commit_message
git commit -m "$commit_message"

# Push to GitHub
echo "Pushing to GitHub..."
echo "This may prompt for your GitHub credentials."
echo "Note: If you have two-factor authentication enabled, use a personal access token instead of your password."
echo "Personal access tokens can be created at: https://github.com/settings/tokens"
git push -u origin master || git push -u origin main

echo ""
echo "=== GitHub push complete! ==="
echo ""

echo "=== Configuring Jenkins to use the GitHub repository ==="
echo "Please access Jenkins at $JENKINS_URL and create/update your pipeline job with:"
echo "- Repository URL: $GITHUB_REPO"
echo "- Branch Specifier: */main (or */master)"
echo "- Script Path: Jenkinsfile"
echo ""
echo "Do you want to automatically update the Jenkins pipeline configuration? (y/n)"
read update_jenkins

if [ "$update_jenkins" = "y" ] || [ "$update_jenkins" = "Y" ]; then
    # Download Jenkins CLI if not already present
    if [ ! -f jenkins-cli.jar ]; then
        echo "Downloading Jenkins CLI..."
        curl -s -o jenkins-cli.jar $JENKINS_URL/jnlpJars/jenkins-cli.jar
    fi
    
    # Ask for Jenkins credentials
    echo "Please enter your Jenkins admin username (usually 'AdminFiras'):"
    read jenkins_user
    
    echo "Please enter your Jenkins admin password:"
    read -s jenkins_pass
    
    # Update Jenkins job configuration
    echo "Updating Jenkins job configuration..."
    cat > jenkins-job-update.xml << EOF
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
    
    # Check if job exists already
    job_exists=$(curl -s -w "%{http_code}" -o /dev/null -u "$jenkins_user:$jenkins_pass" --head "$JENKINS_URL/job/EYExpenseManager-Pipeline/")
    
    if [ "$job_exists" == "200" ]; then
        # Update existing job
        echo "Updating existing Jenkins pipeline job..."
        java -jar jenkins-cli.jar -s $JENKINS_URL -auth $jenkins_user:$jenkins_pass update-job EYExpenseManager-Pipeline < jenkins-job-update.xml
    else
        # Create new job
        echo "Creating new Jenkins pipeline job..."
        java -jar jenkins-cli.jar -s $JENKINS_URL -auth $jenkins_user:$jenkins_pass create-job EYExpenseManager-Pipeline < jenkins-job-update.xml
    fi
    
    # Clean up
    rm jenkins-job-update.xml
    
    echo "Jenkins pipeline job has been configured with the GitHub repository."
    echo "Building the pipeline job..."
    java -jar jenkins-cli.jar -s $JENKINS_URL -auth $jenkins_user:$jenkins_pass build EYExpenseManager-Pipeline -s
fi

echo ""
echo "=== Configuration complete! ==="
echo "Your project is now on GitHub and Jenkins is configured to use it."
echo "Access Jenkins at $JENKINS_URL to see your pipeline in action."
