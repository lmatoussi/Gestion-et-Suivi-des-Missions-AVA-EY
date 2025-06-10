# SonarScanner Installation Guide for Jenkins CI/CD Pipeline

This document provides information about SonarScanner installation issues in Jenkins pipelines and how to resolve them.

## Common SonarScanner Installation Issues

### 1. Directory Not Empty Error

**Problem:**
```
mv: cannot move '/opt/sonar-scanner-4.8.0.2856-linux' to '/opt/sonar-scanner': Directory not empty
```

**Cause:**
This error occurs when trying to move the extracted SonarScanner directory to a destination directory that already exists and is not empty.

**Solution:**
- Remove the existing directory first or copy files instead of moving
- Use `cp -r` instead of `mv` to copy files from the extracted directory
- Implement proper error handling around the installation process

### 2. Permission Issues

**Problem:**
Jenkins may not have permissions to write to system directories like `/opt` or `/usr/local/bin`.

**Solution:**
- Try multiple installation locations (fallback mechanism):
  1. First try `/opt` (standard location)
  2. Try with sudo if regular installation fails
  3. Fall back to `$HOME` (user's home directory)
  4. Last resort: install in `$WORKSPACE/tools`
- Always ensure proper PATH exports

### 3. Path and Environment Issues

**Problem:**
Tools may be installed but not accessible due to PATH issues.

**Solution:**
- Export PATH in multiple places to ensure tools are accessible
- Create symbolic links in well-known locations
- Add error handling to check for the existence of tools before running commands

## Implementation Details

### SonarScanner CLI Installation

The improved installation process:

1. Uses a function-based approach for better error handling
2. Creates a temporary directory for extraction to avoid conflicts
3. Implements multiple fallback mechanisms for installation locations
4. Verifies installation success before proceeding
5. Updates PATH in real-time to make tools immediately available

### dotnet-sonarscanner Installation

The improved installation process:

1. Sets a specific DOTNET_CLI_HOME to avoid permission issues
2. Tries both installation and update commands
3. Falls back to local installation if global installation fails
4. Creates symbolic links to make the tool accessible from standard locations
5. Exports paths to multiple possible tool locations

## Troubleshooting

If SonarScanner still fails to run:

1. Check tool existence: `which sonar-scanner` and `which dotnet-sonarscanner`
2. Check if tools are in PATH: `echo $PATH`
3. Verify permissions: `ls -la /opt/sonar-scanner` and `ls -la $HOME/.dotnet/tools`
4. Check installation logs for errors

## Maintaining Tools

To keep SonarScanner tools up to date:

1. For dotnet-sonarscanner: `dotnet tool update --global dotnet-sonarscanner`
2. For SonarScanner CLI: Re-run the installation with the latest version

## References

- [SonarScanner CLI Documentation](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/)
- [SonarScanner for .NET Documentation](https://docs.sonarqube.org/latest/analysis/scan/sonarscanner-for-msbuild/)
