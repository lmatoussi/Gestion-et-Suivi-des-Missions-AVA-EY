#!/bin/bash
# This script collects logs from application components and pushes them to Seq

echo "=== Setting up Logging Pipeline ==="

# Ensure directories exist
mkdir -p /vagrant/logs/api
mkdir -p /vagrant/logs/ui
mkdir -p /vagrant/logs/docker

# Install Seq input tools (in a production environment, you'd use proper agents)
pip install seqcli

echo "=== Setting up log shipping to Seq ==="

# Create a simple log shipping script for .NET application
cat > /vagrant/scripts/ship-logs-to-seq.sh << 'EOF'
#!/bin/bash

# Configuration
SEQ_URL="http://localhost:5341"
API_LOG_DIR="/vagrant/logs/api"
UI_LOG_DIR="/vagrant/logs/ui"
DOCKER_LOG_DIR="/vagrant/logs/docker"

# Function to ship logs to Seq
ship_logs() {
  local SOURCE=$1
  local DIR=$2
  
  find "$DIR" -name "*.log" -type f -mtime -1 | while read -r logfile; do
    echo "Shipping $logfile to Seq..."
    seqcli ingest -i "$logfile" --server="$SEQ_URL" --title="$SOURCE Logs" --tag="$SOURCE"
  done
}

# Collect Docker logs
docker ps -q | while read -r container_id; do
  CONTAINER_NAME=$(docker inspect --format='{{.Name}}' "$container_id" | sed 's/^\///')
  docker logs "$container_id" > "$DOCKER_LOG_DIR/${CONTAINER_NAME}.log" 2>&1
done

# Ship logs to Seq
ship_logs "API" "$API_LOG_DIR"
ship_logs "UI" "$UI_LOG_DIR"
ship_logs "Docker" "$DOCKER_LOG_DIR"

echo "Logs shipped successfully!"
EOF

# Make the script executable
chmod +x /vagrant/scripts/ship-logs-to-seq.sh

# Create a cron job to run this hourly
(crontab -l 2>/dev/null; echo "0 * * * * /vagrant/scripts/ship-logs-to-seq.sh") | crontab -

echo "=== Logging pipeline setup complete ==="
echo "Seq is available at: http://localhost:5341"
echo "Logs will be shipped hourly to Seq"
