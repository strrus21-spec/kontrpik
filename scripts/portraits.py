"""Портреты героев: квадрат по центру из портрета Steam (256×144) → public/heroes/{slug}.webp, 144×144.

Запуск (нужны Python 3 и Pillow):  python3 scripts/portraits.py
Скачивает только недостающие. Если портрета нет, сайт показывает старую иконку из public/icons/.
"""
import io, json, os, re, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'heroes')
CDN = 'https://cdn.cloudflare.steamstatic.com'


def slug(name: str) -> str:  # как src/slug.ts
    s = re.sub(r"['’]", '', name.lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def main() -> None:
    from PIL import Image
    os.makedirs(ROOT, exist_ok=True)
    with urllib.request.urlopen('https://api.opendota.com/api/heroStats') as r:
        heroes = json.load(r)
    for h in heroes:
        out = os.path.join(ROOT, slug(h['localized_name']) + '.webp')
        if os.path.exists(out):
            continue
        with urllib.request.urlopen(CDN + h['img'].rstrip('?')) as r:
            im = Image.open(io.BytesIO(r.read())).convert('RGB')
        w, hh = im.size
        x = (w - hh) // 2
        im.crop((x, 0, x + hh, hh)).resize((144, 144), Image.LANCZOS).save(out, 'WEBP', quality=86, method=6)
        print('портрет:', h['localized_name'])


if __name__ == '__main__':
    main()
