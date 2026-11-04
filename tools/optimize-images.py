"""tools/optimize-images.py — dev-only image encoder for the deployment weight.

Not part of serving or testing: the site is plain static files and `npm test`
never runs this. Run it by hand after adding or re-importing a photograph:

    python tools/optimize-images.py
    python tools/optimize-images.py --force   # re-encode even when output is newer

What it writes, next to each source and without deleting the source:

  files/*.jpg              -> <stem>.webp   (quality 82; the page points at it)
  files/plugins/*.jpg      -> <stem>.webp
  files/painting-hero.jpg  -> painting-hero.webp + painting-hero.avif
  files/painting.jpg       -> painting.webp      + painting.avif

The two paintings keep their JPEG as the last fallback in css/styles.css's
`image-set()`; every other photograph is served as WebP. `files/og-card.jpg`
stays JPEG because social crawlers do not all accept WebP, `files/profile.jpg`
stays JPEG because WebP came out larger for that 585px portrait, and
`files/posters/` stays JPEG because `Site.posterFor` derives `.jpg` paths.

Requires Python 3 with Pillow built with WebP and AVIF support (Pillow 12.x
ships both). If Pillow is missing: `pip install pillow` — this is a machine
tool, not a project dependency.
"""
import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - machine setup
    sys.exit('Pillow is required: pip install pillow')

ROOT = Path(__file__).resolve().parent.parent
FILES = ROOT / 'files'

PHOTO_QUALITY = 82
PAINTING_WEBP_QUALITY = 80
PAINTING_AVIF_QUALITY = 50
# AVIF q50 is ~578 KB for the 3000px hero (about 33 dB PSNR against the JPEG
# source) and keeps the painting's texture; WebP q80 is the larger fallback.
# Raise this to 60 if banding ever shows in the sky, at about 930 KB.

PAINTINGS = ['painting-hero', 'painting']
# Kept as JPEG: social crawlers (og-card), generated poster frames, and the
# small portrait (585px, where WebP came out larger than the JPEG).
KEEP_JPEG = {FILES / 'og-card.jpg', FILES / 'profile.jpg'}

parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--force', action='store_true', help='re-encode even if the output is newer than the source')
args = parser.parse_args()


def report(label, src, out):
    before = src.stat().st_size
    after = out.stat().st_size
    saved = 100 - after * 100 // before
    print(f'  {label:<5} {src.name:<28} {before // 1024:>5} KB -> {out.name:<28} {after // 1024:>5} KB ({saved:>2}% smaller)')


def encode(src, out, fmt, **opts):
    if not args.force and out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return False
    with Image.open(src) as im:
        im = im.convert('RGB')
        im.save(out, fmt, **opts)
    return True


def photos():
    print('photographs -> WebP')
    total_before = total_after = 0
    for src in sorted(FILES.rglob('*.jpg')):
        if src in KEEP_JPEG or src.parent.name == 'posters':
            continue
        out = src.with_suffix('.webp')
        if encode(src, out, 'WEBP', quality=PHOTO_QUALITY, method=6):
            report('webp', src, out)
        total_before += src.stat().st_size
        total_after += out.stat().st_size
    print(f'  {"photos":<22} {"":<26} {total_before // 1024:>6} KB -> {"webp":<26} {total_after // 1024:>6} KB')


def paintings():
    print('paintings -> WebP + AVIF (JPEG kept as the last fallback)')
    for stem in PAINTINGS:
        src = FILES / f'{stem}.jpg'
        webp = FILES / f'{stem}.webp'
        avif = FILES / f'{stem}.avif'
        if encode(src, webp, 'WEBP', quality=PAINTING_WEBP_QUALITY, method=6):
            report('webp', src, webp)
        if encode(src, avif, 'AVIF', quality=PAINTING_AVIF_QUALITY, speed=4):
            report('avif', src, avif)


if __name__ == '__main__':
    photos()
    paintings()
    print('done')
