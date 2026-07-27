#!/usr/bin/env bash
# Replace the hero portrait with a new source image.
#
#   ./scripts/set-portrait.sh ~/Downloads/new-portrait.jpg
#
# Converts to WebP at 2x the largest rendered size (440px card → 376px
# photo → 752px), writes src/assets/images/portrait.webp, and prints the
# intrinsic dimensions so index.html's width/height can be updated to
# match (they exist to reserve layout space and avoid a reflow on load).
set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: $0 <path-to-image>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
DEST="src/assets/images/portrait.webp"

command -v cwebp >/dev/null || { echo "cwebp not found — brew install webp" >&2; exit 1; }

cwebp -q 88 -resize 752 0 "$SRC" -o "$DEST" >/dev/null 2>&1

W=$(cwebp -version >/dev/null 2>&1 && python3 -c "
from PIL import Image; im=Image.open('$DEST'); print(im.size[0])")
H=$(python3 -c "
from PIL import Image; im=Image.open('$DEST'); print(im.size[1])")

printf 'wrote %s  %sx%s  %s\n' "$DEST" "$W" "$H" "$(du -h "$DEST" | cut -f1)"
printf '\nSet these on .portrait__img in index.html:\n  width="%s" height="%s"\n' "$W" "$H"
printf '\nFrame ratio is %s (--portrait-ar). Image ratio is %.3f.\n' "376/400 = 0.940" "$(python3 -c "print($W/$H)")"
printf 'If those are close, object-position on .portrait__img is doing nothing\n'
printf 'and can be dropped; if the image is much taller, keep it.\n'
