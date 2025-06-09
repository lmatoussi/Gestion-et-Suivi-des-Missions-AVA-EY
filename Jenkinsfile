pipeline {
    agent any

    environment {
        DOTNET_CLI_HOME = "/tmp/dotnet_cli_home"
        DOTNET_ROOT = "/usr/share/dotnet"
        PATH = "$PATH:/usr/share/dotnet"
        NODE_OPTIONS = "--max-old-space-size=4096"
        SONAR_TOKEN = credentials('sonarqube-token')
    }
      tools {
        dotnetsdk 'dotnet8'
        nodejs 'nodejs'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
            steps {                dir('EYExpenseManager') {
                    sh 'dotnet test --no-restore --verbosity normal'
                }
            }
        }
        
        stage('Backend - Sonar Analysis') {
            steps {
                dir('EYExpenseManager') {
                    withSonarQubeEnv('SonarQube') {
                        sh 'dotnet sonarscanner begin /k:"ey-expense-manager" /d:sonar.host.url="${SONAR_HOST_URL}" /d:sonar.login="${SONAR_AUTH_TOKEN}" /n:"EY Expense Manager" /v:"1.0.0"'
                        sh 'dotnet build --no-incremental'
                        sh 'dotnet sonarscanner end /d:sonar.login="${SONAR_AUTH_TOKEN}"'
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
            steps {                dir('ey-expense-manager-ui') {
                    sh 'npm test -- --watch=false --browsers=ChromeHeadless'
                }
            }
        }
        
        stage('Frontend - Sonar Analysis') {
            steps {
                dir('ey-expense-manager-ui') {
                    withSonarQubeEnv('SonarQube') {
                        sh 'sonar-scanner -Dsonar.projectKey=ey-expense-manager-ui -Dsonar.projectName="EY Expense Manager UI" -Dsonar.sources=src -Dsonar.projectVersion=1.0.0'
                    }
                }
            }
        }
        
        stage('Docker Build & Publish') {
            steps {
                // Backend Docker image
                dir('EYExpenseManager') {
                    sh 'docker build -t eyexpensemanager-api:${BUILD_NUMBER} -f Dockerfile .'
                    sh 'docker tag eyexpensemanager-api:${BUILD_NUMBER} eyexpensemanager-api:latest'
                }
                
                // Frontend Docker image
                dir('ey-expense-manager-ui') {
                    sh 'docker build -t eyexpensemanager-ui:${BUILD_NUMBER} -f Dockerfile .'
                    sh 'docker tag eyexpensemanager-ui:${BUILD_NUMBER} eyexpensemanager-ui:latest'
                }
            }
        }

        stage('Deploy to Development') {
            steps {
                sh 'docker-compose -f docker-compose.dev.yml up -d'
            }
        }
    }
    
    post {
        always {
            // Clean up workspace
            cleanWs()
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
