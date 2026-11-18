"""Install exact higher-resolution originals and responsive variants; no pixel editing."""
import json
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
report = json.loads((root / 'assets-review/high-resolution-report.json').read_text(encoding='utf-8'))
data_path = root / 'dist/hotel-data.js'
source = data_path.read_text(encoding='utf-8')
data = json.loads(source.split('window.HOTEL_DATA = ', 1)[1].strip().removesuffix(';'))
by_id = {photo['id']: photo for photo in data['photos']}
(root / 'dist/assets/photos/small').mkdir(parents=True, exist_ok=True)

for item in report['photos']:
    assert item['status'] == 'success'
    photo = by_id[item['id']]
    shutil.copyfile(root / item['downloadPath'], root / 'dist' / photo['src'])
    photo['width'], photo['height'] = item['width'], item['height']
    if item['small']['width'] < item['width']:
        photo['smallSrc'] = f"assets/photos/small/{item['id']}.jpg"
        photo['smallWidth'] = item['small']['width']
        shutil.copyfile(root / item['small']['path'], root / 'dist' / photo['smallSrc'])

data_path.write_text('// Hotel details, featured photos, and responsive image sources.\n'
    '// Photos recovered at higher resolution from the exact supplied Google photo IDs.\n'
    '// Rating and review count are the supplied snapshot, not a live feed.\n'
    'window.HOTEL_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

html_path = root / 'dist/index.html'
html = html_path.read_text(encoding='utf-8')
def update_featured(match):
    tag = match.group(0)
    role = re.search(r'data-photo="([^"]+)"', tag).group(1)
    photo = by_id[data['featured'][role]]
    tag = re.sub(r'width="\d+"', f'width="{photo["width"]}"', tag)
    tag = re.sub(r'height="\d+"', f'height="{photo["height"]}"', tag)
    tag = re.sub(r'\s+(?:srcset|sizes)="[^"]*"', '', tag)
    if photo.get('smallSrc'):
        sizes = '100vw' if role == 'hero' else '(max-width: 600px) 86vw, (max-width: 800px) 50vw, 600px'
        tag = tag[:-1] + f' srcset="{photo["smallSrc"]} {photo["smallWidth"]}w, {photo["src"]} {photo["width"]}w" sizes="{sizes}">'
    return tag
html = re.sub(r'<img\b[^>]*\bdata-photo="[^"]+"[^>]*>', update_featured, html)
hero = by_id[data['featured']['hero']]
html = html.replace('as="image" fetchpriority="high">', f'as="image" fetchpriority="high" imagesrcset="{hero["smallSrc"]} {hero["smallWidth"]}w, {hero["src"]} {hero["width"]}w" imagesizes="100vw">')
html_path.write_text(html, encoding='utf-8')
print(f'Installed {len(by_id)} exact high-resolution photos and responsive sources.')
