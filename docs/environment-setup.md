# Environment Setup Guide

## Environment Variables

This project uses environment variables for configuration settings that shouldn't be committed to source control, such as database passwords, API keys, and secrets.

### Setting Up Environment Variables

1. Copy the `.env.example` file to a new file named `.env`:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholder values with your actual configuration values.

3. For local development with Docker, these variables will be loaded into the containers via the docker-compose files.

### Required Environment Variables

- `DB_PASSWORD`: SQL Server SA password
- `JWT_SECRET`: Secret key for JWT token generation
- `GOOGLE_CLIENT_ID`: Google authentication client ID
- `GOOGLE_CLIENT_SECRET`: Google authentication client secret
- `SMTP_PASSWORD`: SMTP server password for email sending
- `SEQ_API_KEY`: API key for Seq logging (if used)
- `SONAR_TOKEN`: SonarQube authentication token

### Loading Environment Variables

#### For Docker
Environment variables are automatically loaded from the `.env` file when using docker-compose.

#### For Local Development
You can use a tool like `dotenv-cli` to load environment variables from the `.env` file when running local commands.

### Production Environment

In production environments, we recommend using a secure secrets management solution rather than `.env` files. Options include:

- Azure Key Vault
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets

## Example Usage in Code

Environment variables can be accessed in the application code via the configuration system:

```csharp
// In Program.cs or Startup.cs
var jwtSecret = Configuration["Authentication:JwtSecret"];
```

Or via injected IConfiguration:

```csharp
public class SomeService
{
    private readonly string _connectionString;
    
    public SomeService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
    }
}
```
