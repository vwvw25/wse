#!/bin/bash
# Run the WSE Accounts agent (Lucy) heartbeat

set -e

export PATH="/Users/victoriaward/.nvm/versions/node/v20.20.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENV_FILE="$SCRIPT_DIR/../../.env.local"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

export WSE_URL="${NEXT_PUBLIC_APP_URL:-https://wse-gamma.vercel.app}"
export WSE_SECRET="$CRON_SECRET"
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

claude \
  --print \
  --verbose \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --system-prompt "$(cat "$SCRIPT_DIR/SOUL.md")" \
  "$(cat "$SCRIPT_DIR/HEARTBEAT.md")

Your instruction files are at $SCRIPT_DIR — read TOOLS.md before starting work."
