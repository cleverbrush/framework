#!/usr/bin/env bash
set -euo pipefail

# snapshot-docs.sh — Snapshot generated API docs for the current version.
#
# Usage:
#   npm run docs:snapshot          # uses version from root package.json
#   ./scripts/snapshot-docs.sh     # same
#   VERSION=1.2.3 ./scripts/snapshot-docs.sh   # override version

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$ROOT_DIR/website/public/api-docs"
LATEST_DIR="$DOCS_DIR/latest"

# Determine version
if [[ -z "${VERSION:-}" ]]; then
    VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
fi

TARGET_DIR="$DOCS_DIR/v$VERSION"

# Ensure latest docs exist
if [[ ! -d "$LATEST_DIR" ]]; then
    echo "Error: $LATEST_DIR does not exist. Run 'npm run docs' first."
    exit 1
fi

# Prevent overwriting an existing snapshot
if [[ -d "$TARGET_DIR" ]]; then
    echo "Error: $TARGET_DIR already exists. Remove it first if you want to regenerate."
    exit 1
fi

# Copy latest → versioned snapshot
echo "Snapshotting docs v$VERSION..."
cp -r "$LATEST_DIR" "$TARGET_DIR"

# Build versions.json from existing versioned directories
echo "Updating versions.json..."
VERSIONS_JSON="$DOCS_DIR/versions.json"
VERSIONS=()
for dir in "$DOCS_DIR"/v*/; do
    [[ -d "$dir" ]] || continue
    dirname=$(basename "$dir")
    VERSIONS+=("$dirname")
done

# Sort versions in reverse order (newest first)
IFS=$'\n' SORTED=($(printf '%s\n' "${VERSIONS[@]}" | sort -rV)); unset IFS

# Write versions.json
printf '[\n' > "$VERSIONS_JSON"
for i in "${!SORTED[@]}"; do
    v="${SORTED[$i]}"
    comma=","
    if (( i == ${#SORTED[@]} - 1 )); then comma=""; fi
    printf '  { "version": "%s", "path": "%s/index.html" }%s\n' "$v" "$v" "$comma" >> "$VERSIONS_JSON"
done
printf ']\n' >> "$VERSIONS_JSON"

# Generate the version picker index.html
echo "Generating version picker..."
cat > "$DOCS_DIR/index.html" << 'PICKER_HEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>API Reference — Version History</title>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WRLXDMG');</script>
    <!-- End Google Tag Manager -->
    <style>
        :root { --bg: #1e1e2e; --surface: #282840; --text: #cdd6f4; --accent: #89b4fa; --accent-hover: #74c7ec; --border: #45475a; --muted: #a6adc8; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .subtitle { color: var(--muted); margin-bottom: 2rem; font-size: 1.1rem; }
        .latest-btn { display: inline-block; padding: 0.8rem 2rem; background: var(--accent); color: var(--bg); font-weight: 600; font-size: 1.1rem; border-radius: 8px; text-decoration: none; margin-bottom: 2.5rem; transition: background 0.2s; }
        .latest-btn:hover { background: var(--accent-hover); }
        .versions { width: 100%; max-width: 480px; }
        .versions h2 { font-size: 1.1rem; color: var(--muted); margin-bottom: 0.8rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
        .version-list { list-style: none; }
        .version-list li { border-bottom: 1px solid var(--border); }
        .version-list a { display: block; padding: 0.7rem 0.5rem; color: var(--accent); text-decoration: none; transition: background 0.15s; border-radius: 4px; }
        .version-list a:hover { background: var(--surface); }
        .back-link { margin-top: 2rem; color: var(--muted); font-size: 0.9rem; }
        .back-link a { color: var(--accent); text-decoration: none; }
        .back-link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WRLXDMG" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
    <h1>API Reference</h1>
    <p class="subtitle">Cleverbrush Framework — Libraries Documentation</p>
    <a class="latest-btn" href="./latest/index.html">View Latest Documentation</a>
    <div class="versions">
        <h2>Previous Versions</h2>
        <ul class="version-list" id="version-list">
            <noscript><li>Enable JavaScript to see version list, or browse directories manually.</li></noscript>
        </ul>
    </div>
    <p class="back-link"><a href="/">← Back to Website</a></p>
PICKER_HEAD

# Inject version entries as static HTML (no JS required at runtime)
for i in "${!SORTED[@]}"; do
    v="${SORTED[$i]}"
    printf '    <!-- version-entry -->\n' >> "$DOCS_DIR/index.html"
    printf '    <script>document.getElementById("version-list").innerHTML += '\''<li><a href="./%s/index.html">%s</a></li>'\'';</script>\n' "$v" "$v" >> "$DOCS_DIR/index.html"
done

# Also add a noscript-friendly static list
{
    printf '    <noscript>\n'
    printf '    <style>#version-list noscript { display: none; }</style>\n'
    for v in "${SORTED[@]}"; do
        printf '    <li><a href="./%s/index.html">%s</a></li>\n' "$v" "$v"
    done
    printf '    </noscript>\n'
} >> "$DOCS_DIR/index.html"

cat >> "$DOCS_DIR/index.html" << 'PICKER_TAIL'
</body>
</html>
PICKER_TAIL

echo "Done! Docs v$VERSION snapshotted to $TARGET_DIR"
echo "Files updated: versions.json, index.html"
