pipeline {
    agent any
    
    environment {
        DOTNET_CLI_HOME = "/tmp/dotnet_cli_home"
        DOTNET_ROOT = "/usr/share/dotnet"
        PATH = "$PATH:/usr/share/dotnet"
        NODE_OPTIONS = "--max-old-space-size=4096"
        SONAR_TOKEN = credentials('sonarqube-token')
        CHROME_BIN = "/usr/bin/chromium"
        DB_PASSWORD = credentials('db-password') // Add database password as a Jenkins credential
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
                    echo "Installing Chromium for Angular tests..."
                    apt-get install -y chromium
                      # Check if Docker is available (without installing)
                    echo "Checking Docker availability..."
                    if command -v docker &> /dev/null; then
                        echo "Docker command is available:"
                        if docker --version; then
                            echo "Docker client is working properly"
                        else
                            echo "Docker client exists but cannot be executed. Checking permissions..."
                            ls -la $(which docker)
                            echo "Docker socket permissions:"
                            ls -la /var/run/docker.sock || echo "Docker socket not found"
                        fi
                        
                        # Check if docker is in docker group
                        echo "Docker group members:"
                        getent group docker || echo "Docker group doesn't exist"
                        
                        # Check current user and groups
                        echo "Current user:"
                        id
                    else
                        echo "WARNING: Docker command not found. Docker-related steps might fail."
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
                        echo "export PATH=$PATH:/usr/share/dotnet" >> ~/.bashrc
                    fi
                    
                    # Verify .NET installation
                    echo "Checking .NET installation:"
                    dotnet --info || echo ".NET installation failed"
                    
                    # Install SonarScanner for .NET
                    echo "Installing SonarScanner for .NET..."
                    dotnet tool install --global dotnet-sonarscanner || true
                    export PATH="$PATH:$HOME/.dotnet/tools"
                    echo "export PATH=$PATH:$HOME/.dotnet/tools" >> ~/.bashrc
                    
                    # Install SonarScanner CLI if needed
                    if ! command -v sonar-scanner &> /dev/null; then
                        echo "Installing SonarScanner CLI..."
                        mkdir -p /opt/sonar-scanner
                        curl -L https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip -o sonar-scanner.zip
                        unzip -o sonar-scanner.zip -d /opt
                        mv /opt/sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner
                        ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
                        rm sonar-scanner.zip
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
                            export PATH="$PATH:$HOME/.dotnet/tools"
                            dotnet sonarscanner begin /k:"ey-expense-manager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_AUTH_TOKEN}" /n:"EY Expense Manager" /v:"1.0.0"
                            dotnet build --no-incremental
                            dotnet sonarscanner end /d:sonar.login="${SONAR_AUTH_TOKEN}"
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
                            export PATH="$PATH:/opt/sonar-scanner/bin"
                            sonar-scanner -Dsonar.projectKey=ey-expense-manager-ui -Dsonar.projectName="EY Expense Manager UI" -Dsonar.sources=src -Dsonar.projectVersion=1.0.0
                        '''
                    }
                }
            }
        }        stage('Docker Build & Publish') {
            steps {
                // Use the Docker socket from the host with sudo
                sh '''
                    # Add jenkins user to docker group (might require restart)
                    if grep -q docker /etc/group; then
                        echo "Docker group exists"
                        if ! id -nG jenkins | grep -qw "docker"; then
                            echo "Adding jenkins to docker group"
                            sudo usermod -aG docker jenkins || true
                        fi
                    else
                        echo "Docker group doesn't exist - trying to create"
                        sudo groupadd docker || true
                        sudo usermod -aG docker jenkins || true
                    fi
                    
                    # Set appropriate permissions for Docker socket
                    if [ -e /var/run/docker.sock ]; then
                        echo "Setting permissions for Docker socket"
                        sudo chmod 666 /var/run/docker.sock || true
                    else
                        echo "Docker socket not found at /var/run/docker.sock"
                    fi
                '''
                
                // Backend Docker image
                dir('EYExpenseManager') {
                    sh '''
                        # Debug information
                        echo "Current user: $(whoami)"
                        echo "Docker socket permissions: $(ls -la /var/run/docker.sock || echo 'Docker socket not available')"
                        
                        # Use sudo if needed
                        if ! docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Trying with sudo..."
                            sudo docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .
                        fi
                        
                        if ! docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest; then
                            echo "Trying with sudo..."
                            sudo docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest
                        fi
                    '''
                }
                
                // Frontend Docker image
                dir('ey-expense-manager-ui') {
                    sh '''
                        # Use sudo if needed
                        if ! docker build -t eyexpensemanager-ui:${BUILD_NUMBER} -f Dockerfile .; then
                            echo "Trying with sudo..."
                            sudo docker build -t eyexpensemanager-ui:${BUILD_NUMBER} -f Dockerfile .
                        fi
                        
                        if ! docker tag eyexpensemanager-ui:${BUILD_NUMBER} eyexpensemanager-ui:latest; then
                            echo "Trying with sudo..."
                            sudo docker tag eyexpensemanager-ui:${BUILD_NUMBER} eyexpensemanager-ui:latest
                        fi
                    '''
                }
            }
        }
        
        stage('Deploy to Development') {
            steps {
                sh '''
                    # Export DB_PASSWORD for docker-compose
                    export DB_PASSWORD=${DB_PASSWORD:-StrongPassword123!}
                    
                    # Try running docker-compose normally first
                    if ! docker-compose -f docker-compose.dev.yml up -d; then
                        echo "Trying with sudo..."
                        sudo docker-compose -f docker-compose.dev.yml up -d
                    fi
                    
                    echo "Development environment deployed:"
                    if command -v docker ps &> /dev/null; then
                        docker ps || sudo docker ps
                    fi
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
