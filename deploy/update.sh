#!/usr/bin/env bash
# Pulls the latest code from GitHub and applies it. Run on the VM as the `kiosk` user,
# then restart the service:  sudo systemctl restart restaurant-kiosk
set -euo pipefail

export PATH=/opt/node-22/bin:$PATH
cd /opt/restaurant-kiosk-app

git pull --ff-only origin main
npm ci --omit=dev
npm run migrate
