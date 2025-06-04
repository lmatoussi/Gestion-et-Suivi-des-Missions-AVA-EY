# EY Expense Manager DevOps Implementation Guide

## Architecture Overview

Our DevOps implementation for the EY Expense Manager project follows a hybrid approach:

1. **Local Development**: .NET 8 backend & Angular 19 frontend
2. **CI/CD Pipeline**: Jenkins with SonarQube code quality checks
3. **Container Deployment**: Docker and Docker Compose
4. **Monitoring**: Prometheus, Grafana, and Seq
5. **Infrastructure**: Managed through Vagrant/VirtualBox

## Prerequisites

- ✅ .NET 8 SDK
- ✅ Angular CLI 19
- ✅ Node.js 18+
- ✅ Docker Desktop
- ✅ VirtualBox
- ✅ Vagrant

## Getting Started

### 1. Start the DevOps Environment

```bash
# Navigate to the Vagrant directory
cd vagrant

# Start the VM
vagrant up

# SSH into the VM if needed
vagrant ssh
```

### 2. Accessing DevOps Tools

Once the environment is running, you can access the tools at:

- Jenkins: http://localhost:8080
- SonarQube: http://localhost:9000
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Seq: http://localhost:5341
- Portainer: https://localhost:9443

### 3. Setting Up Your Project in Jenkins

1. Log in to Jenkins at http://localhost:8080
2. Create a new Pipeline job
3. Configure it to use the Jenkinsfile from your Git repository
4. Run the first build

### 4. Development Workflow

#### Local Development

1. Make changes to your code
2. Run local tests
3. Commit to your Git repository

#### CI/CD Pipeline

Our Jenkins pipeline includes:

1. **Source Code Checkout**: Pulls latest code from Git
2. **Backend Pipeline**:
   - Restore dependencies
   - Build
   - Run tests
   - SonarQube analysis
   - Create Docker image
3. **Frontend Pipeline**:
   - Install dependencies
   - Build
   - Run tests
   - SonarQube analysis
   - Create Docker image
4. **Deployment**:
   - Deploy to development environment
   - Run integration tests
   - Deploy to production (manual approval)

### 5. Monitoring Your Application

We've set up several monitoring tools:

#### Application Metrics

- **Prometheus**: Collects metrics from both .NET and Angular applications
- **Grafana**: Visualizes metrics with pre-configured dashboards
  - API Metrics Dashboard: Response times, error rates, and throughput
  - Resource Metrics Dashboard: CPU, memory, and database performance

#### Logging

- **Seq**: Centralized logging for all components
  - API logs
  - Angular logs
  - Infrastructure logs

### 6. Deployment Environments

We have configured multiple environments:

1. **Development**: Automatically deployed on every successful build
   - URL: http://dev.eyexpensemanager.local
2. **Staging**: Deployed after manual approval
   - URL: http://staging.eyexpensemanager.local
3. **Production**: Deployed after thorough testing and approval
   - URL: http://eyexpensemanager.local

## Best Practices

1. **Git Workflow**:
   - Use feature branches
   - Create pull requests for code reviews
   - Squash commits before merging

2. **Testing**:
   - Write unit tests for all new features
   - Maintain at least 80% code coverage
   - Include integration tests for critical paths

3. **Security**:
   - Run security scans on dependencies
   - Follow OWASP guidelines
   - Properly manage secrets and credentials

4. **Quality**:
   - Set up SonarQube quality gates
   - Address all code smells and bugs
   - Follow consistent coding conventions

## Troubleshooting

### Common Issues

1. **Jenkins Pipeline Failures**:
   - Check console output for specific errors
   - Verify Jenkins agent has necessary tools installed
   - Check network connectivity to SonarQube and Docker registry

2. **Docker Deployment Issues**:
   - Verify Docker Compose syntax
   - Check container logs: `docker logs <container-name>`
   - Ensure environment variables are properly set

3. **Monitoring Issues**:
   - Check that your application has Prometheus metrics exposed
   - Verify Grafana datasource configuration
   - Ensure Seq is receiving logs

## Appendix

### A. Jenkins Plugins Used

- Docker Pipeline
- SonarQube Scanner
- NodeJS Plugin
- .NET SDK
- Blue Ocean
- Pipeline Utility Steps

### B. Docker Images

- jenkins/jenkins:lts (with .NET SDK)
- sonarqube:community
- grafana/grafana
- prom/prometheus
- datalust/seq
- mcr.microsoft.com/mssql/server:2022-latest
- redis:alpine

### C. Additional Resources

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Seq Documentation](https://docs.datalust.co/docs)
