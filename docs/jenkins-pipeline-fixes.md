# Jenkins CI/CD Pipeline Fixes

This document covers the fixes applied to resolve the Jenkins pipeline build issues for the EY Expense Manager project.

## Main Issues Fixed

1. **Docker Permission Issues**: Unable to access Docker daemon
   - Modified the Jenkinsfile to set consistent permissions on the Docker socket
   - Simplified the Docker commands and removed unnecessary fallbacks

2. **SonarQube Authentication Error**: Invalid sonar.login format
   - Updated the SonarQube integration with proper token formatting
   - Ensured proper quoting of environment variables to handle special characters

3. **Angular Dependency Conflict**: Zone.js version incompatibility
   - Changed the zone.js version from ~0.14.4 to ~0.14.0 to resolve version conflicts

4. **Previous Issues (Already Fixed)**:
   - **DotNet SDK Installation Error**: `java.net.MalformedURLException: no protocol`
   - **Post Build Cleanup Error**: `Required context class hudson.FilePath is missing`
   - **SonarQube Scanner Tools**: Installation and configuration issues

## Changes Made

### 1. Docker Permission Fix

Simplified Docker socket permission management:
```groovy
// Set appropriate permissions for Docker socket - simplified approach
sh '''
    # Set appropriate permissions for Docker socket
    if [ -e /var/run/docker.sock ]; then
        echo "Setting permissions for Docker socket"
        sudo chmod 666 /var/run/docker.sock
        echo "Current permissions for Docker socket:"
        ls -la /var/run/docker.sock
    else
        echo "Docker socket not found at /var/run/docker.sock"
        exit 1
    fi
    
    # Verify Docker access
    docker version || exit 1
'''
```

Simplified Docker build commands:
```groovy
// Build Docker image (don't use sudo as we've fixed permissions)
docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .
docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest
```

### 2. SonarQube Authentication Fix

For backend .NET analysis:
```groovy
dotnet sonarscanner begin /k:"ey-expense-manager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_TOKEN}" /n:"EY Expense Manager" /v:"1.0.0"
```

For frontend Angular analysis:
```groovy
sonar-scanner -Dsonar.projectKey=ey-expense-manager-ui \
-Dsonar.projectName="EY Expense Manager UI" \
-Dsonar.sources=src \
-Dsonar.login="${SONAR_TOKEN}" \
-Dsonar.host.url="${SONAR_HOST_URL}" \
-Dsonar.projectVersion=1.0.0
```

### 3. Angular Zone.js Fix

Updated package.json dependency:
```json
"zone.js": "~0.14.0"
```

### 4. Deployment Stage Fix

Simplified deployment with Docker Compose:
```groovy
stage('Deploy to Development') {
    steps {
        sh '''
            # Set DB_PASSWORD environment variable with a default if not set
            DB_PASSWORD=${DB_PASSWORD:-StrongPassword123!}
            
            # Deploy using docker-compose (permissions already fixed in previous stage)
            echo "Deploying to development environment..."
            docker-compose -f docker-compose.dev.yml up -d
        '''
    }
}
```

### 5. Previous Fixes

1. **Docker Permission Issues**: Unable to access Docker daemon
   - Modified the Jenkinsfile to set consistent permissions on the Docker socket
   - Simplified the Docker commands and removed unnecessary fallbacks

2. **SonarQube Authentication Error**: Invalid sonar.login format
   - Updated the SonarQube integration with proper token formatting
   - Ensured proper quoting of environment variables to handle special characters

3. **Angular Dependency Conflict**: Zone.js version incompatibility
   - Changed the zone.js version from ~0.14.4 to ~0.14.0 to resolve version conflicts

4. **Previous Issues (Already Fixed)**:
   - **DotNet SDK Installation Error**: `java.net.MalformedURLException: no protocol`
   - **Post Build Cleanup Error**: `Required context class hudson.FilePath is missing`
   - Fixed by wrapping the `cleanWs()` call in a `node {}` block in the post section.
   - This ensures the cleanup command has a proper node context when executed.

3. **SonarQube Scanner Tools**:
   - Added installation of SonarScanner for .NET as a global tool.
   - Added installation of SonarScanner CLI for Angular frontend analysis.
   - Set proper PATH environment variables to ensure tools are available during execution.

## Changes Made

### 1. .NET SDK Installation

Replaced the tool declaration:
```groovy
tools {
    dotnetsdk 'dotnet8'
    nodejs 'nodejs'
}
```

With a dedicated installation stage:
```groovy
stage('Install Tools') {
    steps {
        sh '''
            # Install .NET SDK 8 if not already installed
            if [ ! -d "/usr/share/dotnet" ]; then
                mkdir -p /usr/share/dotnet
            fi
            
            if ! command -v dotnet &> /dev/null; then
                # Download and install .NET SDK 8.0
                wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
                chmod +x dotnet-install.sh
                ./dotnet-install.sh --version 8.0.100 --install-dir /usr/share/dotnet
                rm dotnet-install.sh
            fi
            
            # Verify .NET installation
            dotnet --info
            
            # Install SonarScanner tools
            ...
        '''
    }
}
```

### 2. Post-build Cleanup Fix

Fixed the post section:
```groovy
post {
    always {
        // Clean up workspace
        cleanWs()
    }
}
```

To include a node block:
```groovy
post {
    always {
        node {
            // Clean up workspace
            cleanWs()
        }
    }
}
```

### 3. SonarQube Scanner Installation

Added installation of both SonarScanner for .NET and SonarScanner CLI:
```groovy
# Install SonarScanner for .NET
dotnet tool install --global dotnet-sonarscanner || true
export PATH="$PATH:$HOME/.dotnet/tools"

# Install SonarScanner CLI if needed
if ! command -v sonar-scanner &> /dev/null; then
    mkdir -p /opt/sonar-scanner
    curl -L https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip -o sonar-scanner.zip
    unzip -o sonar-scanner.zip -d /opt
    mv /opt/sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner
    ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
    rm sonar-scanner.zip
fi
```

## Next Steps

1. Monitor the Jenkins build to ensure it completes successfully
2. Check SonarQube integration to ensure analysis results are being uploaded
3. Verify that both backend and frontend can be built and deployed correctly
4. Consider setting up quality gates in SonarQube to enforce code quality standards
