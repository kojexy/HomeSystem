#!/bin/sh
# Starts the HomeSystem server on a Linux PC with Docker:
# Home Assistant + Frigate (cameras, AI) + MQTT, and the extras chosen in .env.
set -e
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker is missing. Install it: https://docs.docker.com/engine/install/"; exit 1; }

# Secrets live only in .env, never in git.
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created server/.env — fill in the camera login (and the AI key), then run ./start.sh again."
  exit 0
fi

# Frigate's own copy of the camera config; edit frigate-config/config.yml.
mkdir -p frigate-config mosquitto-data rclone-config
[ -f frigate-config/config.yml ] || cp frigate/config.yml frigate-config/config.yml

# The HomeSystem app, served by Home Assistant itself.
if [ ! -f ../app/dist/index.html ]; then
  if command -v npm >/dev/null; then
    (cd ../app && npm ci && npm run build)
  else
    mkdir -p ../app/dist
    echo "Node.js is missing, so the HomeSystem app is not built. Install Node 22 and run ./start.sh again to add it."
  fi
fi

# Automations made in the app are saved to automations.yaml; HA's default config loads it. Make sure.
if [ -f ha-config/configuration.yaml ] && ! grep -q "automations.yaml" ha-config/configuration.yaml; then
  [ -f ha-config/automations.yaml ] || echo "[]" > ha-config/automations.yaml
  printf '\nautomation ui: !include automations.yaml\n' >> ha-config/configuration.yaml
  echo "Turned on automations made in the app. Restart HA once: docker restart homeassistant"
fi

# After HA's first start: switch on the automations package.
if [ -f ha-config/configuration.yaml ] && ! grep -q "packages: !include_dir_named packages" ha-config/configuration.yaml; then
  printf '\nhomeassistant:\n  packages: !include_dir_named packages\n' >> ha-config/configuration.yaml
  echo "Turned on the HomeSystem automations package. Restart HA once: docker restart homeassistant"
fi

docker compose up -d

ip=$(hostname -I 2>/dev/null | awk '{print $1}')
ip=${ip:-<this-pc-ip>}
echo
echo "Home Assistant:  http://$ip:8123   (first start takes a few minutes)"
echo "HomeSystem app:  http://$ip:8123/local/homesystem/index.html"
echo "Frigate:         https://$ip:8971   (first password: docker logs frigate 2>&1 | grep -i password)"
