#!/bin/bash
cd /home/runner/workspace
export NODE_ENV=development
while true; do
    echo "Starting development server..."
    tsx server/index.ts
    echo "Server crashed, restarting in 2 seconds..."
    sleep 2
done