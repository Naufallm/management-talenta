#!/usr/bin/env bash
# Update application code only; preserve credentials and all employee history.
set -Eeuo pipefail
umask 077
[[ "$EUID" == 0 ]] || { echo 'Jalankan dengan sudo.' >&2; exit 1; }
stage=/home/bps/talenta-review-update-20261116/app
target=/var/www/talenta.bpskotabatu.com
[[ -d "$target" && -f /etc/talenta/talenta.env && -d "$stage/node_modules/sharp" && -f "$stage/dist/index.html" ]] || { echo 'Persiapan update belum lengkap.' >&2; exit 1; }
backup="/var/backups/talenta/review-$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$backup"
switched=0
rollback() {
    result=$?
    trap - ERR
    set +e
    systemctl stop talenta
    if [[ "$switched" == 1 ]]; then
        [[ ! -e "$target" ]] || mv "$target" "$backup/app-failed"
        mv "$backup/app-before" "$target"
    fi
    systemctl start talenta
    echo "Update gagal; kode sebelumnya dipulihkan. Cadangan: $backup" >&2
    exit "$result"
}
trap rollback ERR
systemctl stop talenta
runuser -u postgres -- pg_dump -d db_magang --schema=management_talenta --format=custom > "$backup/schema-before.dump"
mv "$target" "$backup/app-before"
switched=1
install -d -m 755 "$target"
tar -C "$stage" --exclude=./deploy/state -cf - . | tar -C "$target" -xf -
chown -R root:root "$target"
chmod -R go-w "$target"
cd "$target"
runuser -u talenta -- /usr/bin/node --env-file=/etc/talenta/talenta.env --import tsx server/db/cli.ts migrate
runuser -u talenta -- /usr/bin/node --env-file=/etc/talenta/talenta.env --import tsx scripts/apply-review-release.ts --apply
systemctl start talenta
for attempt in $(seq 1 20); do
    if curl -fsS http://127.0.0.1:5015/api/health >/dev/null 2>&1; then break; fi
    sleep 1
done
curl -fsS http://127.0.0.1:5015/api/health
trap - ERR
echo "Update aplikasi, reset potensi, dan penambahan pelatihan/penghargaan selesai. Cadangan: $backup"
