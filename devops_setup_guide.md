# Complete DevOps Setup Guide - Hybrid Approach
## .NET 8 + Angular 19 with Vagrant + VirtualBox + Docker Desktop
### Optimized for Microsoft Technology Stack

---

## Phase 1: Prerequisites Installation & Verification

### 1.1 Verify Existing Tools
```bash
# Check if tools are installed
docker --version
vagrant --version
VBoxManage --version
git --version
```

### 1.2 Install Missing Prerequisites

#### Install Git (if not installed)
```bash
# Windows (using Chocolatey)
choco install git

# Or download from: https://git-scm.com/download/win
```

#### Install Node.js (for Angular development)
```bash
# Download and install Node.js 18+ from: https://nodejs.org/
# Verify installation
node --version
npm --version
```

#### Install Angular CLI
```bash
npm install -g @angular/cli@19
ng version
```

#### Install .NET 8 SDK (if not installed)
```bash
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0
# Verify installation
dotnet --version
```

#### Install Entity Framework Core Tools
```bash
dotnet tool install --global dotnet-ef
dotnet ef --version
```

#### Install NuGet CLI (Optional)
```bash
# Download from: https://www.nuget.org/downloads
# Or install via Chocolatey
choco install nuget.commandline
```

---

## Phase 2: Vagrant VM Setup for DevOps Tools

### 2.1 Create DevOps Project Structure
```bash
# Create main project directory
mkdir yourapp-devops
cd yourapp-devops

# Create directory structure
mkdir -p {vagrant,docker,jenkins,scripts,docs}
```

### 2.2 Vagrant Configuration

Create `Vagrantfile` in the root directory:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  # Use Ubuntu 22.04 LTS
  config.vm.box = "ubuntu/jammy64"
  config.vm.box_version = "20231215.0.0"

  # VM Configuration
  config.vm.hostname = "devops-vm"
  
  # Network Configuration
  config.vm.network "private_network", ip: "192.168.56.10"
  config.vm.network "forwarded_port", guest: 8080, host: 8080, id: "jenkins"
  config.vm.network "forwarded_port", guest: 9000, host: 9000, id: "sonarqube"
  config.vm.network "forwarded_port", guest: 3000, host: 3000, id: "grafana"
  config.vm.network "forwarded_port", guest: 9090, host: 9090, id: "prometheus"
  config.vm.network "forwarded_port", guest: 5601, host: 5601, id: "kibana"
  config.vm.network "forwarded_port", guest: 1433, host: 1433, id: "sqlserver"
  config.vm.network "forwarded_port", guest: 6379, host: 6379, id: "redis"
  config.vm.network "forwarded_port", guest: 5432, host: 5432, id: "postgres"

  # VirtualBox Provider Configuration
  config.vm.provider "virtualbox" do |vb|
    vb.name = "DevOps-Tools-VM"
    vb.memory = "8192"  # 8GB RAM (adjust based on your system)
    vb.cpus = 4         # 4 CPU cores (adjust based on your system)
    vb.gui = false
    
    # Enable virtualization features
    vb.customize ["modifyvm", :id, "--nested-hw-virt", "on"]
    vb.customize ["modifyvm", :id, "--paravirtprovider", "kvm"]
  end

  # Shared Folders
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"
  config.vm.synced_folder "./shared", "/home/vagrant/shared", create: true

  # Provisioning Script
  config.vm.provision "shell", path: "scripts/setup-vm.sh"
  config.vm.provision "shell", path: "scripts/install-docker.sh"
  config.vm.provision "shell", path: "scripts/install-devops-tools.sh"
  
  # Run as vagrant user (not root)
  config.vm.provision "shell", path: "scripts/configure-tools.sh", privileged: false
end
```

### 2.3 Provisioning Scripts

#### Create `scripts/setup-vm.sh`:
```bash
#!/bin/bash
# scripts/setup-vm.sh

echo "=== Setting up base VM ==="

# Update system
apt-get update && apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    tree \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential

# Install Java 17 (required for Jenkins and SonarQube)
apt-get install -y openjdk-17-jdk

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> /home/vagrant/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> /home/vagrant/.bashrc

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install .NET 8 SDK
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
apt-get update
apt-get install -y dotnet-sdk-8.0

# Install .NET EF Core tools
sudo -u vagrant dotnet tool install --global dotnet-ef

# Install PowerShell (useful for .NET development)
apt-get install -y powershell

# Install SQL Server command line tools
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | tee /etc/apt/sources.list.d/msprod.list
apt-get update
apt-get install -y mssql-tools18 unixodbc-dev
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> /home/vagrant/.bashrc

# Create directories for tools
mkdir -p /opt/{jenkins,sonarqube,prometheus,grafana}
chown -R vagrant:vagrant /opt/{jenkins,sonarqube,prometheus,grafana}

echo "=== Base VM setup completed ==="
```

#### Create `scripts/install-docker.sh`:
```bash
#!/bin/bash
# scripts/install-docker.sh

echo "=== Installing Docker ==="

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add vagrant user to docker group
usermod -aG docker vagrant

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose standalone (v2)
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "=== Docker installation completed ==="
```

#### Create `scripts/install-devops-tools.sh`:
```bash
#!/bin/bash
# scripts/install-devops-tools.sh

echo "=== Installing DevOps Tools ==="

# Create docker-compose.yml for DevOps tools
cat > /vagrant/docker/devops-compose.yml << 'EOF'
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
      - JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Xmx2048m"
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
      - SONAR_WEB_JAVAADDITIONALOPTS=-Xmx2048m
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
      - "5432:5432"
    networks:
      - devops-network

  # SQL Server for .NET applications
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sqlserver
    restart: unless-stopped
    ports:
      - "1433:1433"
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

  # Nginx for reverse proxy (optional)
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - jenkins
      - sonarqube
      - grafana
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

# Create Prometheus configuration
mkdir -p /vagrant/docker/prometheus
cat > /vagrant/docker/prometheus/prometheus.yml << 'EOF'
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

# Create Grafana configuration
mkdir -p /vagrant/docker/grafana/{dashboards,provisioning/{dashboards,datasources}}

# Grafana datasources configuration
cat > /vagrant/docker/grafana/provisioning/datasources/datasources.yml << 'EOF'
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
cat > /vagrant/docker/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
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
mkdir -p /vagrant/docker/nginx
cat > /vagrant/docker/nginx/nginx.conf << 'EOF'
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

echo "=== DevOps tools configuration created ==="
```

#### Create `scripts/configure-tools.sh`:
```bash
#!/bin/bash
# scripts/configure-tools.sh

echo "=== Configuring DevOps Tools ==="

# Set environment variables
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin

# Start DevOps tools with Docker Compose
cd /vagrant/docker
docker compose -f devops-compose.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 60

# Get Jenkins initial admin password
echo "=== Jenkins Setup Information ==="
echo "Jenkins URL: http://localhost:8080"
echo "Initial Admin Password:"
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword

echo ""
echo "=== SonarQube Setup Information ==="
echo "SonarQube URL: http://localhost:9000"
echo "Default credentials: admin/admin"

echo ""
echo "=== SQL Server Setup Information ==="
echo "SQL Server: localhost,1433"
echo "Username: sa"
echo "Password: YourStrong@Password123"
echo "Connection String: Server=localhost,1433;Database=master;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=true;"

echo ""
echo "=== Redis Setup Information ==="
echo "Redis URL: localhost:6379"
echo "No authentication required"

echo ""
echo "=== Seq Logging Setup Information ==="
echo "Seq URL: http://localhost:5341"
echo "No authentication required initially"

echo ""
echo "=== Grafana Setup Information ==="
echo "Grafana URL: http://localhost:3000"
echo "Default credentials: admin/admin123"

echo ""
echo "=== Portainer Setup Information ==="
echo "Portainer URL: https://localhost:9443"
echo "Create admin user on first login"

echo ""
echo "=== Configuration completed ==="
echo "All services are starting up. Please wait a few minutes before accessing the web interfaces."
```

---

## Phase 3: VM Deployment and Access

### 3.1 Deploy the VM
```bash
# Navigate to project directory
cd yourapp-devops

# Create shared directory
mkdir shared

# Make scripts executable
chmod +x scripts/*.sh

# Start and provision the VM
vagrant up

# If provisioning fails, you can re-run it
vagrant provision
```

### 3.2 VM Management Commands
```bash
# SSH into the VM
vagrant ssh

# Stop the VM
vagrant halt

# Restart the VM
vagrant reload

# Destroy the VM (removes everything)
vagrant destroy

# Check VM status
vagrant status

# Reload VM with provisioning
vagrant reload --provision
```

### 3.3 Access DevOps Tools

After VM is running, access tools via browser:

| Tool | URL | Default Credentials | Purpose |
|------|-----|-------------------|---------|
| Jenkins | http://localhost:8080 | admin/[initial-password] | CI/CD Pipeline |
| SonarQube | http://localhost:9000 | admin/admin | Code Quality Analysis |
| Grafana | http://localhost:3000 | admin/admin123 | Monitoring Dashboards |
| Prometheus | http://localhost:9090 | No auth required | Metrics Collection |
| Portainer | https://localhost:9443 | Create on first login | Docker Management |
| SQL Server | localhost,1433 | sa/YourStrong@Password123 | Database |
| Redis | localhost:6379 | No auth required | Caching |
| Seq | http://localhost:5341 | No auth required | .NET Logging |
| Nginx Proxy | http://localhost:80 | No auth required | Reverse Proxy |

---

## Phase 4: Jenkins Initial Configuration

### 4.1 Access Jenkins and Setup
1. Open http://localhost:8080
2. Get initial password:
   ```bash
   vagrant ssh
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
3. Install suggested plugins
4. Create admin user
5. Configure Jenkins URL: http://localhost:8080

### 4.2 Install Additional Jenkins Plugins
Required plugins for .NET + Angular pipeline:
- **Docker Pipeline** - Docker integration
- **Git Parameter** - Git repository integration
- **Pipeline Stage View** - Pipeline visualization
- **Blue Ocean** - Modern UI for pipelines
- **SonarQube Scanner** - Code quality integration
- **MSBuild** - .NET build support
- **NodeJS** - Angular build support
- **AnsiColor** - Colored console output
- **Timestamper** - Build timestamps
- **Workspace Cleanup** - Clean workspace after builds
- **Credentials Binding** - Secure credential management
- **Pipeline: Build Step** - Build pipeline steps
- **xUnit** - Test result publishing
- **HTML Publisher** - HTML report publishing
- **Cobertura** - Code coverage reports
- **Email Extension** - Email notifications
- **Slack Notification** - Slack integration (optional)

### 4.3 Configure Global Tools in Jenkins
1. Go to **Manage Jenkins > Global Tool Configuration**
2. Configure:
   - **Git**: Auto-install latest
   - **Docker**: Auto-install latest
   - **NodeJS**: Install Node 18.x, Global packages: `@angular/cli@19`
   - **SonarQube Scanner**: Auto-install latest version
   - **.NET SDK**: Configure path to `/usr/share/dotnet/dotnet` (in VM)

### 4.4 Configure SonarQube Integration
1. Go to **Manage Jenkins > Configure System**
2. Find **SonarQube servers** section
3. Add SonarQube server:
   - Name: `SonarQube`
   - Server URL: `http://sonarqube:9000`
   - Server authentication token: (Generate in SonarQube)

### 4.5 Configure Docker Integration
1. Go to **Manage Jenkins > Configure System**
2. Find **Docker** section
3. Add Docker Host:
   - Docker Host URI: `unix:///var/run/docker.sock`
   - Enable Docker Host

---

## Phase 5: Security and Firewall Configuration

### 5.1 Configure VM Firewall
```bash
# SSH into VM
vagrant ssh

# Configure UFW firewall
sudo ufw enable
sudo ufw allow 8080  # Jenkins
sudo ufw allow 9000  # SonarQube
sudo ufw allow 3000  # Grafana
sudo ufw allow 9090  # Prometheus
sudo ufw allow 9443  # Portainer
sudo ufw allow 1433  # SQL Server
sudo ufw allow 6379  # Redis
sudo ufw allow 5341  # Seq
sudo ufw allow 80    # Nginx
sudo ufw allow 22    # SSH
sudo ufw status
```

### 5.2 Secure Jenkins
1. **Enable CSRF Protection**: Manage Jenkins > Configure Global Security
2. **Setup Matrix-based Security**: Configure user permissions
3. **Enable Agent-to-Master Security**: Configure build agents
4. **Regular Backups**: Configure backup strategy

---

## Phase 6: Troubleshooting Guide

### 6.1 Common Issues and Solutions

#### VM Won't Start
```bash
# Check VirtualBox status
VBoxManage list runningvms

# Check Vagrant status
vagrant status

# Restart VirtualBox service (Windows)
# Services -> VirtualBox service -> Restart
```

#### Docker Issues in VM
```bash
vagrant ssh
sudo systemctl status docker
sudo systemctl restart docker
docker ps -a
```

#### Port Conflicts
```bash
# Check what's using the ports
netstat -tulpn | grep :8080
# Kill process if needed
sudo kill -9 <PID>
```

#### Services Not Starting
```bash
vagrant ssh
cd /vagrant/docker
docker compose -f devops-compose.yml logs
docker compose -f devops-compose.yml restart
```

### 6.2 Performance Optimization
```bash
# Check VM resources
vagrant ssh
htop
free -h
df -h

# Adjust VM memory in Vagrantfile if needed
# vb.memory = "4096"  # Reduce if system has limited RAM
```

---

## Phase 7: Backup and Recovery

### 7.1 Backup Jenkins Configuration
```bash
vagrant ssh
docker exec jenkins tar -czf /tmp/jenkins_backup.tar.gz -C /var/jenkins_home .
docker cp jenkins:/tmp/jenkins_backup.tar.gz /vagrant/shared/
```

### 7.2 Backup Docker Volumes
```bash
vagrant ssh
cd /vagrant/docker
docker compose -f devops-compose.yml stop
sudo tar -czf /vagrant/shared/docker_volumes_backup.tar.gz /var/lib/docker/volumes/
docker compose -f devops-compose.yml start
```

---

## Next Steps

1. **Verify all services are accessible**
2. **Configure Jenkins with your Git repository**
3. **Set up SonarQube project**
4. **Test Docker integration**
5. **Create first pipeline**

All configurations are ready! Let me know when you want to proceed to the next phase.