#!/usr/bin/env sh
set -u

MIN_NODE_MAJOR=20
MIN_LARK_CLI="1.0.39"
STATUS=0
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

note() {
  printf '%s\n' "$*"
}

fail() {
  STATUS=1
  printf 'FAIL: %s\n' "$*"
}

pass() {
  printf 'OK: %s\n' "$*"
}

version_ge() {
  awk -v left="$1" -v right="$2" 'BEGIN {
    split(left, a, ".");
    split(right, b, ".");
    for (i = 1; i <= 3; i++) {
      av = a[i] + 0;
      bv = b[i] + 0;
      if (av > bv) exit 0;
      if (av < bv) exit 1;
    }
    exit 0;
  }'
}

note "Family Finance environment bootstrap"
note "Required runtime: Node.js 20+, npm/npx, lark-cli >= ${MIN_LARK_CLI}"

if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -p "process.versions.node" 2>/dev/null || printf 'unknown')
  NODE_MAJOR=$(printf '%s' "$NODE_VERSION" | awk -F. '{print $1 + 0}')
  if [ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ]; then
    pass "Node.js ${NODE_VERSION}"
  else
    fail "Node.js ${NODE_VERSION}; Node.js 20 or newer is required"
  fi
else
  fail "Node.js 20 or newer not found on PATH"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm $(npm -v 2>/dev/null)"
else
  fail "npm not found on PATH; install Node.js with npm"
fi

if command -v npx >/dev/null 2>&1; then
  pass "npx $(npx -v 2>/dev/null)"
else
  fail "npx not found on PATH; npx skills installation needs it"
fi

if command -v lark-cli >/dev/null 2>&1; then
  LARK_VERSION=$(lark-cli --version 2>/dev/null | sed -n 's/.*\([0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*\).*/\1/p' | head -n 1)
  if [ -n "$LARK_VERSION" ] && version_ge "$LARK_VERSION" "$MIN_LARK_CLI"; then
    pass "lark-cli ${LARK_VERSION}"
  else
    fail "lark-cli ${LARK_VERSION:-unknown}; lark-cli >= ${MIN_LARK_CLI} is required"
  fi
else
  fail "lark-cli not found on PATH"
fi

if command -v zip >/dev/null 2>&1; then
  pass "zip available for template regeneration"
else
  note "OPTIONAL: zip not found; ordinary ledger work is OK, template regeneration is blocked"
fi

if command -v node >/dev/null 2>&1; then
  note "Running stricter Node check: check-env.mjs"
  node "$SCRIPT_DIR/check-env.mjs" || STATUS=1
else
  note "Skipping check-env.mjs because Node.js is missing"
fi

exit "$STATUS"
