"""Recover higher-resolution copies of the exact photo IDs in the supplied ZIP.

No pixel editing, retouching, or synthetic generation. Outputs source downloads
and a provenance report; the website assets are not modified by this script.
"""
import concurrent.futures
import hashlib
import io
import json
import pathlib
import re
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
REVIEW = ROOT / 'assets-review'
DEST = REVIEW / 'high-res-originals'
DEST.mkdir(exist_ok=True)
SMALL = REVIEW / 'high-res-small'
SMALL.mkdir(exist_ok=True)
CATALOG = json.loads((REVIEW / 'photo-catalog.json').read_text(encoding='utf-8'))

def recover(photo):
    token = re.search(r'imgi_\d+_(.*?)=', photo['sourceArchivePath']).group(1)
    url = f'https://lh3.googleusercontent.com/gps-cs-s/{token}=w1600-h1600-k-no'
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            raw = response.read()
        with Image.open(io.BytesIO(raw)) as image:
            width, height = image.size
            image.verify()
        destination = DEST / f"{photo['id']}.jpg"
        destination.write_bytes(raw)
        small_url = url.replace('=w1600-h1600-k-no', '=w640-h1600-k-no')
        small_request = urllib.request.Request(small_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(small_request, timeout=40) as response:
            small_raw = response.read()
        with Image.open(io.BytesIO(small_raw)) as image:
            small_width, small_height = image.size
            image.verify()
        small_destination = SMALL / f"{photo['id']}.jpg"
        small_destination.write_bytes(small_raw)
        return {
            'id': photo['id'], 'sourceIndex': photo['sourceIndex'],
            'originalZipPath': photo['sourceArchivePath'], 'downloadUrl': url,
            'downloadPath': str(destination.relative_to(ROOT)).replace('\\', '/'),
            'originalWebsitePath': photo['src'],
            'thumbnailWidth': photo['width'], 'thumbnailHeight': photo['height'],
            'width': width, 'height': height, 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'pixelIncrease': round(width * height / (photo['width'] * photo['height']), 1),
            'small': {
                'url': small_url,
                'path': str(small_destination.relative_to(ROOT)).replace('\\', '/'),
                'width': small_width, 'height': small_height, 'bytes': len(small_raw),
            },
            'status': 'success',
        }
    except Exception as error:
        return {'id': photo['id'], 'downloadUrl': url, 'status': 'failed', 'error': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    photos = list(executor.map(recover, CATALOG['photos']))

report = {
    'method': 'Higher-resolution download of exact Google photo IDs from supplied ZIP filenames.',
    'processing': 'No pixel editing, upscaling, retouching, generated details, or watermark removal.',
    'framingNote': 'The ZIP contains cropped thumbnails. Downloads restore the same photograph at its full original aspect ratio.',
    'photos': photos,
    'successCount': sum(p['status'] == 'success' for p in photos),
    'totalBytes': sum(p.get('bytes', 0) for p in photos),
    'smallTotalBytes': sum(p.get('small', {}).get('bytes', 0) for p in photos),
}
(REVIEW / 'high-resolution-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
for p in photos:
    print(f"{p['id']}: {p.get('thumbnailWidth', '?')}x{p.get('thumbnailHeight', '?')} -> {p.get('width', '?')}x{p.get('height', '?')} ({p['status']})")
print(f"Recovered {report['successCount']}/{len(photos)} photos; {report['totalBytes']} bytes total.")
