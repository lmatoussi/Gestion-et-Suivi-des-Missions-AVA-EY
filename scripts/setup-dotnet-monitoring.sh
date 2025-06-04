#!/bin/bash
# This script sets up the .NET application for DevOps monitoring and integration

echo "=== Setting up .NET application for DevOps integration ==="

# Install required NuGet packages
DOTNET_API_DIR="/vagrant/EYExpenseManager/EYExpenseManager.API"

# In a real scenario, you'd run these commands in the actual directory
# This is just a guide to show what packages need to be added

echo "Add these packages to your .NET API project:"
echo "
dotnet add package prometheus-net.AspNetCore
dotnet add package prometheus-net
dotnet add package Serilog
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Seq
dotnet add package Serilog.Sinks.Console
dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add package AspNetCore.HealthChecks.UI
dotnet add package AspNetCore.HealthChecks.SqlServer
dotnet add package AspNetCore.HealthChecks.Redis
"

# Example Program.cs changes needed
cat << 'EOF'
// Add to your Program.cs

// For Prometheus metrics
using Prometheus;

// For Serilog
using Serilog;
using Serilog.Events;

// Add before building the WebApplication
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Seq("http://seq:5341"));

// Add health checks
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
    .AddRedis(builder.Configuration.GetConnectionString("Redis"))
    .ForwardToPrometheus();

// Add inside the app configuration section, before app.Run()
// Prometheus metrics
app.UseMetricServer();
app.UseHttpMetrics();

// Health checks endpoint
app.MapHealthChecks("/health");
EOF

# Example appsettings.json additions
cat << 'EOF'
// Add to your appsettings.json

"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft": "Warning",
      "System": "Warning"
    }
  }
},

"HealthChecks-UI": {
  "HealthChecks": [
    {
      "Name": "API",
      "Uri": "/health"
    }
  ]
}
EOF

echo "=== .NET application setup instructions complete ==="
