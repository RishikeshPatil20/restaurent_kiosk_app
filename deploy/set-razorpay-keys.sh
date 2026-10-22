#!/usr/bin/env bash
# Prompts for Razorpay keys, writes them into the server .env and restarts the app.
# Installed on the VM as /usr/local/bin/kiosk-set-razorpay. Run:  sudo kiosk-set-razorpay
set -euo pipefail

ENV_FILE=/opt/restaurant-kiosk-app/.env

read -rp "RAZORPAY_KEY_ID (rzp_test_...): " KEY_ID
read -rsp "RAZORPAY_KEY_SECRET (hidden): " KEY_SECRET; echo
read -rsp "RAZORPAY_WEBHOOK_SECRET (hidden, Enter to skip): " WEBHOOK_SECRET; echo

[[ $KEY_ID =~ ^rzp_(test|live)_[A-Za-z0-9]+$ ]] || { echo "Key id must look like rzp_test_..."; exit 1; }
[ -n "$KEY_SECRET" ] || { echo "Key secret is empty"; exit 1; }

# Check the keys with Razorpay before saving them (401 = wrong id/secret)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -u "$KEY_ID:$KEY_SECRET" "https://api.razorpay.com/v1/orders?count=1")
[ "$CODE" = 200 ] || { echo "Razorpay rejected these keys (HTTP $CODE). Nothing changed."; exit 1; }

set_var() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }
set_var RAZORPAY_KEY_ID "$KEY_ID"
set_var RAZORPAY_KEY_SECRET "$KEY_SECRET"
[ -z "$WEBHOOK_SECRET" ] || set_var RAZORPAY_WEBHOOK_SECRET "$WEBHOOK_SECRET"

systemctl restart restaurant-kiosk
sleep 3
curl -fs http://127.0.0.1:5100/healthz >/dev/null && echo "Keys saved and app restarted. Try checkout again."
