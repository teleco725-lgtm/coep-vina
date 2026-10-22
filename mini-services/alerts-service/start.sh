#!/bin/bash
# Wrapper script for the alerts-service.
# Used so start-stop-daemon can fully daemonize the process
# while still redirecting output to service.log.
cd /home/z/my-project/mini-services/alerts-service
exec /usr/local/bin/bun --hot index.ts > service.log 2>&1
