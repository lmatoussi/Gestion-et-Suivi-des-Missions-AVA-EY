# GitHub & Jenkins Integration Guide

This guide explains how to set up the integration between GitHub and Jenkins for the EY Expense Manager project.

## Prerequisites

- A GitHub account
- Access to the GitHub repository: https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
- Jenkins server running at http://localhost:8080
- Administrative access to Jenkins (AdminFiras account)

## Quick Start

For the easiest setup experience, run:

```
setup-github-jenkins.bat
```

This interactive script will guide you through:
1. Pushing your project to GitHub
2. Configuring Jenkins to use your GitHub repository

## Manual Setup

If you prefer to run the steps separately:

### 1. Push to GitHub

This will push your project to the GitHub repository.

```powershell
# PowerShell
.\scripts\push-to-github.ps1

# Or using the batch file
.\push-to-github.bat
```

### 2. Configure Jenkins

This will configure Jenkins to use the GitHub repository and set up SonarQube integration.

```powershell
# PowerShell
.\scripts\configure-jenkins-with-adminfiras.ps1

# Or using the batch file
.\configure-jenkins.bat
```

## What These Scripts Do

### GitHub Push Script

- Initializes Git repository if needed
- Configures Git user information
- Sets up .gitignore file
- Adds the GitHub remote repository
- Stages all files for commit
- Commits with your message
- Pushes to GitHub

### Jenkins Configuration Script

- Installs necessary Jenkins plugins
- Creates SonarQube credentials
- Configures SonarQube integration
- Sets up the pipeline job using your GitHub repository
- Configures tools for .NET and Node.js
- Triggers an initial build

## Troubleshooting

### GitHub Push Issues

- **Authentication Failures**: Make sure your GitHub credentials are correct.
- **Permission Denied**: Ensure you have write access to the repository.
- **Network Issues**: Check your internet connection.

### Jenkins Configuration Issues

- **Connection Refused**: Verify Jenkins is running at http://localhost:8080.
- **Authentication Failures**: Make sure the AdminFiras credentials are correct.
- **Plugin Installation Failures**: Check Jenkins has internet access.

## SonarQube Integration

For detailed information on SonarQube integration, see:
`docs/sonarqube-github-integration.md`

## Further Information

For more details about the DevOps workflow, refer to:
`docs/devops-workflow-guide.md`
