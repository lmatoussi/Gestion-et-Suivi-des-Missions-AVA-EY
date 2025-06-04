# EY Expense Manager DevOps - Getting Started Guide

This guide provides simple steps to get your DevOps environment up and running.

## Step 1: Start Docker Desktop

Ensure Docker Desktop is running on your machine.

## Step 2: Start the DevOps Environment

Open a PowerShell terminal and run:

```powershell
cd C:\Users\PC\Desktop\devops-Projet-Gestion-Missions
.\start-devops-environment.bat
```

This will start:
- Jenkins (CI/CD server)
- SonarQube (code quality)
- Grafana (dashboards)
- Prometheus (metrics)
- Seq (logging)
- SQL Server (database)
- Redis (caching)

## Step 3: Access the Tools

After everything starts, you can access the tools at:
- Jenkins: http://localhost:8080
- SonarQube: http://localhost:9000
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Seq: http://localhost:5341
- Portainer: https://localhost:9443

## Step 4: Start the Application

To start the application in development mode:

```powershell
.\start-dev-environment.bat
```

This will start:
- .NET API at http://localhost:5000
- Angular UI at http://localhost:4200

## Step 5: Configure Jenkins Pipeline

1. Go to Jenkins at http://localhost:8080
2. Log in with the credentials you created
3. Create a new pipeline job for the project
4. Configure it to use the Jenkinsfile from your repository

## Step 6: Push Changes and Watch the Pipeline

1. Make changes to your code
2. Commit and push to your Git repository
3. Watch the Jenkins pipeline execute automatically
4. View code quality results in SonarQube
5. Monitor application performance in Grafana

## Need Help?

Refer to the detailed documentation in the docs folder:
- `docs/devops-workflow-guide.md`: Complete DevOps workflow
- `docs/devops-runbook.md`: Maintenance and troubleshooting
- `docs/monitoring-instructions.md`: Set up application monitoring
- `docs/production-deployment-guide.md`: Deploy to production
- `docs/maintenance-guide.md`: Regular maintenance tasks
- `docs/quickstart-guide.md`: Guide for new team members
