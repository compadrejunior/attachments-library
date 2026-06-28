#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <vault-path>" >&2
  exit 1
fi

VAULT="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for file in main.js manifest.json; do
  if [[ ! -f "$SCRIPT_DIR/$file" ]]; then
    echo "Error: missing '$file' — run 'npm run build' first." >&2
    exit 1
  fi
done

if [[ ! -d "$VAULT" ]]; then
  echo "Error: vault not found: $VAULT" >&2
  exit 1
fi

PLUGIN_DIR="$VAULT/.obsidian/plugins/attachments-library"
mkdir -p "$PLUGIN_DIR"

cp "$SCRIPT_DIR/main.js"      "$PLUGIN_DIR/main.js"
cp "$SCRIPT_DIR/manifest.json" "$PLUGIN_DIR/manifest.json"

echo "Installed to $PLUGIN_DIR"
echo "Reload the plugin in Obsidian: Settings -> Community Plugins -> disable -> re-enable Attachments Library"
