# EY Expense Manager Production Deployment Guide

This guide provides step-by-step instructions for deploying the EY Expense Manager application to a production environment.

## Prerequisites

- Docker and Docker Compose installed on the production server
- Access to a Docker registry (Docker Hub or private registry)
- SSL certificates for production domains
- Required environment variables and secrets for production

## Step 1: Prepare Production Configuration

### Create Production Docker Compose File

Create a file named `docker-compose.prod.yml` with the following content:

```yaml
version: '3.8'

services:
  # Backend API
  eyexpensemanager-api:
    image: yourdockerhub/eyexpensemanager-api:latest
    container_name: eyexpensemanager-api
    restart: unless-stopped
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Server=sqlserver;Database=EYExpenseDB;User Id=${DB_USER};Password=${DB_PASSWORD};TrustServerCertificate=True;
      - ConnectionStrings__Redis=redis:6379
      - Authentication__JwtSecret=${JWT_SECRET}
      - Authentication__GoogleClientId=${GOOGLE_CLIENT_ID}
      - Authentication__GoogleClientSecret=${GOOGLE_CLIENT_SECRET}
      - EmailSettings__SmtpPassword=${SMTP_PASSWORD}
    volumes:
      - api_storage:/app/Storage
    depends_on:
      - sqlserver
      - redis
    networks:
      - app-network

  # Frontend UI
  eyexpensemanager-ui:
    image: yourdockerhub/eyexpensemanager-ui:latest
    container_name: eyexpensemanager-ui
    restart: unless-stopped
    depends_on:
      - eyexpensemanager-api
    networks:
      - app-network

  # SQL Server
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sqlserver
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=${DB_PASSWORD}
      - MSSQL_PID=Developer
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - app-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - app-network

  # Seq (logging)
  seq:
    image: datalust/seq:latest
    container_name: seq
    restart: unless-stopped
    environment:
      - ACCEPT_EULA=Y
    volumes:
      - seq_data:/data
    networks:
      - app-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/www:/var/www/html
    depends_on:
      - eyexpensemanager-api
      - eyexpensemanager-ui
    networks:
      - app-network

volumes:
  api_storage:
  sqlserver_data:
  redis_data:
  seq_data:

networks:
  app-network:
    driver: bridge
```

### Create Production Environment File

Create a file named `.env.prod` with the following content:

```
DB_USER=sa
DB_PASSWORD=YourStrongProductionPassword123!
JWT_SECRET=YourSuperSecretProductionKey2025@#$
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SMTP_PASSWORD=your-smtp-password
```

### Create Nginx Configuration for Production

Create a directory `nginx/conf` and add a file named `default.conf`:

```nginx
server {
    listen 80;
    server_name expense.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name expense.yourcompany.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend app
    location / {
        proxy_pass http://eyexpensemanager-ui:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://eyexpensemanager-api:80/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Prevent access to .htaccess files
    location ~ /\.ht {
        deny all;
    }
}
```

## Step 2: Deploy to Production

1. Copy the following files to your production server:
   - docker-compose.prod.yml
   - .env.prod
   - nginx/ directory with configuration

2. Pull the Docker images:

```bash
docker-compose -f docker-compose.prod.yml pull
```

3. Start the services:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

4. Initialize the database (first time deployment only):

```bash
docker exec -it eyexpensemanager-api dotnet ef database update
```

5. Verify the deployment:

```bash
docker-compose -f docker-compose.prod.yml ps
```

## Step 3: Secure the Production Environment

### Set Up SSL with Let's Encrypt

If you don't have SSL certificates yet, you can use Let's Encrypt:

```bash
# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Generate certificates
certbot --nginx -d expense.yourcompany.com

# Copy certificates to nginx/ssl directory
cp /etc/letsencrypt/live/expense.yourcompany.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/expense.yourcompany.com/privkey.pem nginx/ssl/

# Set proper permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### Configure Firewall

```bash
# Allow only needed ports
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

## Step 4: Set Up Monitoring and Alerts

### Set Up Production Monitoring

Deploy production monitoring tools:

```bash
# Create monitoring directory
mkdir -p monitoring

# Create docker-compose.monitoring.yml for production monitoring
cat > monitoring/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - monitoring-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - monitoring-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    volumes:
      - ./alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring-network

networks:
  monitoring-network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
EOF

# Create prometheus configuration
mkdir -p monitoring/prometheus
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'eyexpensemanager-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['eyexpensemanager-api:80']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

# Create alert rules
cat > monitoring/prometheus/alert_rules.yml << 'EOF'
groups:
- name: targets
  rules:
  - alert: InstanceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} down"
      description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."

- name: host
  rules:
  - alert: HighCPULoad
    expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU load on {{ $labels.instance }}"
      description: "CPU load is > 80% for 5 minutes."
      
  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on {{ $labels.instance }}"
      description: "Memory usage is > 85% for 5 minutes."
EOF

# Create alertmanager configuration
mkdir -p monitoring/alertmanager
cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourcompany.com'
  smtp_auth_username: 'alerts@yourcompany.com'
  smtp_auth_password: '${SMTP_PASSWORD}'
  smtp_require_tls: true

route:
  group_by: ['alertname', 'instance', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'email-notifications'
  routes:
  - match:
      severity: critical
    receiver: 'email-notifications'
    continue: true

receivers:
- name: 'email-notifications'
  email_configs:
  - to: 'devops@yourcompany.com'
    send_resolved: true
EOF

# Start monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

## Step 5: Configure Backup Strategy

Create a backup script:

```bash
#!/bin/bash
# backup-production.sh

# Set variables
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d-%H%M)
DB_CONTAINER="sqlserver"
DB_NAME="EYExpenseDB"
DB_USER="sa"
DB_PASSWORD="${DB_PASSWORD}"

# Create backup directories if they don't exist
mkdir -p $BACKUP_DIR/database
mkdir -p $BACKUP_DIR/storage

# Backup SQL Server database
echo "Backing up database..."
docker exec $DB_CONTAINER /opt/mssql-tools/bin/sqlcmd -S localhost \
  -U $DB_USER -P $DB_PASSWORD \
  -Q "BACKUP DATABASE [$DB_NAME] TO DISK = N'/var/opt/mssql/data/$DB_NAME-$DATE.bak' WITH NOFORMAT, NOINIT, NAME = '$DB_NAME-$DATE', SKIP, NOREWIND, NOUNLOAD, STATS = 10"

# Copy backup file to host
docker cp $DB_CONTAINER:/var/opt/mssql/data/$DB_NAME-$DATE.bak $BACKUP_DIR/database/

# Backup application storage
echo "Backing up storage..."
docker run --rm --volumes-from eyexpensemanager-api -v $BACKUP_DIR/storage:/backup ubuntu tar czf /backup/storage-$DATE.tar.gz /app/Storage

# Remove backups older than 30 days
find $BACKUP_DIR -type f -name "*.bak" -mtime +30 -delete
find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $(date)"
```

Make the backup script executable:

```bash
chmod +x backup-production.sh
```

Add a cron job to run the backup daily:

```bash
crontab -e
```

Add this line:

```
0 2 * * * /path/to/backup-production.sh > /var/log/backup.log 2>&1
```

## Step 6: Production Rollback Procedure

In case you need to rollback to a previous version:

```bash
# Stop current services
docker-compose -f docker-compose.prod.yml down

# Pull the previous version
docker pull yourdockerhub/eyexpensemanager-api:previous
docker pull yourdockerhub/eyexpensemanager-ui:previous

# Tag as latest
docker tag yourdockerhub/eyexpensemanager-api:previous yourdockerhub/eyexpensemanager-api:latest
docker tag yourdockerhub/eyexpensemanager-ui:previous yourdockerhub/eyexpensemanager-ui:latest

# Start services with previous version
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Step 7: Verify Production Deployment

After deployment, perform these verification steps:

1. Check that all containers are running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Verify the API is accessible:
   ```bash
   curl -k https://expense.yourcompany.com/api/health
   ```

3. Check application logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=100 eyexpensemanager-api
   ```

4. Verify the frontend is working:
   - Open https://expense.yourcompany.com in a browser
   - Test login functionality
   - Verify core features are working

5. Check monitoring:
   - Access Grafana dashboard
   - Verify metrics are being collected
   - Test alert notifications
