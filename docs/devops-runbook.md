# EY Expense Manager DevOps Runbook

## Introduction

This runbook provides step-by-step instructions for maintaining, troubleshooting, and extending the DevOps environment for the EY Expense Manager application. It is intended for DevOps engineers, system administrators, and developers who are responsible for the infrastructure.

## Environment Overview

Our DevOps environment consists of several containerized services:

- **Jenkins**: CI/CD automation server
- **SonarQube**: Code quality and security analysis
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Metrics visualization and dashboarding
- **SQL Server**: Database for the application
- **Redis**: Caching server
- **Seq**: Centralized logging
- **Portainer**: Docker container management

## Regular Maintenance Tasks

### Daily Tasks

1. **Check CI/CD Pipeline Status**
   ```powershell
   # Check Jenkins job status
   docker exec -it jenkins curl -s http://localhost:8080/api/json?tree=jobs[name,color]
   ```

2. **Monitor System Resources**
   ```powershell
   # Check container resource usage
   docker stats --no-stream
   ```

3. **Review Application Logs**
   - Access Seq at http://localhost:5341
   - Filter for any ERROR or WARNING level logs

### Weekly Tasks

1. **Update Docker Images**
   ```powershell
   # Pull the latest versions of our base images
   docker-compose -f vagrant\docker\devops-compose.yml pull
   # Restart the services with new images
   docker-compose -f vagrant\docker\devops-compose.yml up -d
   ```

2. **Backup Critical Data**
   ```powershell
   # Backup Jenkins data
   docker run --rm -v jenkins_data:/source -v "$PWD/backups:/backup" ubuntu tar -czvf /backup/jenkins-backup-$(date +%Y%m%d).tar.gz /source

   # Backup SonarQube data
   docker run --rm -v sonarqube_data:/source -v "$PWD/backups:/backup" ubuntu tar -czvf /backup/sonarqube-data-backup-$(date +%Y%m%d).tar.gz /source
   docker run --rm -v sonarqube_extensions:/source -v "$PWD/backups:/backup" ubuntu tar -czvf /backup/sonarqube-extensions-backup-$(date +%Y%m%d).tar.gz /source

   # Backup SQL Server data (using SQL backup within container)
   docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Password123" -Q "BACKUP DATABASE EYExpenseDB TO DISK = N'/var/opt/mssql/backup/EYExpenseDB-$(date +%Y%m%d).bak' WITH NOFORMAT, NOINIT, NAME = 'EYExpenseDB-Full', SKIP, NOREWIND, NOUNLOAD, STATS = 10"
   ```

3. **Check for Security Updates**
   ```powershell
   # Check for vulnerabilities in containers
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image jenkins/jenkins:lts
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image sonarqube:community
   ```

### Monthly Tasks

1. **Review and Rotate Access Credentials**
   - Update SonarQube admin password
   - Rotate Jenkins API tokens
   - Update database credentials

2. **Test Disaster Recovery**
   ```powershell
   # Test restoring Jenkins from backup
   docker-compose -f vagrant\docker\devops-compose.yml stop jenkins
   docker volume rm jenkins_data
   docker volume create jenkins_data
   docker run --rm -v jenkins_data:/target -v "$PWD/backups:/backup" ubuntu tar -xzvf /backup/jenkins-backup-YYYYMMDD.tar.gz -C /target
   docker-compose -f vagrant\docker\devops-compose.yml start jenkins
   ```

3. **Clean Up Old Data**
   ```powershell
   # Cleanup old Docker images
   docker image prune -a --filter "until=720h"
   
   # Cleanup old backups (keep last 3 months)
   Get-ChildItem -Path .\backups\* -File | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-90)} | Remove-Item -Force
   ```

## Troubleshooting Guide

### Jenkins Issues

#### Problem: Pipeline jobs failing
1. **Check Jenkins logs**
   ```powershell
   docker logs jenkins
   ```

2. **Verify Jenkins plugins**
   - Navigate to http://localhost:8080/pluginManager/
   - Ensure all required plugins are installed and up-to-date

3. **Check agent connectivity**
   - For agents, verify they can connect to the Jenkins master
   - Check network configuration between containers

#### Problem: Jenkins slow or unresponsive
1. **Check resource usage**
   ```powershell
   docker stats jenkins
   ```

2. **Increase allocated memory**
   - Update the `JAVA_OPTS` environment variable in devops-compose.yml
   - Restart Jenkins: `docker-compose -f vagrant\docker\devops-compose.yml restart jenkins`

### SonarQube Issues

#### Problem: Analysis failing
1. **Check SonarQube logs**
   ```powershell
   docker logs sonarqube
   ```

2. **Verify database connection**
   - Check PostgreSQL container is running: `docker ps | grep postgres`
   - Verify connection settings in SonarQube configuration

#### Problem: Database errors
1. **Check PostgreSQL logs**
   ```powershell
   docker logs postgres-sonar
   ```

2. **Run database maintenance**
   ```powershell
   docker exec -it postgres-sonar psql -U sonarqube -c "VACUUM ANALYZE;"
   ```

### Docker Issues

#### Problem: Container not starting
1. **Check container logs**
   ```powershell
   docker logs <container_name>
   ```

2. **Inspect container status**
   ```powershell
   docker inspect <container_name>
   ```

3. **Check for port conflicts**
   ```powershell
   netstat -aon | findstr :<port_number>
   ```

#### Problem: Volume mount issues
1. **Check volume mappings**
   ```powershell
   docker volume ls
   docker volume inspect <volume_name>
   ```

2. **Recreate problematic volumes**
   ```powershell
   docker-compose -f vagrant\docker\devops-compose.yml down
   docker volume rm <problematic_volume>
   docker-compose -f vagrant\docker\devops-compose.yml up -d
   ```

## Extending the Environment

### Adding New Jenkins Agents

1. Create a new agent configuration:
   ```powershell
   # Connect to Jenkins container
   docker exec -it jenkins bash
   
   # Create a new agent configuration
   jenkins-cli create-node <agent_name> < agent-config.xml
   ```

2. Example agent-config.xml:
   ```xml
   <slave>
     <name>dotnet-agent</name>
     <description>Agent for .NET builds</description>
     <remoteFS>/home/jenkins</remoteFS>
     <numExecutors>2</numExecutors>
     <mode>EXCLUSIVE</mode>
     <retentionStrategy class="hudson.slaves.RetentionStrategy$Always"/>
     <launcher class="hudson.slaves.JNLPLauncher"/>
     <label>dotnet</label>
     <nodeProperties/>
   </slave>
   ```

### Adding New Grafana Dashboards

1. Create a new JSON dashboard definition in vagrant/docker/grafana/dashboards/
2. Update provisioning configuration in vagrant/docker/grafana/provisioning/dashboards/
3. Restart Grafana:
   ```powershell
   docker-compose -f vagrant\docker\devops-compose.yml restart grafana
   ```

### Integrating New Tools

To add a new tool to the DevOps environment:

1. Add the service definition to devops-compose.yml:
   ```yaml
   new-tool:
     image: new-tool:latest
     container_name: new-tool
     restart: unless-stopped
     ports:
       - "8888:8888"
     volumes:
       - new_tool_data:/data
     networks:
       - devops-network
   ```

2. Create any necessary configuration files
3. Add a new volume definition:
   ```yaml
   volumes:
     new_tool_data:
   ```

4. Update the startup scripts and documentation
5. Deploy the updated environment:
   ```powershell
   docker-compose -f vagrant\docker\devops-compose.yml up -d
   ```

## Security Considerations

1. **Container Security Best Practices**
   - Run containers with minimal permissions
   - Use non-root users inside containers when possible
   - Keep base images updated

2. **Network Security**
   - Only expose necessary ports
   - Use Docker networks to isolate services
   - Consider using a reverse proxy with HTTPS for external access

3. **Secrets Management**
   - Rotate credentials regularly
   - Use environment variables or a secrets management tool instead of hardcoded credentials
   - Consider implementing HashiCorp Vault for production environments

## Monitoring and Alerting

### Setting Up Alerts in Prometheus

1. Add alert rules to /vagrant/docker/prometheus/alerts.yml:
   ```yaml
   groups:
   - name: example
     rules:
     - alert: HighMemoryUsage
       expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.8
       for: 5m
       labels:
         severity: warning
       annotations:
         summary: High memory usage
         description: Memory usage is above 80% for 5 minutes.
   ```

2. Update prometheus.yml to include alerts:
   ```yaml
   rule_files:
     - "alerts.yml"
   ```

3. Restart Prometheus:
   ```powershell
   docker-compose -f vagrant\docker\devops-compose.yml restart prometheus
   ```

### Setting Up Email Notifications

1. Configure Grafana SMTP settings in grafana.ini
2. Create notification channels in Grafana UI
3. Add alerts to dashboards and link to notification channels

## References

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Documentation](https://docs.docker.com/)
- [SonarQube Documentation](https://docs.sonarqube.org/latest/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Seq Documentation](https://docs.datalust.co/docs)
