#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
target=/var/www/talenta.bpskotabatu.com
config=/etc/talenta/talenta.env
source_dir=$(cd "$(dirname "$0")" && pwd -P)
[[ $EUID == 0 && -d "$target" && -r "$config" && -s "$source_dir/dist/index.html" && -d "$source_dir/node_modules/tsx" ]]
exec 9>/run/lock/petalara-deploy.lock
flock -n 9 || { echo 'Deploy lain sedang berjalan.' >&2; exit 1; }
stage=$(mktemp -d /var/www/.petalara-release.XXXXXX)
chmod 755 "$stage"
backup=$(mktemp -d /var/backups/petalara.XXXXXX)
rsync -a --exclude=/server --exclude=/shared --exclude=/dist --exclude=/node_modules "$target/" "$stage/"
rsync -a --chown=root:root "$source_dir"/{server,shared,dist,node_modules,package.json,package-lock.json} "$stage/"
runuser -u talenta -- test -r "$stage/dist/index.html"
runuser -u talenta -- test -r "$stage/server/index.ts"
systemctl stop talenta
previous="$stage.previous"
recover() {
  status=$?
  trap - ERR
  if [[ -d "$previous" ]]; then
    systemctl stop talenta
    if [[ -d "$target" ]]; then mv "$target" "$stage.failed"; fi
    mv "$previous" "$target"
  fi
  systemctl start talenta
  echo "Rilis gagal. Cadangan: $backup" >&2
  exit "$status"
}
trap recover ERR
runuser -u postgres -- pg_dump -d db_magang --schema=management_talenta -Fc > "$backup/schema.dump"
test -s "$backup/schema.dump"
mv "$target" "$previous"
mv "$stage" "$target"
cd "$target"
runuser -u talenta -- /usr/bin/node --env-file="$config" --import tsx server/db/cli.ts migrate
systemctl start talenta
curl -fsS --retry 15 --retry-connrefused --retry-delay 1 --max-time 5 http://127.0.0.1:5015/api/health
curl -fsS --max-time 10 http://127.0.0.1:5015/ | grep -q '<title>Talenta BPS'
trap - ERR
mv "$previous" "$backup/app"
echo "Talenta BPS aktif. Cadangan: $backup"
