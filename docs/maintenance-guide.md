# EY Expense Manager Maintenance Guide

This document provides step-by-step instructions for common maintenance tasks for the EY Expense Manager application.

## Daily Maintenance Tasks

### 1. Check System Health

```powershell
# Check container status
docker ps -a

# Check container logs for errors
docker logs eyexpensemanager-api --tail 100
docker logs eyexpensemanager-ui --tail 100

# Check disk space
Get-PSDrive C
```

### 2. Backup Database

```powershell
# Create a backup of the SQL Server database
$backupDate = Get-Date -Format "yyyyMMdd"
docker exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "YourStrong@Password123" -Q "BACKUP DATABASE EYExpenseDB TO DISK = N'/var/opt/mssql/data/EYExpenseDB-$backupDate.bak' WITH NOFORMAT, NOINIT, NAME = 'EYExpenseDB-Full', SKIP, NOREWIND, NOUNLOAD, STATS = 10"

# Copy backup file to host
docker cp sqlserver:/var/opt/mssql/data/EYExpenseDB-$backupDate.bak .
```

## Weekly Maintenance Tasks

### 1. Update Docker Images

```powershell
# Pull latest base images
docker-compose -f docker-compose.dev.yml pull

# Rebuild application images
cd C:\Users\PC\Desktop\devops-Projet-Gestion-Missions\EYExpenseManager
docker build -t yourdockerhub/eyexpensemanager-api:latest -f Dockerfile .

cd C:\Users\PC\Desktop\devops-Projet-Gestion-Missions\ey-expense-manager-ui
docker build -t yourdockerhub/eyexpensemanager-ui:latest -f Dockerfile .

# Restart services with new images
cd C:\Users\PC\Desktop\devops-Projet-Gestion-Missions
docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml up -d
```

### 2. Clean Up Unused Resources

```powershell
# Prune unused Docker resources
docker system prune -a --volumes

# Clean up old backups (keep last 4 weeks only)
$backupDir = "path\to\backups"
$cutoffDate = (Get-Date).AddDays(-28)

Get-ChildItem -Path $backupDir -Filter "EYExpenseDB-*.bak" | Where-Object {
    $_.CreationTime -lt $cutoffDate
} | Remove-Item -Force
```

## Monthly Maintenance Tasks

### 1. Security Updates

```powershell
# Update base OS packages in containers
docker exec eyexpensemanager-api apt-get update && apt-get upgrade -y
docker exec eyexpensemanager-ui apk update && apk upgrade

# Restart containers after updates
docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml restart
```

### 2. Review and Rotate Credentials

1. Update database credentials:
   - Connect to SQL Server and update user passwords
   - Update connection strings in application settings

2. Update JWT secret:
   - Generate new secret
   - Update in appsettings.json files
   - Restart API container

3. Update API keys for external services:
   - Google Authentication
   - Email service
   - Seq logging

## Troubleshooting Common Issues

### Database Connection Issues

```powershell
# Check if SQL Server container is running
docker ps | findstr sqlserver

# Check SQL Server logs
docker logs sqlserver

# Test connection from API container
docker exec eyexpensemanager-api dotnet ef database --connection "Server=sqlserver;Database=EYExpenseDB;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=True;" list
```

### Frontend Not Loading

```powershell
# Check UI container logs
docker logs eyexpensemanager-ui

# Verify nginx configuration
docker exec eyexpensemanager-ui cat /etc/nginx/conf.d/default.conf

# Test connectivity from UI to API
docker exec eyexpensemanager-ui wget -qO- eyexpensemanager-api:80/health
```

### Jenkins Pipeline Failures

```powershell
# Check Jenkins container logs
docker logs jenkins

# Verify Jenkins plugins are up to date
docker exec jenkins jenkins-cli list-plugins

# Clear Jenkins workspace
docker exec jenkins rm -rf /var/jenkins_home/workspace/*
```

## Scaling the Application

To scale the application for increased load:

```powershell
# Scale up API instances
docker-compose -f docker-compose.dev.yml -f docker-compose.override.yml up -d --scale eyexpensemanager-api=3

# Add a load balancer in front of the API instances
# Example for simple nginx load balancer config:
```

```nginx
upstream api-backend {
    server eyexpensemanager-api:80;
    server eyexpensemanager-api:80;
    server eyexpensemanager-api:80;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://api-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Performance Tuning

### .NET Backend Optimization

1. Update `appsettings.json` for production performance:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=sqlserver;Database=EYExpenseDB;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=True;Max Pool Size=100;Min Pool Size=10;"
  },
  "Caching": {
    "RedisConfiguration": "redis:6379",
    "DefaultCacheTimeMinutes": 60
  }
}
```

2. Add response compression middleware:

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<GzipCompressionProvider>();
});

// In the middleware pipeline
app.UseResponseCompression();
```

### SQL Server Optimization

```sql
-- Example query to identify slow queries
SELECT TOP 10
    total_worker_time/execution_count AS avg_cpu_time,
    total_logical_reads/execution_count AS avg_logical_reads,
    total_elapsed_time/execution_count AS avg_elapsed_time,
    execution_count,
    SUBSTRING(st.text, (qs.statement_start_offset/2)+1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE qs.statement_end_offset
            END - qs.statement_start_offset)/2) + 1) AS statement_text
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
ORDER BY total_worker_time/execution_count DESC;
```
