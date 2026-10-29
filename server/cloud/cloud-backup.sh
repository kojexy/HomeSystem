#!/bin/sh
# Every 5 minutes, sends important camera events to the cloud:
#   - snapshot photos of every detection (person, car, animal)
#   - video clips of alerts (made by the "Alert → cloud clip" automation)
# Copy only: deleting at home never deletes the cloud copy, so a thief can't wipe the evidence.
set -u
: "${CLOUD_REMOTE:?Set CLOUD_REMOTE in .env, for example gdrive:HomeSystem}"

while true; do
  rclone copy /media/frigate/clips "$CLOUD_REMOTE/snapshots" \
    --include "*.jpg" --max-depth 1 --max-age 48h --log-level NOTICE
  # Clips are moved, not copied, so they don't fill the disk at home.
  rclone move /media/frigate/exports "$CLOUD_REMOTE/clips" \
    --include "*.mp4" --min-age 2m --log-level NOTICE
  sleep 300
done
