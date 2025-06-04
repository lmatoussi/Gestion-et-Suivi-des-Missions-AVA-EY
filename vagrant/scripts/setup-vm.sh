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