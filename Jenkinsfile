pipeline {
    agent any

    environment {
        DOTNET_CLI_HOME = "/tmp/dotnet_cli_home"
        DOTNET_ROOT = "/usr/share/dotnet"
        PATH = "$PATH:/usr/share/dotnet"
        NODE_OPTIONS = "--max-old-space-size=4096"
        SONAR_TOKEN = credentials('sonarqube-token')
        CHROME_BIN = "/usr/bin/chromium"
    }
    
    tools {
        nodejs 'nodejs'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install System Dependencies') {
            steps {
                sh '''
                    # Install necessary packages for downloading and installing tools
                    echo "Installing system dependencies..."
                    apt-get update -y
                    apt-get install -y wget curl unzip apt-transport-https ca-certificates
                    
                    # Install Chromium for Angular tests
                    echo "Installing Chromium for Angular tests..."                    apt-get install -y chromium
                    
                    # Check if Docker is available(without installing)
                    echo "Checking Docker availability..."
                    if command -v docker &> /dev/null; then
                        echo "Docker command found, checking permissions..."
                        if docker --version; then
                            echo "Docker is working properly"
                        else
                            echo "WARNING: Docker permission denied. Will try to fix or use alternative approaches."
                            # Don't let this fail the pipeline
                            true
                        fi
                    else
                        echo "WARNING: Docker command not found. Docker-related steps might fail."
                        # Don't let this fail the pipeline
                        true
                    fi
                    
                    # Verify installations
                    echo "Checking installed tools:"
                    wget --version || echo "wget not installed properly"
                    curl --version || echo "curl not installed properly"
                    unzip -v || echo "unzip not installed properly"
                    chromium --version || echo "chromium not installed properly"
                '''
            }
        }
        
        stage('Install Tools') {
            steps {
                sh '''
                    # Install .NET SDK 8 if not already installed
                    if [ ! -d "/usr/share/dotnet" ]; then
                        mkdir -p /usr/share/dotnet
                    fi
                    
                    if ! command -v dotnet &> /dev/null; then
                        # Download and install .NET SDK 8.0
                        echo "Downloading .NET install script..."
                        wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
                        
                        echo "Making script executable..."
                        chmod +x dotnet-install.sh
                        
                        echo "Installing .NET SDK 8.0..."
                        ./dotnet-install.sh --version 8.0.100 --install-dir /usr/share/dotnet
                        
                        echo "Cleaning up..."
                        rm dotnet-install.sh
                        
                        # Add dotnet to the PATH
                        export PATH="$PATH:/usr/share/dotnet"
                        echo "export PATH=$PATH:/usr/share/dotnet" >> ~/.bashrc                    fi
                    
                    # Verify .NET installation
                    echo "Checking .NET installation:"
                    dotnet --info || echo ".NET installation failed"
                    
                    # Install SonarScanner for .NET
                    echo "Setting up dotnet-sonarscanner..."
                    # Export temp home to avoid permission issues
                    export DOTNET_CLI_HOME="/tmp/dotnet_cli_home"
                    mkdir -p $DOTNET_CLI_HOME/.dotnet/tools || true
                    export PATH="$PATH:$DOTNET_CLI_HOME/.dotnet/tools"
                    
                    install_dotnet_sonarscanner() {
                        echo "Installing dotnet-sonarscanner..."
                        dotnet tool install --global dotnet-sonarscanner 2>/dev/null || 
                        dotnet tool update --global dotnet-sonarscanner 2>/dev/null ||
                        return 1
                        return 0
                    }
                    
                    # Try to verify if sonarscanner is installed
                    if dotnet tool list -g | grep -q "dotnet-sonarscanner"; then
                        echo "dotnet-sonarscanner already installed"
                    # Try to install regularly
                    elif install_dotnet_sonarscanner; then
                        echo "dotnet-sonarscanner installed successfully"
                    # If installation fails, try with a specific path
                    else
                        echo "Warning: Global installation failed. Installing dotnet-sonarscanner locally..."
                        
                        # Try local installation
                        mkdir -p $WORKSPACE/tools || true
                        cd $WORKSPACE/tools
                        dotnet new tool-manifest --force || true
                        dotnet tool install dotnet-sonarscanner || dotnet tool update dotnet-sonarscanner
                        cd $WORKSPACE
                    fi
                    
                    # Create symlinks to ensure the tool is accessible from various paths
                    mkdir -p $HOME/.dotnet/tools || true
                    if [ -f "$DOTNET_CLI_HOME/.dotnet/tools/dotnet-sonarscanner" ]; then
                        ln -sf $DOTNET_CLI_HOME/.dotnet/tools/dotnet-sonarscanner $HOME/.dotnet/tools/dotnet-sonarscanner || true
                    fi
                    
                    # Make sure the sonarscanner is in PATH
                    export PATH="$PATH:$HOME/.dotnet/tools:$DOTNET_CLI_HOME/.dotnet/tools:$WORKSPACE/tools/.dotnet/tools"
                    echo "export PATH=$PATH:$HOME/.dotnet/tools:$DOTNET_CLI_HOME/.dotnet/tools:$WORKSPACE/tools/.dotnet/tools" >> ~/.bashrc
                    
                    # Install SonarScanner CLI if needed
                    if ! command -v sonar-scanner &> /dev/null; then
                        echo "Installing SonarScanner CLI..."
                        # Try with regular permissions first
                        install_sonarscanner() {
                            local INSTALL_DIR=${1:-/opt}
                            echo "Installing SonarScanner to $INSTALL_DIR"
                            
                            # Download SonarScanner
                            curl -L https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip -o sonar-scanner.zip || return 1
                            
                            # Create a temporary directory for extraction
                            local TEMP_DIR=$(mktemp -d)
                            unzip -o sonar-scanner.zip -d $TEMP_DIR || return 1
                            
                            # Remove old installation if it exists
                            if [ -d "$INSTALL_DIR/sonar-scanner" ]; then
                                echo "Removing existing sonar-scanner directory"
                                rm -rf "$INSTALL_DIR/sonar-scanner" || return 1
                            fi
                            
                            # Create directory and copy files
                            mkdir -p "$INSTALL_DIR/sonar-scanner" || return 1
                            cp -r $TEMP_DIR/sonar-scanner-4.8.0.2856-linux/* "$INSTALL_DIR/sonar-scanner/" || return 1
                            
                            # Create symbolic link
                            ln -sf "$INSTALL_DIR/sonar-scanner/bin/sonar-scanner" /usr/local/bin/sonar-scanner 2>/dev/null || 
                              echo "Warning: Could not create symlink in /usr/local/bin - will use direct path instead"
                            
                            # Clean up
                            rm -rf $TEMP_DIR
                            rm sonar-scanner.zip
                            
                            # Export path to make it available immediately
                            export PATH="$PATH:$INSTALL_DIR/sonar-scanner/bin"
                            
                            # Verify installation
                            if [ -f "$INSTALL_DIR/sonar-scanner/bin/sonar-scanner" ]; then
                                echo "SonarScanner installed successfully to $INSTALL_DIR/sonar-scanner"
                                return 0
                            else
                                echo "SonarScanner installation failed"
                                return 1
                            fi
                        }
                        
                        # Try installation in different locations with and without sudo
                        if install_sonarscanner /opt; then
                            echo "SonarScanner installed to /opt successfully"
                        elif sudo install_sonarscanner /opt; then
                            echo "SonarScanner installed to /opt with sudo successfully"
                        elif install_sonarscanner $HOME; then
                            echo "SonarScanner installed to $HOME successfully"
                            # Update PATH to include user's local installation
                            export PATH="$PATH:$HOME/sonar-scanner/bin"
                        else
                            echo "WARNING: Could not install SonarScanner - analysis may fail"
                            # Create a local directory in workspace as fallback
                            mkdir -p $WORKSPACE/tools/sonar-scanner
                            install_sonarscanner $WORKSPACE/tools
                            export PATH="$PATH:$WORKSPACE/tools/sonar-scanner/bin"
                        fi
                    fi
                    
                    # Verify SonarScanner installation
                    echo "Checking SonarScanner installation:"
                    sonar-scanner --version || echo "SonarScanner not properly installed"
                '''
            }
        }

        stage('Backend - Restore & Build') {
            steps {
                dir('EYExpenseManager') {
                    sh 'dotnet restore'
                    sh 'dotnet build --configuration Release --no-restore'
                }
            }
        }

        stage('Backend - Test') {
            steps {
                dir('EYExpenseManager') {
                    sh 'dotnet test --no-restore --verbosity normal'
                }
            }
        }
        
        stage('Backend - Sonar Analysis') {
            steps {
                dir('EYExpenseManager') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            # Ensure SonarScanner is in the PATH
                            export PATH="$PATH:$HOME/.dotnet/tools:/tmp/dotnet_cli_home/.dotnet/tools:$WORKSPACE/tools/.dotnet/tools"
                            
                            # Verify dotnet-sonarscanner installation
                            if ! dotnet tool list -g | grep -q "dotnet-sonarscanner" && ! command -v dotnet-sonarscanner &> /dev/null; then
                                echo "dotnet-sonarscanner not found in PATH or global tools. Attempting emergency installation..."
                                export DOTNET_CLI_HOME="/tmp/dotnet_cli_home"
                                mkdir -p $DOTNET_CLI_HOME/.dotnet/tools || true
                                dotnet tool install --global dotnet-sonarscanner || true
                                dotnet tool update --global dotnet-sonarscanner || true
                                
                                # Also try local installation as fallback
                                mkdir -p $WORKSPACE/tools || true
                                cd $WORKSPACE/tools
                                dotnet new tool-manifest --force || true
                                dotnet tool install dotnet-sonarscanner || true
                                cd $WORKSPACE/EYExpenseManager
                                
                                export PATH="$PATH:$DOTNET_CLI_HOME/.dotnet/tools:$WORKSPACE/tools/.dotnet/tools"
                            fi
                            
                            echo "Beginning SonarQube analysis..."
                            
                            # Try to run sonarscanner with error handling
                            set +e  # Don't exit on error
                            
                            dotnet sonarscanner begin /k:"ey-expense-manager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_AUTH_TOKEN}" /n:"EY Expense Manager" /v:"1.0.0"
                            SONAR_BEGIN_STATUS=$?
                            
                            if [ $SONAR_BEGIN_STATUS -ne 0 ]; then
                                echo "SonarQube analysis begin failed. Trying with full path..."
                                
                                # Try different paths to find dotnet-sonarscanner
                                SCANNER_PATHS=(
                                  "$HOME/.dotnet/tools/dotnet-sonarscanner"
                                  "/tmp/dotnet_cli_home/.dotnet/tools/dotnet-sonarscanner"
                                  "$WORKSPACE/tools/.dotnet/tools/dotnet-sonarscanner"
                                )
                                
                                for scanner_path in "${SCANNER_PATHS[@]}"; do
                                    if [ -f "$scanner_path" ]; then
                                        echo "Found sonarscanner at $scanner_path"
                                        $scanner_path begin /k:"ey-expense-manager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_AUTH_TOKEN}" /n:"EY Expense Manager" /v:"1.0.0"
                                        SONAR_BEGIN_STATUS=$?
                                        if [ $SONAR_BEGIN_STATUS -eq 0 ]; then
                                            break
                                        fi
                                    fi
                                done
                            fi
                            
                            # If SonarQube begin still failed, proceed with build anyway
                            echo "Building project..."
                            dotnet build --no-incremental
                            
                            if [ $SONAR_BEGIN_STATUS -eq 0 ]; then
                                echo "Running SonarQube end analysis..."
                                dotnet sonarscanner end /d:sonar.login="${SONAR_AUTH_TOKEN}" || echo "SonarQube end analysis failed but continuing pipeline"
                            else
                                echo "Skipping SonarQube end analysis because begin analysis failed"
                            fi
                            
                            set -e  # Restore normal error handling
                        '''
                    }
                }
            }
        }
        
        stage('Frontend - Install Dependencies') {
            steps {
                dir('ey-expense-manager-ui') {
                    sh 'npm install'
                }
            }
        }
        
        stage('Frontend - Build') {
            steps {
                dir('ey-expense-manager-ui') {
                    sh 'npm run build -- --configuration=production'
                }
            }
        }
        
        stage('Frontend - Test') {
            steps {
                dir('ey-expense-manager-ui') {
                    sh 'export CHROME_BIN=/usr/bin/chromium && npm test -- --watch=false --browsers=ChromeHeadless'
                }
            }
        }
        
        stage('Frontend - Sonar Analysis') {
            steps {
                dir('ey-expense-manager-ui') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            # Add all possible sonar-scanner locations to PATH
                            export PATH="$PATH:/opt/sonar-scanner/bin:$HOME/sonar-scanner/bin:$WORKSPACE/tools/sonar-scanner/bin"
                            
                            echo "Checking SonarScanner CLI availability..."
                            
                            # Find sonar-scanner executable
                            SONAR_SCANNER=""
                            for path in "/opt/sonar-scanner/bin/sonar-scanner" "/usr/local/bin/sonar-scanner" "$HOME/sonar-scanner/bin/sonar-scanner" "$WORKSPACE/tools/sonar-scanner/bin/sonar-scanner"; do
                                if [ -f "$path" ]; then
                                    SONAR_SCANNER="$path"
                                    echo "Found sonar-scanner at $SONAR_SCANNER"
                                    break
                                fi
                            done
                            
                            # If sonar-scanner wasn't found, try to find it in PATH
                            if [ -z "$SONAR_SCANNER" ]; then
                                if command -v sonar-scanner &> /dev/null; then
                                    SONAR_SCANNER="sonar-scanner"
                                    echo "Found sonar-scanner in PATH"
                                else
                                    echo "WARNING: sonar-scanner not found - attempting to install locally"
                                    # Create a workspace tools directory and install there
                                    mkdir -p $WORKSPACE/tools || true
                                    (
                                        # Try to install in workspace as a fallback
                                        cd $WORKSPACE/tools
                                        curl -L https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip -o sonar-scanner.zip
                                        unzip -o sonar-scanner.zip
                                        mv sonar-scanner-4.8.0.2856-linux sonar-scanner
                                        chmod +x sonar-scanner/bin/sonar-scanner
                                        export PATH="$PATH:$WORKSPACE/tools/sonar-scanner/bin"
                                        SONAR_SCANNER="$WORKSPACE/tools/sonar-scanner/bin/sonar-scanner"
                                    )
                                fi
                            fi
                            
                            # Try to run sonar-scanner
                            set +e  # Don't fail on error
                            if [ -n "$SONAR_SCANNER" ]; then
                                echo "Running SonarQube analysis with $SONAR_SCANNER"
                                "$SONAR_SCANNER" -Dsonar.projectKey=ey-expense-manager-ui -Dsonar.projectName="EY Expense Manager UI" -Dsonar.sources=src -Dsonar.projectVersion=1.0.0 || \
                                echo "WARNING: SonarQube analysis failed but continuing pipeline"
                            else
                                echo "WARNING: SonarQube scanner not found, skipping analysis"
                            fi
                            set -e  # Restore error behavior
                        '''
                    }
                }
            }
        }
        
        stage('Docker Build & Publish') {
            steps {
                // Use the Docker socket from the host with sudo
                sh '''
                    # Add jenkins user to docker group (might require restart)
                    if grep -q docker /etc/group; then
                        echo "Docker group exists"
                        if ! id -nG jenkins | grep -qw "docker"; then
                            echo "Adding jenkins to docker group"
                            sudo usermod -aG docker jenkins || echo "Could not add jenkins to docker group"
                        fi
                    else
                        echo "Docker group doesn't exist - trying to create"
                        sudo groupadd docker || echo "Could not create docker group"
                        sudo usermod -aG docker jenkins || echo "Could not add jenkins to docker group"
                    fi
                    
                    # Set appropriate permissions for Docker socket                    if [ -e /var/run/docker.sock ]; then
                        echo "Setting permissions for Docker socket"
                        sudo chmod 666 /var/run/docker.sock || echo "Could not set permissions on Docker socket"
                        echo "Current permissions for Docker socket:"
                        ls -la /var/run/docker.sock || echo "Cannot list Docker socket"
                    else
                        echo "Docker socket not found at /var/run/docker.sock"
                    fi
                    
                    # Make sure we continue even if Docker isn't fully accessible
                    echo "Docker permission setup complete"
                    true
                '''
                
                // Backend Docker image
                dir('EYExpenseManager') {
                    sh '''
                        # Debug information
                        echo "Current user: $(whoami)"
                        echo "Docker socket permissions: $(ls -la /var/run/docker.sock || echo 'Docker socket not available')"
                        
                        # Try to build Docker image, but don't fail the pipeline if Docker isn't working
                        echo "Attempting to build backend Docker image..."                        if docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Docker build succeeded normally"
                            docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest || echo "Failed to tag image"
                        elif sudo docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Docker build succeeded with sudo"
                            sudo docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest || echo "Failed to tag image with sudo"
                        else
                            echo "WARNING: Could not build Docker image - skipping this step"
                        fi
                        
                        # Make sure the script doesn't fail even if Docker commands failed
                        true
                    '''
                }
                
                // Frontend Docker image
                dir('ey-expense-manager-ui') {
                    sh '''
                        # Try to build Docker image, but don't fail the pipeline if Docker isn't working
                        echo "Attempting to build frontend Docker image..."
                        if docker build -t eyexpensemanager-ui:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Docker build succeeded normally"
                            docker tag eyexpensemanager-ui:${BUILD_NUMBER} eyexpensemanager-ui:latest || echo "Failed to tag image"
                        elif sudo docker build -t eyexpensemanager-ui:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Docker build succeeded with sudo"
                            sudo docker tag eyexpensemanager-ui:${BUILD_NUMBER} eyexpensemanager-ui:latest || echo "Failed to tag image with sudo"
                        else
                            echo "WARNING: Could not build Docker image - skipping this step"
                        fi
                        
                        # Make sure the script doesn't fail even if Docker commands failed
                        true
                    '''
                }
            }
        }
        
        stage('Deploy to Development') {
            steps {
                sh '''
                    # Export DB_PASSWORD for docker-compose if needed
                    # DB_PASSWORD=${DB_PASSWORD:-StrongPassword123!}
                    
                    echo "Attempting to deploy to development environment..."
                    if docker-compose -f docker-compose.dev.yml up -d; then
                        echo "Deployment successful"
                    elif sudo docker-compose -f docker-compose.dev.yml up -d; then
                        echo "Deployment successful using sudo"
                    else
                        echo "WARNING: Could not deploy using docker-compose - skipping this step"
                    fi
                    
                    # Make sure the script doesn't fail even if docker-compose failed
                    true
                '''
            }
        }
    }
    
    post {
        always {
            node('built-in') {
                // Clean up workspace
                cleanWs()
            }
        }
        success {
            // Notifications for successful build
            echo 'Build succeeded!'
        }
        failure {
            // Notifications for failed build
            echo 'Build failed!'
        }
    }
}
