#!/bin/bash
# Script to start the backend server with Java 17
# Uses the JAVA_HOME from .zshrc if available, otherwise uses explicit path

if [ -z "$JAVA_HOME" ]; then
    # Try to source .zshrc to get JAVA_HOME, or use explicit path
    if [ -f ~/.zshrc ]; then
        export JAVA_HOME=$(grep "export JAVA_HOME" ~/.zshrc | head -1 | cut -d'=' -f2 | tr -d '"')
    fi
    
    # Fallback to explicit path if JAVA_HOME still not set
    if [ -z "$JAVA_HOME" ] || [ ! -d "$JAVA_HOME" ]; then
        export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home
    fi
fi

cd "$(dirname "$0")/backend"

# Check if port 8080 is already in use
if lsof -ti:8080 > /dev/null 2>&1; then
    echo "Port 8080 is already in use. Stopping existing process..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo "Starting backend server with Java 17..."
echo "JAVA_HOME: $JAVA_HOME"
echo "Java version:"
$JAVA_HOME/bin/java -version 2>&1 | head -3
echo ""

mvn spring-boot:run

