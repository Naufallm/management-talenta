#!/usr/bin/env bash
# First installation on the inspected Ubuntu server. Never resets existing data.
set -Eeuo pipefail
umask 077
[[ "$EUID" == 0 ]] || { echo 'Jalankan dengan sudo.' >&2; exit 1; }
stage=/home/bps/talenta-deploy-20261112/app
target=/var/www/talenta.bpskotabatu.com
config=/etc/talenta
nginx_site=/etc/nginx/sites-available/talenta.bpskotabatu.com
[[ -f "$stage/dist/index.html" && -d "$stage/node_modules" ]] || { echo 'Paket staging belum lengkap.' >&2; exit 1; }
[[ ! -e "$target" && ! -e /opt/talenta && ! -e "$config" && ! -e /etc/systemd/system/talenta.service ]] || { echo 'Instalasi Talenta sudah ada; berhenti agar tidak tertimpa.' >&2; exit 1; }
[[ -f "$nginx_site" && -f /etc/ssl/certs/talenta.crt && -f /etc/ssl/private/talenta.key ]] || { echo 'Konfigurasi Nginx/sertifikat awal tidak sesuai.' >&2; exit 1; }
if ss -ltnH | awk '{print $4}' | grep -qE ':5015$'; then
    echo 'Port 5015 sudah digunakan; berhenti.' >&2; exit 1
fi
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -d db_magang -Atc "SELECT current_database()" >/dev/null
backup="/var/backups/talenta/$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$backup"
cp -p "$nginx_site" "$backup/nginx.conf"
runuser -u postgres -- pg_dump -d db_magang --schema=management_talenta --format=custom > "$backup/schema-before.dump"
echo "Cadangan tersimpan di $backup"
cd "$stage"
runuser -u bps -- /usr/bin/node scripts/prepare-production.mjs
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -d db_magang < deploy/state/provision.sql
if ! id talenta >/dev/null 2>&1; then
    useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin talenta
fi
install -d -m 755 "$target"
tar --exclude=./deploy/state -cf - . | tar -C "$target" -xf -
chown -R root:root "$target"
chmod -R go-w "$target"
install -d -o root -g talenta -m 750 "$config"
install -o root -g talenta -m 640 deploy/state/app.env "$config/talenta.env"
cd "$target"
runuser -u talenta -- /usr/bin/node --env-file="$config/talenta.env" --import tsx server/db/cli.ts migrate
# Fresh production Admin; keep the random password in a private file, never stdout.
/usr/bin/node --input-type=module <<'NODE'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
writeFileSync('/etc/talenta/bootstrap.env', `BOOTSTRAP_USERNAME=admin@bpskotabatu.com\nBOOTSTRAP_PASSWORD=${randomBytes(24).toString('hex')}\n`, {flag:'wx',mode:0o640});
NODE
chown root:talenta "$config/bootstrap.env"
chmod 640 "$config/bootstrap.env"
runuser -u talenta -- /usr/bin/node --env-file="$config/talenta.env" --env-file="$config/bootstrap.env" --import tsx scripts/create-admin.ts
install -o bps -g bps -m 600 "$config/bootstrap.env" /home/bps/talenta-deploy-20261112/admin-first-login.env
rm "$config/bootstrap.env"
install -o root -g root -m 644 deploy/talenta.service /etc/systemd/system/talenta.service
systemctl daemon-reload
systemctl enable --now talenta
for attempt in $(seq 1 20); do
    if curl -fsS http://127.0.0.1:5015/api/health >/dev/null; then break; fi
    sleep 1
done
curl -fsS http://127.0.0.1:5015/api/health
install -o root -g root -m 644 deploy/nginx-existing-server.conf "$nginx_site"
if ! nginx -t; then
    cp -p "$backup/nginx.conf" "$nginx_site"
    echo 'Validasi Nginx gagal; konfigurasi sebelumnya dipulihkan.' >&2
    exit 1
fi
systemctl reload nginx
curl -fsS -H 'Host: talenta.bpskotabatu.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1/api/health
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -d db_magang -Atc "SELECT 'migrations=' || count(*) FROM management_talenta.schema_migrations"
echo 'Instalasi selesai. Kredensial Admin: /home/bps/talenta-deploy-20261112/admin-first-login.env (privat).'
