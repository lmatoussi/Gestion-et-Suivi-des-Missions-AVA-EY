#!/bin/bash
# This script deploys the application to Kubernetes

# Set variables
NAMESPACE="eyexpensemanager"
IMAGE_TAG="$(date +%Y%m%d%H%M)"
BACKEND_IMAGE="eyexpensemanager-api:${IMAGE_TAG}"
FRONTEND_IMAGE="eyexpensemanager-ui:${IMAGE_TAG}"

echo "=== Deploying EY Expense Manager to Kubernetes ==="

# Create namespace if it doesn't exist
kubectl get namespace $NAMESPACE > /dev/null 2>&1 || kubectl create namespace $NAMESPACE

# Apply database secrets
kubectl apply -f - << EOF
apiVersion: v1
kind: Secret
metadata:
  name: db-secrets
  namespace: $NAMESPACE
type: Opaque
stringData:
  DB_USER: sa
  DB_PASSWORD: YourStrong@Password123
EOF

# Apply ConfigMap for application settings
kubectl apply -f - << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: eyexpensemanager-config
  namespace: $NAMESPACE
data:
  ASPNETCORE_ENVIRONMENT: Production
  Serilog__WriteTo__1__Name: "Seq"
  Serilog__WriteTo__1__Args__serverUrl: "http://seq-service:5341"
  HealthChecks__Enabled: "true"
EOF

# Deploy SQL Server
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sqlserver
  namespace: $NAMESPACE
spec:
  selector:
    matchLabels:
      app: sqlserver
  replicas: 1
  template:
    metadata:
      labels:
        app: sqlserver
    spec:
      containers:
      - name: sqlserver
        image: mcr.microsoft.com/mssql/server:2022-latest
        ports:
        - containerPort: 1433
        env:
        - name: ACCEPT_EULA
          value: "Y"
        - name: SA_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: DB_PASSWORD
        - name: MSSQL_PID
          value: "Developer"
        volumeMounts:
        - name: sqlserver-data
          mountPath: /var/opt/mssql
      volumes:
      - name: sqlserver-data
        persistentVolumeClaim:
          claimName: sqlserver-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: sqlserver-service
  namespace: $NAMESPACE
spec:
  selector:
    app: sqlserver
  ports:
  - port: 1433
    targetPort: 1433
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sqlserver-pvc
  namespace: $NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

# Deploy Redis
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: $NAMESPACE
spec:
  selector:
    matchLabels:
      app: redis
  replicas: 1
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: $NAMESPACE
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: $NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

# Deploy Backend API
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eyexpensemanager-api
  namespace: $NAMESPACE
spec:
  selector:
    matchLabels:
      app: eyexpensemanager-api
  replicas: 2
  template:
    metadata:
      labels:
        app: eyexpensemanager-api
    spec:
      containers:
      - name: eyexpensemanager-api
        image: $BACKEND_IMAGE
        ports:
        - containerPort: 80
        env:
        - name: ConnectionStrings__DefaultConnection
          value: "Server=sqlserver-service;Database=EYExpenseDB;User Id=sa;Password=YourStrong@Password123;TrustServerCertificate=True;"
        - name: ConnectionStrings__Redis
          value: "redis-service:6379"
        envFrom:
        - configMapRef:
            name: eyexpensemanager-config
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 15
        volumeMounts:
        - name: storage-volume
          mountPath: /app/Storage
      volumes:
      - name: storage-volume
        persistentVolumeClaim:
          claimName: api-storage-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: eyexpensemanager-api-service
  namespace: $NAMESPACE
spec:
  selector:
    app: eyexpensemanager-api
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: api-storage-pvc
  namespace: $NAMESPACE
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
EOF

# Deploy Frontend UI
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eyexpensemanager-ui
  namespace: $NAMESPACE
spec:
  selector:
    matchLabels:
      app: eyexpensemanager-ui
  replicas: 2
  template:
    metadata:
      labels:
        app: eyexpensemanager-ui
    spec:
      containers:
      - name: eyexpensemanager-ui
        image: $FRONTEND_IMAGE
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: eyexpensemanager-ui-service
  namespace: $NAMESPACE
spec:
  selector:
    app: eyexpensemanager-ui
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

# Deploy Ingress for external access
kubectl apply -f - << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eyexpensemanager-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: eyexpensemanager.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: eyexpensemanager-ui-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: eyexpensemanager-api-service
            port:
              number: 80
EOF

echo "=== Deployment complete! ==="
echo "Verify the deployment with: kubectl get all -n $NAMESPACE"
