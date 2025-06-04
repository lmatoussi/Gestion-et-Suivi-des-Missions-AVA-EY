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
sleep 90

# Function to check if container is running
check_container() {
    local container_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo "✓ $container_name is running"
        return 0
    else
        echo "✗ $container_name is not running"
        return 1
    fi
}

echo ""
echo "=== Container Status ==="
check_container "jenkins"
check_container "sonarqube"
check_container "sqlserver"
check_container "redis"
check_container "seq"
check_container "prometheus"
check_container "grafana"
check_container "portainer"
check_container "postgres"

echo ""
echo "=== Service Information ==="

# Get Jenkins initial admin password
echo "=== Jenkins Setup Information ==="
echo "Jenkins URL: http://localhost:8080 (or http://192.168.56.10:8080)"
echo "Initial Admin Password:"
if docker exec jenkins test -f /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null; then
    docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "Password file not ready yet. Wait a few more minutes."
else
    echo "Jenkins is still starting up. Wait a few more minutes and check manually with:"
    echo "docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"
fi

echo ""
echo "=== SonarQube Setup Information ==="
echo "SonarQube URL: http://localhost:9000 (or http://192.168.56.10:9000)"
echo "Default credentials: admin/admin"
echo "Note: SonarQube may take 2-3 minutes to fully start"

echo ""
echo "=== SQL Server Setup Information ==="
echo "SQL Server: localhost,1433 (from host: localhost,11433)"
echo "Username: sa"
echo "Password: YourStrong@Password123"
echo "Connection String: Server=localhost,11433;Database=master;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=true;"

echo ""
echo "=== PostgreSQL Setup Information ==="
echo "PostgreSQL: localhost,5432 (from host: localhost,15432)"
echo "Username: sonarqube"
echo "Password: sonarqube"
echo "Database: sonarqube"

echo ""
echo "=== Redis Setup Information ==="
echo "Redis URL: localhost:6379"
echo "No authentication required"

echo ""
echo "=== Seq Logging Setup Information ==="
echo "Seq URL: http://localhost:5341 (or http://192.168.56.10:5341)"
echo "No authentication required initially"

echo ""
echo "=== Prometheus Setup Information ==="
echo "Prometheus URL: http://localhost:9090 (or http://192.168.56.10:9090)"
echo "No authentication required"

echo ""
echo "=== Grafana Setup Information ==="
echo "Grafana URL: http://localhost:3000 (or http://192.168.56.10:3000)"
echo "Default credentials: admin/admin123"

echo ""
echo "=== Portainer Setup Information ==="
echo "Portainer URL: https://localhost:9443 (or https://192.168.56.10:9443)"
echo "Create admin user on first login"

echo ""
echo "=== Configuration completed ==="
echo "All services are starting up. Please wait a few minutes before accessing the web interfaces."
echo ""
echo "Useful commands:"
echo "  Check all containers: docker ps"
echo "  View logs: docker logs <container-name>"
echo "  Restart services: docker compose -f /vagrant/docker/devops-compose.yml restart"
echo "  Stop all services: docker compose -f /vagrant/docker/devops-compose.yml down"