#!/bin/bash
# scripts/install-devops-tools.sh

echo "=== Creating DevOps Tools Configuration ==="

# Create docker directory
mkdir -p /vagrant/docker

# Create Docker Compose file for DevOps tools
cat > /vagrant/docker/devops-compose.yml << 'EOF'
version: '3.8'

services:
  # Jenkins
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=false
    user: root

  # SonarQube
  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      - SONARQUBE_JDBC_URL=jdbc:postgresql://postgres:5432/sonarqube
      - SONARQUBE_JDBC_USERNAME=sonarqube
      - SONARQUBE_JDBC_PASSWORD=sonarqube
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions
    depends_on:
      - postgres

  # PostgreSQL for SonarQube
  postgres:
    image: postgres:15
    container_name: postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=sonarqube
      - POSTGRES_PASSWORD=sonarqube
      - POSTGRES_DB=sonarqube
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # SQL Server
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sqlserver
    restart: unless-stopped
    ports:
      - "1433:1433"
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password123
      - MSSQL_PID=Express
    volumes:
      - sqlserver_data:/var/opt/mssql

  # Redis
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Seq (Logging)
  seq:
    image: datalust/seq:latest
    container_name: seq
    restart: unless-stopped
    ports:
      - "5341:80"
    environment:
      - ACCEPT_EULA=Y
    volumes:
      - seq_data:/data

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana

  # Portainer
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  jenkins_home:
  sonarqube_data:
  sonarqube_logs:
  sonarqube_extensions:
  postgres_data:
  sqlserver_data:
  redis_data:
  seq_data:
  prometheus_data:
  grafana_data:
  portainer_data:

networks:
  default:
    name: devops-network
EOF

# Create Prometheus configuration
cat > /vagrant/docker/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  - job_name: 'grafana'
    static_configs:
      - targets: ['grafana:3000']
EOF

echo "=== DevOps tools configuration created ==="