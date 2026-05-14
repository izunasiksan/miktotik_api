#!/bin/bash
# Mikrotik API Log Rotation Script
# Add this to crontab: 0 0 * * * /path/to/rotate_logs.sh

LOG_DIR="/var/log/mikrotik-api"
ARCHIVE_DIR="$LOG_DIR/archive"
RETENTION_DAYS=30

mkdir -p $ARCHIVE_DIR

# 1. Rotate current log
if [ -f "$LOG_DIR/app.log" ]; then
    TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    mv "$LOG_DIR/app.log" "$ARCHIVE_DIR/app-$TIMESTAMP.log"
    # Create new empty log file
    touch "$LOG_DIR/app.log"
    # Signal app to reload log file (if using Gunicorn/Uvicorn log config)
    # kill -HUP $(cat /var/run/gunicorn.pid)
fi

# 2. Compress logs older than 1 day
find $ARCHIVE_DIR -name "*.log" -mtime +1 -exec gzip {} \;

# 3. Delete archives older than retention period
find $ARCHIVE_DIR -name "*.gz" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "Log rotation completed at $(date)"
