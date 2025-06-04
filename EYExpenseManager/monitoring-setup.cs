using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Prometheus;
using Serilog;
using Serilog.Events;

// To add to Program.cs - these are the packages you should install:
// dotnet add package prometheus-net.AspNetCore
// dotnet add package Serilog.AspNetCore
// dotnet add package Serilog.Sinks.Seq
// dotnet add package Microsoft.Extensions.Diagnostics.HealthChecks
// dotnet add package AspNetCore.HealthChecks.SqlServer
// dotnet add package AspNetCore.HealthChecks.Redis

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Seq("http://localhost:5341")
    .CreateLogger();

try
{
    Log.Information("Starting EY Expense Manager API");
    
    // Add before your existing builder code
    var builder = WebApplication.CreateBuilder(args);
    
    // Add Serilog to the host
    builder.Host.UseSerilog();

    // Add health checks
    builder.Services.AddHealthChecks()
        .AddSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            name: "sqlserver",
            failureStatus: HealthStatus.Degraded)
        .AddCheck("self", () => HealthCheckResult.Healthy())
        .ForwardToPrometheus();

    // Add metrics and health UI
    builder.Services.AddEndpointsApiExplorer();
    
    // After you've built the app, but before app.Run():
    var app = builder.Build();
    
    // Configure middleware for metrics
    app.UseMetricServer();
    app.UseHttpMetrics();
    
    // Configure health checks endpoint
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
    
    // Continue with the rest of your middleware configuration
    
    // Ensure errors are logged
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
