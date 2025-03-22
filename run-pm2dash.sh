#!/bin/bash

# Set environment variables for debugging
export ELECTRON_ENABLE_LOGGING=true
export ELECTRON_ENABLE_STACK_DUMPING=true
export ELECTRON_DEBUG_CRASH_SERVICE=true

# Run the AppImage with more debugging info
cd "$(dirname "$0")"
./release/PM2Dash-1.0.0.AppImage --trace-warnings --no-sandbox "$@" > pm2dash-log.txt 2>&1

# If the command failed, show the log
if [ $? -ne 0 ]; then
  echo "PM2Dash failed to start. See pm2dash-log.txt for details."
  echo "Last 20 lines of log:"
  tail -n 20 pm2dash-log.txt
fi
