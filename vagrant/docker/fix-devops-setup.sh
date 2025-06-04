#!/bin/bash
# Fix DevOps Setup - Configure DevOps Tools and Setup Environment

echo "=== EY Expense Manager DevOps Environment Setup ==="

# First, let's check current status
echo "Current directory: $(pwd)"
echo "Files in /vagrant:"
ls -la /vagrant/

# Create the docker directory if it doesn't exist
sudo mkdir -p /vagrant/docker
sudo mkdir -p /vagrant/docker/prometheus
sudo mkdir -p /vagrant/docker/grafana/dashboards
sudo mkdir -p /vagrant/docker/grafana/provisioning/dashboards
sudo mkdir -p /vagrant/docker/grafana/provisioning/datasources
sudo mkdir -p /vagrant/docker/nginx

echo "=== Creating Docker Compose file ==="

# Create the devops-compose.yml file
sudo tee /vagrant/docker/devops-compose.yml > /dev/null << 'EOF'
version: '3.8'

services:
  # Jenkins with .NET support
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_data:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
      - /usr/bin/docker:/usr/bin/docker
    environment:
      - JENKINS_OPTS="--httpPort=8080"
      - JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Xmx1024m"
    user: root
    networks:
      - devops-network

  # SonarQube for .NET code analysis
  sonarqube:
    image: sonarqube:community
    container_name: sonarqube
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://postgres:5432/sonarqube
      - SONAR_JDBC_USERNAME=sonarqube
      - SONAR_JDBC_PASSWORD=sonarqube123
      - SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true
      - SONAR_WEB_JAVAADDITIONALOPTS=-Xmx1024m
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
      - sonarqube_extensions:/opt/sonarqube/extensions
    depends_on:
      - postgres
    networks:
      - devops-network

  # PostgreSQL for SonarQube
  postgres:
    image: postgres:15
    container_name: postgres-sonar
    restart: unless-stopped
    environment:
      - POSTGRES_USER=sonarqube
      - POSTGRES_PASSWORD=sonarqube123
      - POSTGRES_DB=sonarqube
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "15432:5432"
    networks:
      - devops-network

  # SQL Server for .NET applications
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sqlserver
    restart: unless-stopped
    ports:
      - "11433:1433"
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password123
      - MSSQL_PID=Developer
    volumes:
      - sqlserver_data:/var/opt/mssql
    networks:
      - devops-network

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - devops-network

  # Seq for .NET logging
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
    networks:
      - devops-network

  # Prometheus for monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - devops-network

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - devops-network

  # Portainer for Docker management
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - devops-network

volumes:
  jenkins_data:
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
  devops-network:
    driver: bridge
EOF

echo "=== Creating Prometheus configuration ==="

sudo tee /vagrant/docker/prometheus/prometheus.yml > /dev/null << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'jenkins'
    static_configs:
      - targets: ['jenkins:8080']
    metrics_path: '/prometheus'

  - job_name: 'sonarqube'
    static_configs:
      - targets: ['sonarqube:9000']

  - job_name: 'dotnet-app'
    static_configs:
      - targets: ['host.docker.internal:5000']
    scrape_interval: 10s

  - job_name: 'angular-app'
    static_configs:
      - targets: ['host.docker.internal:4200']
    scrape_interval: 10s

  - job_name: 'sqlserver'
    static_configs:
      - targets: ['sqlserver:1433']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

echo "=== Creating Grafana configuration ==="

# Grafana datasources configuration
sudo tee /vagrant/docker/grafana/provisioning/datasources/datasources.yml > /dev/null << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Seq
    type: seq
    access: proxy
    url: http://seq:80
    editable: true
EOF

# Grafana dashboards configuration
sudo tee /vagrant/docker/grafana/provisioning/dashboards/dashboards.yml > /dev/null << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create Nginx configuration for reverse proxy
sudo tee /vagrant/docker/nginx/nginx.conf > /dev/null << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream jenkins {
        server jenkins:8080;
    }

    upstream sonarqube {
        server sonarqube:9000;
    }

    upstream grafana {
        server grafana:3000;
    }

    server {
        listen 80;
        server_name localhost;

        location / {
            return 301 /jenkins;
        }

        location /jenkins {
            proxy_pass http://jenkins;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /sonar {
            proxy_pass http://sonarqube;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /grafana {
            proxy_pass http://grafana;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

echo "=== Setting correct permissions ==="
sudo chown -R vagrant:vagrant /vagrant/docker
sudo chmod -R 755 /vagrant/docker

echo "=== Files created successfully! ==="
echo "Created files:"
ls -la /vagrant/docker/
echo ""
echo "Prometheus config:"
ls -la /vagrant/docker/prometheus/
echo ""
echo "Grafana config:"
ls -la /vagrant/docker/grafana/provisioning/

echo "=== Now starting Docker services ==="
cd /vagrant/docker
sudo docker compose -f devops-compose.yml up -d

echo "=== Waiting for services to start ==="
sleep 30

echo "=== Checking container status ==="
sudo docker ps -a

echo "=== Setting up Jenkins ==="
# Wait for Jenkins to fully start
echo "Waiting for Jenkins to start..."
until sudo docker exec jenkins curl -s -f http://localhost:8080 > /dev/null || [ $? -eq 22 ]; do
    echo "Still waiting for Jenkins to start..."
    sleep 10
done

# Install required plugins
echo "Installing Jenkins plugins..."
sudo docker exec jenkins sh -c 'jenkins-plugin-cli --plugins docker-workflow:1.29 git:4.14.3 sonar:2.15 \
    blueocean:1.27.0 pipeline-stage-view:2.33 ws-cleanup:0.45 \
    dotnet-sdk:1.1.2 nodejs:1.6.0 kubernetes:3970.vcf0a_a_faef37f'

# Set up .NET SDK in Jenkins
echo "Setting up .NET SDK in Jenkins..."
sudo docker exec jenkins sh -c 'apt-get update && apt-get install -y wget apt-transport-https && \
    wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y dotnet-sdk-8.0'

# Set up Node.js in Jenkins
echo "Setting up Node.js in Jenkins..."
sudo docker exec jenkins sh -c 'curl -sL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs'

# Install SonarScanner for .NET
echo "Installing SonarScanner for .NET..."
sudo docker exec jenkins sh -c 'dotnet tool install --global dotnet-sonarscanner'

# Install SonarScanner for JavaScript
echo "Installing SonarScanner for JavaScript..."
sudo docker exec jenkins sh -c 'npm install -g sonarqube-scanner'

echo "=== Setting up SonarQube ==="
# Wait for SonarQube to start
echo "Waiting for SonarQube to start..."
until sudo docker exec sonarqube curl -s -f http://localhost:9000/api/system/status | grep -q '"status":"UP"'; do
    echo "Still waiting for SonarQube to start..."
    sleep 10
done

# Create projects for our application
echo "Creating SonarQube projects..."
sudo docker exec sonarqube curl -s -u admin:admin -X POST "http://localhost:9000/api/projects/create" \
    -d "name=EYExpenseManager&project=EYExpenseManager"
sudo docker exec sonarqube curl -s -u admin:admin -X POST "http://localhost:9000/api/projects/create" \
    -d "name=EYExpenseManagerUI&project=EYExpenseManagerUI"

echo "=== Setup completed! ==="
echo ""
echo "Access URLs:"
echo "Jenkins: http://localhost:8080 or http://192.168.56.10:8080"
echo "SonarQube: http://localhost:9000 or http://192.168.56.10:9000" 
echo "Grafana: http://localhost:3000 or http://192.168.56.10:3000"
echo "Portainer: https://localhost:9443 or https://192.168.56.10:9443"
echo "SQL Server: localhost,11433 (sa/YourStrong@Password123)"
echo "Redis: localhost:6379"
echo "Seq: http://localhost:5341 or http://192.168.56.10:5341"
echo ""
echo "To get Jenkins initial password:"
echo "sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"
