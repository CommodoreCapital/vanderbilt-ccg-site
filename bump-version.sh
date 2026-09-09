#!/bin/bash
# Force every browser to pick up new CSS/JS.
#
# Browsers and Cloudflare cache files by URL. Because site.css and site.js keep
# the same name forever, a changed file can still be served from a cache. This
# stamps a new ?v=... on every CSS/JS link, which makes it a different URL, so
# caches have no choice but to fetch it fresh.
#
# Run this whenever you change a file in assets/css or assets/js, then upload
# the changed .html files along with it.
#
#   bash bump-version.sh
#
V=$(date +%Y%m%d%H%M)
cd "$(dirname "$0")"
for f in *.html; do
  # add ?v=... if missing, or replace the existing one
  perl -pi -e 's{(assets/(?:css|js)/[a-z-]+\.(?:css|js))(\?v=[0-9]+)?}{$1?v='"$V"'}g' "$f"
done
echo "Stamped version $V on:"
grep -ho 'assets/\(css\|js\)/[a-z-]*\.\(css\|js\)?v=[0-9]*' *.html | sort -u | sed 's/^/  /'
echo
echo "Now upload the .html files (and the changed css/js) to GitHub."
