# SonarQube Integration with GitHub Guide

This guide provides step-by-step instructions for connecting your GitHub repository with SonarQube for continuous code quality analysis.

## Prerequisites

- SonarQube is running at http://localhost:9000
- GitHub repository is set up at https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
- Jenkins is properly configured with SonarQube

## Step 1: Generate a SonarQube Token

1. Log in to SonarQube at http://localhost:9000 with the admin account
   - Default credentials: admin/admin

2. Go to **User** > **My Account** > **Security**

3. Enter a token name (e.g., `github-integration`) and click **Generate**

4. **IMPORTANT**: Save the generated token somewhere safe, as you won't be able to see it again

## Step 2: Configure SonarQube Projects

### Backend Project (.NET)

1. In SonarQube, go to **Administration** > **Projects** > **Create Project**

2. Select **Manual** setup

3. Enter the project details:
   - Project key: `EYExpenseManager`
   - Display name: `EY Expense Manager Backend`

4. Click **Set Up**

5. Under **Analysis Method**, select **With Jenkins**

### Frontend Project (Angular)

1. In SonarQube, go to **Administration** > **Projects** > **Create Project**

2. Select **Manual** setup

3. Enter the project details:
   - Project key: `EYExpenseManagerUI`
   - Display name: `EY Expense Manager UI`

4. Click **Set Up**

5. Under **Analysis Method**, select **With Jenkins**

## Step 3: Add SonarQube Token to Jenkins

1. Log in to Jenkins at http://localhost:8080

2. Go to **Manage Jenkins** > **Manage Credentials** > **Jenkins** > **Global credentials** > **Add Credentials**

3. Set up the credentials:
   - Kind: **Secret text**
   - Scope: **Global**
   - Secret: *paste your SonarQube token*
   - ID: `sonarqube-token`
   - Description: `SonarQube Authentication Token`

4. Click **OK**

## Step 4: Configure Jenkins SonarQube Plugin

1. In Jenkins, go to **Manage Jenkins** > **Configure System**

2. Scroll down to the **SonarQube servers** section

3. Check **Enable injection of SonarQube server configuration as build environment variables**

4. Click **Add SonarQube** and configure:
   - Name: `SonarQube`
   - Server URL: `http://sonarqube:9000`
   - Server authentication token: Select `sonarqube-token` from the dropdown

5. Click **Save**

## Step 5: Add SonarScanner Tools in Jenkins

1. Go to **Manage Jenkins** > **Global Tool Configuration**

2. Find **SonarQube Scanner** and click **Add SonarQube Scanner**

3. Configure:
   - Name: `SonarScanner`
   - Check **Install automatically** 
   - Select the latest version

4. Click **Save**

## Step 6: Verify Jenkinsfile SonarQube Configuration

The existing Jenkinsfile should already have the necessary SonarQube configuration:

```groovy
// For Backend
stage('Backend - Sonar Analysis') {
    steps {
        dir('EYExpenseManager') {
            withSonarQubeEnv('SonarQube') {
                sh 'dotnet sonarscanner begin /k:"EYExpenseManager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_AUTH_TOKEN}"'
                sh 'dotnet build --no-incremental'
                sh 'dotnet sonarscanner end /d:sonar.login="${SONAR_AUTH_TOKEN}"'
            }
        }
    }
}

// For Frontend
stage('Frontend - Sonar Analysis') {
    steps {
        dir('ey-expense-manager-ui') {
            withSonarQubeEnv('SonarQube') {
                sh 'sonar-scanner -Dsonar.projectKey=EYExpenseManagerUI -Dsonar.sources=src'
            }
        }
    }
}
```

## Step 7: Run a Pipeline Build

1. Go to the Jenkins dashboard

2. Click on **EYExpenseManager-Pipeline**

3. Click **Build Now**

4. Wait for the pipeline to complete

5. Go to SonarQube and verify that the projects appear with analysis results

## Troubleshooting

### SonarQube Analysis Failing

1. **Check Jenkins logs**:
   ```bash
   docker logs jenkins
   ```

2. **Verify SonarQube is running**:
   ```bash
   docker ps | grep sonarqube
   docker logs sonarqube
   ```

3. **Check SonarQube connectivity**:
   ```bash
   docker exec jenkins curl -s -f http://sonarqube:9000/api/system/status
   ```

4. **Verify tools are installed in Jenkins**:
   ```bash
   docker exec jenkins dotnet --list-sdks
   docker exec jenkins node --version
   docker exec jenkins dotnet tool list --global
   ```

### Missing SonarScanner for .NET

If the SonarScanner for .NET is missing, you can install it in the Jenkins container:

```bash
docker exec jenkins sh -c "dotnet tool install --global dotnet-sonarscanner --version 5.13.0"
```

### Missing SonarScanner for JavaScript

If the SonarScanner for JavaScript is missing:

```bash
docker exec jenkins sh -c "npm install -g sonarqube-scanner"
```
