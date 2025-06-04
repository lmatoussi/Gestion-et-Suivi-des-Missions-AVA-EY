# Monitoring Setup Instructions for EY Expense Manager

This document provides instructions for setting up monitoring for the EY Expense Manager application.

## Step 1: Install Required Packages

Run these commands to install the necessary NuGet packages:

```bash
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package prometheus-net.AspNetCore
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package Serilog.AspNetCore
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package Serilog.Sinks.Seq
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package Microsoft.Extensions.Diagnostics.HealthChecks
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package AspNetCore.HealthChecks.SqlServer
dotnet add EYExpenseManager.API/EYExpenseManager.API.csproj package AspNetCore.HealthChecks.Redis
```

## Step 2: Modify Program.cs

Add the following code to your Program.cs file:

### Add Using Statements

At the top of your Program.cs file, add:

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Prometheus;
using Serilog;
using Serilog.Events;
```

### Configure Serilog

Before your `var builder = WebApplication.CreateBuilder(args);` line, add:

```csharp
// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Seq("http://seq:5341")
    .CreateLogger();
```

### Wrap Main Code in Try-Catch Block

Wrap your main code in a try-catch block:

```csharp
try
{
    Log.Information("Starting EY Expense Manager API");
    
    // Your existing builder code stays here
    var builder = WebApplication.CreateBuilder(args);
    
    // Configure Serilog with the host
    builder.Host.UseSerilog();
    
    // Your existing services configuration stays here
    
    // Add health checks
    builder.Services.AddHealthChecks()
        .AddSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            name: "sqlserver",
            failureStatus: HealthStatus.Degraded)
        .AddCheck("self", () => HealthCheckResult.Healthy())
        .ForwardToPrometheus();
        
    // Continue with your existing code
    
    var app = builder.Build();
    
    // Add Prometheus metrics
    app.UseMetricServer();
    app.UseHttpMetrics();
    
    // Add health checks endpoint
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = "application/json";
            
            var result = System.Text.Json.JsonSerializer.Serialize(new
            {
                status = report.Status.ToString(),
                checks = report.Entries.Select(entry => new
                {
                    name = entry.Key,
                    status = entry.Value.Status.ToString(),
                    description = entry.Value.Description,
                    duration = entry.Value.Duration.TotalMilliseconds
                })
            });
            
            await context.Response.WriteAsync(result);
        }
    });
    
    // Your existing middleware configuration
    
    // Add global exception handling middleware
    app.Use(async (context, next) =>
    {
        try
        {
            await next();
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Unhandled exception");
            throw;
        }
    });
    
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
```

## Step 3: Update appsettings.json

Add the following configuration to your appsettings.json file:

```json
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
```

## Step 4: Testing Monitoring Setup

1. After implementing these changes and starting your application, you should be able to access:
   - Health checks: http://localhost:5000/health
   - Metrics: http://localhost:5000/metrics

2. To view logs in Seq, access: http://localhost:5341

3. To view metrics in Grafana, access: http://localhost:3000 and configure a dashboard to display Prometheus metrics from http://localhost:9090
