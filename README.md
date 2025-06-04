# EY Expense Manager - Full-Stack DevOps Project

This repository contains a complete .NET 8 and Angular 19 application with a comprehensive DevOps setup for continuous integration, deployment, and monitoring.

## Project Overview

EY Expense Manager is an enterprise-grade expense tracking and management solution built with:

- **Backend**: .NET 8 API with Clean Architecture
- **Frontend**: Angular 19 with Material UI
- **Database**: SQL Server 2022
- **Caching**: Redis
- **DevOps Tools**: Jenkins, SonarQube, Docker, Prometheus, Grafana, Seq

## Architecture

The application follows a layered clean architecture approach:

```
EYExpenseManager/
├── API            - Web API controllers, configuration
├── Application    - Business logic, DTOs, Services
├── Core           - Domain entities, interfaces
└── Infrastructure - Data access, repositories, migrations
```

The Angular frontend follows a modular structure with lazy-loading for optimal performance.

## Getting Started

### Prerequisites

- .NET 8 SDK
- Node.js 18+ and NPM
- Angular CLI 19
- Docker Desktop
- Visual Studio 2022 (optional)
- VS Code (recommended)

### Local Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
   cd Gestion-et-Suivi-des-Missions-AVA-EY
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   # Edit the .env file with your configuration values
   ```

3. Run the setup script:
   ```powershell
   .\scripts\setup-dev-environment.ps1
   ```

3. Start the development environment:
   ```
   .\start-dev-environment.bat
   ```

4. Access the application:
   - Frontend: http://localhost:4200
   - API: http://localhost:5000
   - Swagger: http://localhost:5000/swagger

### Starting the DevOps Environment

1. Start the DevOps toolchain:
   ```
   .\start-devops-environment.bat
   ```

2. Access DevOps tools:
   - Jenkins: http://localhost:8080
   - SonarQube: http://localhost:9000
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090
   - Seq: http://localhost:5341
   - Portainer: https://localhost:9443

## Core Features

- **User Management**: Registration, authentication, and profile management
- **Mission Management**: Create, edit, and manage business trips
- **Expense Tracking**: Add, track, and manage expenses tied to missions
- **Document Processing**: Upload and process receipts and invoices
- **Reporting**: Generate reports and analytics on expenses

## DevOps Features

- **CI/CD Pipeline**: Automated build, test, and deployment
- **Code Quality**: SonarQube analysis for both .NET and Angular code
- **Containerization**: Docker images for consistent deployment
- **Monitoring**: Prometheus for metrics and Grafana for visualization
- **Logging**: Centralized logging with Seq
- **Container Management**: Portainer for Docker management

## Development Workflow

1. Create a feature branch from `main`
2. Implement your changes (backend and/or frontend)
3. Run tests locally
4. Create a pull request
5. Wait for CI checks to pass
6. Get code review and approval
7. Merge to `main` branch
8. Watch the automated deployment

## Available Scripts

- `setup-dev-environment.ps1`: Sets up the local development environment
- `start-dev-environment.bat`: Starts the application services
- `start-devops-environment.bat`: Starts the DevOps tools
- `setup-github-jenkins.bat`: Sets up GitHub integration and Jenkins configuration
- `push-to-github.bat`: Pushes the project to GitHub repository
- `configure-jenkins.bat`: Configures Jenkins with AdminFiras account
- `configure-jenkins-pipeline.sh`: Configures Jenkins pipeline (run in Jenkins container)
- `setup-dotnet-monitoring.sh`: Reference for adding monitoring to .NET apps
- `deploy-to-kubernetes.sh`: Deploys to Kubernetes (for future use)

## Contributing

1. Ensure you have read the development workflow
2. Create descriptive commits and pull requests
3. Include tests for new features
4. Update documentation as needed
5. Follow the coding standards for both .NET and Angular

## Project Structure

```
devops-Projet-Gestion-Missions/
├── docs/                           # Documentation files
├── ey-expense-manager-ui/          # Angular frontend
├── EYExpenseManager/               # .NET backend solution
├── scripts/                        # Scripts for setup and deployment
├── shared/                         # Shared resources
├── vagrant/                        # Vagrant configuration files
│   └── docker/                     # Docker configurations for DevOps tools
├── docker-compose.dev.yml          # Docker Compose for application services
├── docker-compose.override.yml     # Environment-specific overrides
├── Jenkinsfile                     # CI/CD pipeline definition
└── README.md                       # This file
```

## Documentation

Comprehensive documentation is available in the `docs/` folder:

- `getting-started.md`: Detailed setup guide
- `devops-workflow-guide.md`: DevOps workflow documentation
- `devops-runbook.md`: Operations runbook
- `maintenance-guide.md`: System maintenance guide
- `production-deployment-guide.md`: Production deployment steps
- `monitoring-instructions.md`: Monitoring setup guide
- `environment-setup.md`: Environment variables configuration
- `github-jenkins-integration.md`: GitHub and Jenkins integration guide
- `manual-jenkins-configuration.md`: Step-by-step Jenkins setup instructions
- `sonarqube-github-integration.md`: SonarQube setup with GitHub
- `sonarqube-integration-guide.md`: Detailed SonarQube configuration

## License

This project is proprietary and confidential.

## Acknowledgments

- EY for the project requirements and support
- The .NET, Angular, and DevOps communities for tools and libraries
