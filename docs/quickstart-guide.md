# EY Expense Manager - Quick Start Guide for New Team Members

Welcome to the EY Expense Manager project! This guide will help you quickly get up to speed with our development environment, tools, and workflows.

## Project Overview

EY Expense Manager is an enterprise application for managing expenses and missions, built with:

- **Backend**: .NET 8 API with Clean Architecture
- **Frontend**: Angular 19 with Material UI
- **Database**: SQL Server 2022
- **DevOps**: Jenkins, SonarQube, Docker, and more

## Getting Started

### Step 1: Clone the Repository

```powershell
git clone https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
cd Gestion-et-Suivi-des-Missions-AVA-EY
```

### Step 2: Set Up Your Development Environment

Run our automated setup script to install all necessary tools and dependencies:

```powershell
.\scripts\setup-dev-environment.ps1
```

This script will:
- Check for prerequisites (.NET SDK, Node.js, Docker)
- Set up necessary Docker containers (SQL Server, Redis)
- Configure development settings

### Step 3: Start the Development Environment

We've simplified the process of starting all components with a single command:

```powershell
.\start-dev-environment.bat
```

### Step 4: Start Coding!

Once your environment is running, you can:

- Access the API at: http://localhost:5000
- Access Swagger docs at: http://localhost:5000/swagger
- Access the Frontend at: http://localhost:4200

## Project Structure

### Backend (.NET 8)

Our backend follows Clean Architecture principles:

```
EYExpenseManager/
├── EYExpenseManager.API        - Web API controllers, configuration
├── EYExpenseManager.Application - Services, DTOs, business logic
├── EYExpenseManager.Core        - Domain entities, interfaces
└── EYExpenseManager.Infrastructure - Data access, repositories
```

Key concepts:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic
- **Repositories**: Handle data access
- **Entities**: Domain models that represent business objects

### Frontend (Angular 19)

The Angular frontend is organized as follows:

```
ey-expense-manager-ui/
├── src/
│   ├── app/
│   │   ├── components/       - Reusable UI components
│   │   ├── guards/           - Route guards for authentication
│   │   ├── models/           - TypeScript interfaces
│   │   ├── services/         - API services and business logic
│   │   └── shared/           - Shared modules and components
│   ├── assets/               - Static assets (images, fonts)
│   └── environments/         - Environment-specific configuration
```

## Development Workflow

We follow a Git Flow workflow:

1. Create a feature branch from `main`: 
   ```
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, ensuring:
   - Code follows our style guidelines
   - Tests are written for new functionality
   - Changes are documented

3. Commit with meaningful messages:
   ```
   git commit -m "feat: add expense filtering capability"
   ```

4. Create a pull request to `main`

5. After code review and approval, merge to `main`

## Testing Your Changes

### Backend Testing

```powershell
cd EYExpenseManager
dotnet test
```

### Frontend Testing

```powershell
cd ey-expense-manager-ui
npm test
```

## DevOps Environment

We have a full DevOps environment that includes:

- **Jenkins**: CI/CD pipeline automation
- **SonarQube**: Code quality analysis
- **Grafana/Prometheus**: Monitoring
- **Seq**: Centralized logging

Start the DevOps environment:

```powershell
.\start-devops-environment.bat
```

This will make the following services available:
- Jenkins: http://localhost:8080
- SonarQube: http://localhost:9000
- Grafana: http://localhost:3000
- Seq: http://localhost:5341

## GitHub Integration

The project uses GitHub for source control. If you need to push changes to GitHub:

```powershell
# For PowerShell users
.\scripts\push-to-github.ps1

# For Bash users
./scripts/push-to-github.sh
```

Or simply run the batch file:

```powershell
.\push-to-github.bat
```

This script will:
1. Initialize Git if needed
2. Configure Git user settings
3. Set up .gitignore file
4. Add/update remote repository
5. Commit and push changes
6. Configure Jenkins to use the GitHub repository (optional)

## Jenkins Setup with GitHub

To connect Jenkins with GitHub:

1. Open Jenkins at http://localhost:8080
2. Log in with your credentials (typically AdminFiras)
3. Create a new pipeline job or update the existing one:
   - Select "Pipeline script from SCM"
   - SCM: Git
   - Repository URL: https://github.com/lmatoussi/Gestion-et-Suivi-des-Missions-AVA-EY.git
   - Branch: */main
   - Script Path: Jenkinsfile
4. Save and run the pipeline

For detailed integration with SonarQube, see `docs/sonarqube-github-integration.md`

## Common Tasks

### Adding a New API Endpoint

1. Create a DTO in `EYExpenseManager.Application/DTOs`
2. Add validation in `EYExpenseManager.Application/Validators`
3. Implement service in `EYExpenseManager.Application/Services`
4. Create controller action in `EYExpenseManager.API/Controllers`

### Adding a New Angular Component

1. Generate component:
   ```
   ng generate component components/your-component-name
   ```

2. Add routing in `app-routing.module.ts`
3. Create service if needed:
   ```
   ng generate service services/your-service-name
   ```

### Database Migrations

To create a new migration:

```powershell
cd EYExpenseManager
dotnet ef migrations add MigrationName -p EYExpenseManager.Infrastructure -s EYExpenseManager.API
dotnet ef database update -p EYExpenseManager.Infrastructure -s EYExpenseManager.API
```

## Helpful Resources

- [.NET Documentation](https://docs.microsoft.com/en-us/dotnet/)
- [Angular Documentation](https://angular.io/docs)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)
- [Material UI Components](https://material.angular.io/components/categories)
- [Docker Documentation](https://docs.docker.com/)

## Getting Help

If you encounter any issues:

1. Check our project documentation in the `docs` folder
2. Ask in the team's Slack channel: #ey-expense-manager
3. Contact the team lead or DevOps engineer

Welcome to the team! We're excited to have you contribute to this project.
