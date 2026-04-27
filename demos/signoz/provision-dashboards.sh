#!/bin/sh
# Idempotent SigNoz dashboard provisioner.
# Runs once after SigNoz is healthy; safe to re-run (skips existing dashboards).

SIGNOZ_URL="${SIGNOZ_URL:-http://signoz:8080}"
ADMIN_EMAIL="${SIGNOZ_ADMIN_EMAIL:-admin@todo.local.com}"
ADMIN_PASSWORD="${SIGNOZ_ADMIN_PASSWORD:-Admin1234!}"

echo "==> Waiting for SigNoz at $SIGNOZ_URL..."
until curl -sf "$SIGNOZ_URL/api/v1/health" > /dev/null; do
  echo "    Not ready yet, retrying in 5s..."
  sleep 5
done
echo "==> SigNoz is healthy."

# Register the admin account (returns 400/409 when it already exists — both are fine).
echo "==> Registering admin user (idempotent)..."
curl -s -X POST "$SIGNOZ_URL/api/v1/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"name\":\"Admin\",\"orgName\":\"My Org\",\"password\":\"$ADMIN_PASSWORD\"}" \
  > /dev/null

# Authenticate and extract the JWT.
echo "==> Authenticating..."
LOGIN_RESP=$(curl -sf -X POST "$SIGNOZ_URL/api/v1/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(printf '%s' "$LOGIN_RESP" | grep -o '"accessJwt":"[^"]*"' | sed 's/"accessJwt":"//;s/"//g')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not obtain JWT. Login response:"
  echo "$LOGIN_RESP"
  exit 1
fi
echo "==> Authenticated."

# Fetch already-provisioned dashboards (we check by uuid to stay idempotent).
EXISTING=$(curl -sf -H "Authorization: Bearer $TOKEN" "$SIGNOZ_URL/api/v1/dashboards")

# Provision each dashboard file.
for DASHBOARD_FILE in /dashboards/*.json; do
  TITLE=$(grep -o '"title":"[^"]*"' "$DASHBOARD_FILE" | head -1 | sed 's/"title":"//;s/"$//;s/^"//')
  UUID=$(grep  -o '"uuid":"[^"]*"'  "$DASHBOARD_FILE" | head -1 | sed 's/"uuid":"//;s/"$//;s/^"//')

  if printf '%s' "$EXISTING" | grep -q "\"uuid\":\"$UUID\""; then
    echo "==> Dashboard '$TITLE' already exists, skipping."
    continue
  fi

  echo "==> Creating dashboard '$TITLE'..."
  TMP=$(mktemp)
  printf '{"data":' > "$TMP"
  cat "$DASHBOARD_FILE" >> "$TMP"
  printf '}'        >> "$TMP"

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$SIGNOZ_URL/api/v1/dashboards" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "@$TMP")

  rm -f "$TMP"

  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
    echo "    Created (HTTP $HTTP_STATUS)."
  else
    echo "    WARNING: Unexpected HTTP $HTTP_STATUS for '$TITLE'."
  fi
done

echo "==> Dashboard provisioning complete."
