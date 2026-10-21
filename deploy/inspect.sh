#!/usr/bin/env bash
# Read-only inspection of the VM before deploying anything.
echo "== OS / resources";   . /etc/os-release; echo "$PRETTY_NAME $(uname -m)"; free -h | head -2; df -h / | tail -1
echo "== Listening ports";  sudo ss -ltnp | awk 'NR>1{print $4, $6}' | sort -u
echo "== Nginx";            nginx -v 2>&1; ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
sudo grep -RhoE "^\s*(server_name|listen|proxy_pass|root)\s+[^;]+" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sed 's/^\s*//' | sort -u
echo "== Node / PM2";       command -v node && node -v; command -v pm2; ls /opt 2>/dev/null
echo "== PostgreSQL";       command -v psql && psql --version; systemctl is-active postgresql 2>/dev/null
echo "== Docker";           command -v docker && sudo docker ps --format '{{.Names}} {{.Ports}}'
echo "== Certbot";          command -v certbot && sudo certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry"
echo "== Firewall";         sudo iptables -S INPUT | head -20
echo "== Services";         systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}' | grep -vE '^(systemd|snap|dbus|getty|serial|ssh|cron|rsyslog|polkit|udisks|multipathd|irqbalance|chrony|unattended|ModemManager|networkd|oracle|user@)'
