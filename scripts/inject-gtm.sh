#!/usr/bin/env bash
set -euo pipefail

# inject-gtm.sh — Inject Google Tag Manager into all HTML files in a directory.
#
# Usage:
#   ./scripts/inject-gtm.sh <directory> [GTM_ID]
#
# If GTM_ID is not provided, defaults to GTM-WRLXDMG.

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <directory> [GTM_ID]"
    exit 1
fi

TARGET_DIR="$1"
GTM_ID="${2:-GTM-WRLXDMG}"

if [[ ! -d "$TARGET_DIR" ]]; then
    echo "Error: $TARGET_DIR is not a directory."
    exit 1
fi

COUNT=0
while IFS= read -r -d '' file; do
    # Skip files that already have GTM injected
    if grep -q "googletagmanager.com/gtm.js" "$file" 2>/dev/null; then
        continue
    fi

    perl -i -pe '
        BEGIN { $id = shift }
        s{</head>}{<!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","$id");</script><!-- End Google Tag Manager --></head>};
        s{(<body[^>]*>)}{$1<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=$id" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->};
    ' "$GTM_ID" "$file"

    COUNT=$((COUNT + 1))
done < <(find "$TARGET_DIR" -name '*.html' -type f -print0)

echo "GTM ($GTM_ID) injected into $COUNT HTML file(s) in $TARGET_DIR"
