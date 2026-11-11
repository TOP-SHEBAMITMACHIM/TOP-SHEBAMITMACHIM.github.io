#!/usr/bin/env bash
#
# מעלה את הבלוג לשרת האורקל (זה שקיצער רץ עליו), בכתובת blog.kitzear.qd.je.
#
# הרצה על השרת, כמשתמש ubuntu:
#   curl -fsSL https://raw.githubusercontent.com/TOP-SHEBAMITMACHIM/TOP-SHEBAMITMACHIM.github.io/main/deploy/setup-oracle.sh | bash
#
# מה זה עושה:
#   1. משכפל את הבלוג ל-/var/www/blog (או מעדכן אם כבר קיים)
#   2. מוסיף ל-Caddy בלוק נפרד לכתובת הבלוג — ההגדרה של קיצער לא נוגעת
#   3. מוסיף משימה שמושכת עדכונים מגיטהאב כל 5 דקות
#
# הרצה חוזרת בטוחה: לא מכפיל את ההגדרות.

set -euo pipefail

HOST="${BLOG_HOST:-blog.kitzear.qd.je}"
DIR="${BLOG_DIR:-/var/www/blog}"
REPO="https://github.com/TOP-SHEBAMITMACHIM/TOP-SHEBAMITMACHIM.github.io.git"
CADDYFILE=/etc/caddy/Caddyfile

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m[שגיאה] %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] && die "הרץ כמשתמש הרגיל (ubuntu), לא כ-root."
command -v caddy >/dev/null 2>&1 || die "Caddy לא מותקן בשרת הזה."

# ─────────────── 1. הקבצים ───────────────
if [ -d "$DIR/.git" ]; then
    log "מעדכן את הבלוג ב-$DIR"
    git -C "$DIR" pull -q --ff-only
else
    log "משכפל את הבלוג ל-$DIR"
    sudo install -d -o "$USER" -g "$USER" -m 755 "$DIR"
    git clone -q --depth 1 "$REPO" "$DIR"
fi

# ─────────────── 2. Caddy ───────────────
if sudo grep -q "^$HOST {" "$CADDYFILE"; then
    log "ל-Caddy כבר יש הגדרה ל-$HOST"
else
    log "מוסיף ל-Caddy את $HOST"
    sudo cp "$CADDYFILE" "$CADDYFILE.bak-$(date +%Y%m%d-%H%M%S)"
    sudo tee -a "$CADDYFILE" >/dev/null <<EOF

# הבלוג (אתר סטטי, מתעדכן מגיטהאב כל 5 דקות)
$HOST {
    encode zstd gzip
    root * $DIR
    @hidden path /.git /.git/* /deploy /deploy/*
    respond @hidden 404
    file_server
    handle_errors {
        rewrite * /404.html
        file_server
    }
}
EOF
fi
sudo caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null \
    || die "הגדרת Caddy לא תקינה. הגיבוי נשמר ליד $CADDYFILE"
sudo systemctl reload caddy

# ─────────────── 3. עדכון אוטומטי ───────────────
log "מגדיר משיכת עדכונים כל 5 דקות"
( crontab -l 2>/dev/null | grep -v '# blog-pull' || true
  echo "*/5 * * * * git -C $DIR pull -q --ff-only # blog-pull" ) | crontab -

# ─────────────── 4. בדיקה ───────────────
log "בודק"
code="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $HOST" http://127.0.0.1/ || true)"
printf '\n\033[1;32m==================================================\033[0m\n'
printf '  הבלוג הותקן ב-%s\n' "$DIR"
printf '  כתובת:  https://%s\n' "$HOST"
printf '  בדיקה מקומית: HTTP %s (308 = מפנה ל-HTTPS, תקין)\n' "$code"
printf '\n  אם הכתובת עוד לא נפתחת: ודא שבלוח של DigitalPlat יש רשומת A\n'
printf '  בשם blog שמפנה ל-%s\n' "$(curl -fsS --max-time 5 https://api.ipify.org || echo 'ה-IP של השרת')"
printf '\033[1;32m==================================================\033[0m\n\n'
