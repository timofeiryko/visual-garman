# Пересобрать гайд_оффлайн.html — единый офлайн-файл (двойной клик, без интернета).
# Вшивает React/ReactDOM/Babel/KaTeX + base64-шрифты (KaTeX + Google, с кириллицей)
# и весь app-JS из js/*. Запуск:  python _build_offline.py   (нужен интернет ОДИН раз).
import re, base64, urllib.request, pathlib, time, tempfile

PROJ = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path(tempfile.gettempdir()) / "furye_vendorcache"; CACHE.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}

def get(url, binary=False):
    key = CACHE / re.sub(r'[^\w.]', '_', url)[-150:]
    if key.exists():
        b = key.read_bytes(); return b if binary else b.decode("utf-8")
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                b = r.read()
            key.write_bytes(b); return b if binary else b.decode("utf-8")
        except Exception as e:
            last = e; time.sleep(1.5 * (attempt + 1))
    raise last

JS = {
    "react":      "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
    "react-dom":  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
    "babel":      "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js",
    "katex":      "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js",
    "autorender": "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js",
}
vendor_js = {k: get(u) for k, u in JS.items()}

katex_css = get("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css")
fk = {}
def inline_katex_font(m):
    name = m.group(1)
    if name not in fk:
        fk[name] = base64.b64encode(get("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/" + name, binary=True)).decode()
    return f'src:url(data:font/woff2;base64,{fk[name]}) format("woff2")'
katex_css = re.sub(r'src:url\(fonts/([\w.\-]+\.woff2)\) format\("woff2"\)[^;}]*', inline_katex_font, katex_css)

g_css = ""
try:
    g_url = ("https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400"
             "&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap")
    g_css = get(g_url)
    gf = {}
    def inline_g_font(m):
        u = m.group(1)
        if u not in gf: gf[u] = base64.b64encode(get(u, binary=True)).decode()
        return f"url(data:font/woff2;base64,{gf[u]})"
    g_css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', inline_g_font, g_css)
except Exception as e:
    g_css = ""; print("google fonts skipped -> system fallback:", e)

styles = (PROJ / "styles.css").read_text(encoding="utf-8")
index = (PROJ / "index.html").read_text(encoding="utf-8")
tmpl = re.search(r'<template id="__bundler_thumbnail".*?</template>', index, re.S)
thumbnail = tmpl.group(0) if tmpl else ""

PLAIN = ["plot-utils.js", "fourier-math.js", "content.js", "proofs-a.js", "proofs-b.js"]
JSX = ["viz-common.jsx", "viz-synthesis.jsx", "viz-winding.jsx", "viz-dirichlet.jsx",
       "viz-misc.jsx", "sections.jsx", "proof-page.jsx", "coursemap.jsx", "app.jsx"]
def js_tag(fn, babel=False):
    code = (PROJ / "js" / fn).read_text(encoding="utf-8")
    return f"<!-- {fn} -->\n<script{' type=\"text/babel\"' if babel else ''}>\n{code}\n</script>"

p = ["<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\">",
     '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
     "<title>Гармонический анализ (offline)</title>"]
if g_css: p.append(f"<style>\n{g_css}\n</style>")
p.append(f"<style>\n{katex_css}\n</style>")
p.append(f"<style>\n{styles}\n</style>")
p.append("</head>\n<body>\n<div id=\"root\"></div>")
for k in ["react", "react-dom", "babel", "katex", "autorender"]:
    p.append(f"<!-- vendor:{k} -->\n<script>\n{vendor_js[k]}\n</script>")
for fn in PLAIN: p.append(js_tag(fn, False))
for fn in JSX:   p.append(js_tag(fn, True))
p.append(thumbnail); p.append("</body>\n</html>")
html = "\n".join(p)

(PROJ / "гайд_оффлайн.html").write_text(html, encoding="utf-8")
n = len(html.encode("utf-8"))
nethits = re.findall(r'(?:src|href)\s*=\s*["\']https?://', html) + re.findall(r'url\(https?://', html)
print(f"OK: {n} bytes ({n//1024//1024}MB), network refs remaining: {len(nethits)}")
