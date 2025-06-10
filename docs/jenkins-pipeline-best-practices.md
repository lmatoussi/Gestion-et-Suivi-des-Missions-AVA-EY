# Jenkins Pipeline Best Practices

This document provides best practices for creating robust Jenkins pipelines that can handle common CI/CD issues gracefully.

## Error Handling

### Non-Failing Commands

For commands that should not fail the pipeline if they don't succeed:

```groovy
sh '''
    set +e  # Disable automatic exit on error
    command_that_might_fail
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "Command failed but continuing pipeline"
    fi
    set -e  # Re-enable automatic exit on error
'''
```

### Try-Catch Pattern for Shell Commands

```groovy
sh '''
    if command_that_might_fail; then
        echo "Command succeeded"
    elif alternative_command; then
        echo "Alternative command succeeded"
    else
        echo "WARNING: Both attempts failed - proceeding with caution"
    fi
'''
```

## Tool Installation

### Staged Installation with Fallbacks

Always include fallback options for tool installation:

1. Check if the tool is already installed
2. Try installing in standard locations
3. Try with elevated privileges (sudo)
4. Fall back to user's home directory
5. Last resort: install in the workspace

### Example:

```groovy
sh '''
    # Try multiple installation locations
    if install_tool /opt; then
        echo "Installed to /opt successfully"
    elif sudo install_tool /opt; then
        echo "Installed to /opt with sudo successfully"
    elif install_tool $HOME; then
        echo "Installed to $HOME successfully"
    else
        echo "WARNING: Installation failed - trying workspace"
        install_tool $WORKSPACE/tools
    fi
'''
```

## Path Management

### Multiple PATH Additions

Add tools to PATH in multiple ways to ensure they're accessible:

```groovy
sh '''
    export PATH="$PATH:/path/to/tool/bin"
    echo "export PATH=$PATH:/path/to/tool/bin" >> ~/.bashrc
    mkdir -p $HOME/bin
    ln -sf /path/to/tool/bin/executable $HOME/bin/executable
'''
```

## Docker Permissions

### Handling Docker Socket Permissions

```groovy
sh '''
    # Make Docker accessible to the Jenkins user
    if [ -e /var/run/docker.sock ]; then
        sudo chmod 666 /var/run/docker.sock || echo "Could not set permissions"
    fi
    
    # Try commands with and without sudo
    if docker command; then
        echo "Docker command succeeded"
    elif sudo docker command; then
        echo "Docker command succeeded with sudo"
    else
        echo "WARNING: Docker command failed"
    fi
'''
```

## File Operations

### Safe File Manipulation

When moving or copying files, include safety checks:

```groovy
sh '''
    # Create a backup before removing
    if [ -d "$target_dir" ]; then
        mv "$target_dir" "${target_dir}.bak" || true
    fi
    mkdir -p "$target_dir"
    cp -r "$source_dir"/* "$target_dir"/
'''
```

## Environment Variables

### Defensive Environment Variable Use

```groovy
sh '''
    # Provide defaults for variables
    DB_PASSWORD=${DB_PASSWORD:-defaultpw}
    
    # Check if critical variables are set
    if [ -z "$CRITICAL_VAR" ]; then
        echo "WARNING: CRITICAL_VAR is not set - using default"
        CRITICAL_VAR="default_value"
    fi
'''
```

## Pipeline Structure

### Health Checks Before Major Stages

```groovy
stage('Pre-flight Checks') {
    steps {
        sh '''
            # Check for required tools
            command -v required_tool || echo "WARNING: required_tool not found"
            
            # Check access to required services
            curl -s http://required-service/health || echo "WARNING: Service not responsive"
        '''
    }
}
```

### Post-Action Cleanup

```groovy
post {
    always {
        sh '''
            # Remove temporary files
            rm -rf /tmp/build-*
            
            # Reset any changed configurations
            git checkout -- config.file || true
        '''
    }
}
```

## Documentation

### In-Line Documentation for Complex Steps

```groovy
sh '''
    # PURPOSE: Install tool X with fallbacks
    # AUTHOR: DevOps Team
    # LAST UPDATED: 2023-05-15
    
    # Step 1: Download tool
    # ...code here...
    
    # Step 2: Configure tool
    # ...code here...
'''
```

## Reference

- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Jenkins Pipeline Best Practices](https://www.jenkins.io/doc/book/pipeline/pipeline-best-practices/)
- [Shell Script Best Practices](https://google.github.io/styleguide/shellguide.html)
