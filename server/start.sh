#!/bin/sh
# Starts the HomeSystem server (Home Assistant + go2rtc) on a Linux PC with Docker.
set -e
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker is missing. Install it: https://docs.docker.com/engine/install/"; exit 1; }

# Camera passwords live only in this private copy, never in git.
if [ ! -f go2rtc.private.yaml ]; then
  cp go2rtc.yaml go2rtc.private.yaml
  echo "Created go2rtc.private.yaml — put your camera's address and password in it, then run ./start.sh again."
fi

# The HomeSystem app, served by Home Assistant itself.
if [ ! -f ../app/dist/index.html ]; then
  if command -v npm >/dev/null; then
    (cd ../app && npm ci && npm run build)
  else
    mkdir -p ../app/dist
    echo "Node.js is missing, so the HomeSystem app is not built. HA still works; install Node 22 and run ./start.sh again to add the app."
  fi
fi

# First start: switch on the automations package.
if [ -f ha-config/configuration.yaml ] && ! grep -q "packages: !include_dir_named packages" ha-config/configuration.yaml; then
  printf '\nhomeassistant:\n  packages: !include_dir_named packages\n' >> ha-config/configuration.yaml
  echo "Turned on the HomeSystem automations package."
fi

docker compose up -d

ip=$(hostname -I 2>/dev/null | awk '{print $1}')
echo
echo "Home Assistant:  http://${ip:-<this-pc-ip>}:8123   (first start takes a few minutes)"
echo "HomeSystem app:  http://${ip:-<this-pc-ip>}:8123/local/homesystem/index.html"
echo "Camera streams:  http://${ip:-<this-pc-ip>}:1984"
