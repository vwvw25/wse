#!/bin/bash
# Run the WSE CEO agent heartbeat

set -e

# launchd strips PATH — restore nvm node + homebrew so claude and npx are found
export PATH="/Users/victoriaward/.nvm/versions/node/v20.20.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load env from project root .env.local
ENV_FILE="$SCRIPT_DIR/../../.env.local"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

# Map to the names TOOLS.md expects
export WSE_URL="${NEXT_PUBLIC_APP_URL:-https://wse-gamma.vercel.app}"
export WSE_SECRET="$CRON_SECRET"
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# Run Claude Code with the CEO instructions, pipe output through parser
claude \
  --print \
  --verbose \
  --output-format stream-json \
  --dangerously-skip-permissions \
  --system-prompt "$(cat "$SCRIPT_DIR/SOUL.md")" \
  "$(cat "$SCRIPT_DIR/HEARTBEAT.md")

Your instruction files are at $SCRIPT_DIR — read AGENTS.md and TOOLS.md before starting work."
