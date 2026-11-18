"""Download the requested Latin Google Fonts for local website serving."""

from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "dist" / "assets" / "fonts"
CSS_PATH = ROOT / "dist" / "fonts.css"
FONT_URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500"
    "&family=DM+Sans:wght@400;500;600&display=swap"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/130.0.0.0 Safari/537.36"
    )
}


def fetch(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def main():
    source_css = fetch(FONT_URL).decode("utf-8")
    blocks = re.findall(r"/\* latin \*/\s*(@font-face\s*\{[^}]+\})", source_css)
    if not blocks:
        raise RuntimeError("Google Fonts returned no Latin font-face blocks")

    FONT_DIR.mkdir(parents=True, exist_ok=True)
    known_urls = {}
    output = ["/* Self-hosted Latin fonts from Google Fonts. font-display: swap. */"]
    for block in blocks:
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        style = re.search(r"font-style:\s*([^;]+)", block).group(1)
        weight = re.search(r"font-weight:\s*([^;]+)", block).group(1)
        url = re.search(r"url\((https://[^)]+)\)", block).group(1)
        if ".woff2" not in url:
            raise RuntimeError("Expected an efficient WOFF2 font response")
        if url not in known_urls:
            family_slug = family.lower().replace(" ", "-")
            filename = f"{family_slug}-{style}-{weight.replace(' ', '-')}-latin.woff2"
            data = fetch(url)
            if data[:4] != b"wOF2":
                raise RuntimeError(f"Invalid WOFF2 response for {family}")
            (FONT_DIR / filename).write_bytes(data)
            known_urls[url] = filename
            print(f"Downloaded {filename}: {len(data)} bytes")
        block = block.replace(url, "assets/fonts/" + known_urls[url])
        output.append(block)
    CSS_PATH.write_text("\n\n".join(output) + "\n", encoding="utf-8")
    for family in ("cormorantgaramond", "dmsans"):
        license_url = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt"
        (FONT_DIR / f"{family}-OFL.txt").write_bytes(fetch(license_url))
    print(f"Saved {len(blocks)} font faces, {len(known_urls)} unique WOFF2 files")


if __name__ == "__main__":
    main()
