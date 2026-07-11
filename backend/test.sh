#!/usr/bin/env bash
# Smoke test the API with curl. Usage: bash test.sh [BASE_URL]
set -e
BASE="${1:-http://localhost:4000}"
jq_or_cat() { command -v jq >/dev/null && jq "$@" || cat; }

echo "== health =="; curl -s "$BASE/health"; echo
echo "== categories =="; curl -s "$BASE/api/categories" | head -c 200; echo
echo "== services =="; curl -s "$BASE/api/services" | head -c 200; echo
echo "== banners =="; curl -s "$BASE/api/banners" | head -c 200; echo

echo "== admin login =="
ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@masrguide.com","password":"admin123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
echo "token: ${ADMIN_TOKEN:0:24}..."

echo "== admin overview =="
curl -s "$BASE/api/admin/overview" -H "Authorization: Bearer $ADMIN_TOKEN" | head -c 300; echo

echo "== vendor login + services =="
VENDOR_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"vendor@rodina.com","password":"vendor123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s "$BASE/api/bookings" -H "Authorization: Bearer $VENDOR_TOKEN" | head -c 200; echo

echo "== done =="
