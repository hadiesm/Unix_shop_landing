from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "category"
BASE_URL = "https://unix-shop.ir"

# Stable, readable slugs. Category IDs remain the source of truth so renaming a
# category in the ERP does not silently change its URL.
CATEGORY_SLUGS = {
    1: "laptop",
    2: "accessories",
    3: "lenovo-laptop",
    4: "asus-laptop",
    5: "hp-laptop",
    6: "acer-laptop",
    7: "stock-laptop",
    8: "used-laptop",
    9: "mouse",
    10: "wired-mouse",
    11: "wireless-mouse",
    12: "cooling-pad",
    13: "gamepad",
    14: "wired-gamepad",
    15: "wireless-gamepad",
    16: "mouse-pad",
    17: "adapter",
    18: "keyboard-stickers",
    19: "laptop-bag",
    20: "monitor",
    21: "innoverse-monitor",
    22: "gaming-wheel",
    23: "twisted-minds-monitor",
    24: "aoc-monitor",
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_id(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def descendants(category_id: int, by_id: dict[int, dict], children: dict[int | None, list[dict]]) -> set[int]:
    result = {category_id}
    stack = [category_id]
    while stack:
        current = stack.pop()
        for child in children.get(current, []):
            cid = normalize_id(child.get("id"))
            if cid is not None and cid not in result:
                result.add(cid)
                stack.append(cid)
    return result


def category_path(category_id: int, by_id: dict[int, dict]) -> list[dict]:
    result: list[dict] = []
    seen: set[int] = set()
    current = by_id.get(category_id)
    while current:
        cid = normalize_id(current.get("id"))
        if cid is None or cid in seen:
            break
        seen.add(cid)
        result.insert(0, current)
        parent = normalize_id(current.get("parent_id"))
        current = by_id.get(parent) if parent is not None else None
    return result


def category_url(category_id: int) -> str | None:
    slug = CATEGORY_SLUGS.get(int(category_id))
    return f"/category/{slug}/" if slug else None


def product_url(code: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]+", "-", code).strip("-").lower()
    return f"/products/{safe}/"


def spec_summary(product: dict, specs: dict) -> str:
    spec = specs.get(str(product.get("id"))) or {}
    pieces: list[str] = []
    basic = spec.get("basic") or {}
    processor = spec.get("processor") or {}
    memory = spec.get("memory") or {}
    storage = spec.get("storage") or {}
    display = spec.get("display") or {}
    graphics = spec.get("graphics") or {}

    for value in (basic.get("brand"), basic.get("model")):
        if clean(value):
            pieces.append(clean(value))
    if clean(processor.get("model")):
        pieces.append(clean(processor["model"]))
    if memory.get("capacity_gb"):
        pieces.append(f"رم {clean(memory['capacity_gb'])} گیگابایت")
    if storage.get("capacity_gb"):
        pieces.append(f"حافظه {clean(storage['capacity_gb'])} گیگابایت")
    if display.get("size_inch"):
        pieces.append(f"نمایشگر {clean(display['size_inch'])} اینچ")
    if graphics.get("model_gpu"):
        pieces.append(clean(graphics["model_gpu"]))
    return "، ".join(pieces[:5])


def category_title(name: str, parent: str | None) -> str:
    if name == "لپ تاپ":
        return "لپ‌تاپ | مشخصات، قیمت و موجودی لپ تاپ در ارومیه | یونیکس شاپ"
    if name == "لوازم جانبی":
        return "لوازم جانبی لپ تاپ و کامپیوتر | مشخصات و قیمت | یونیکس شاپ"
    if name == "مانیتور":
        return "مانیتور | مشخصات، قیمت و موجودی مانیتور در ارومیه | یونیکس شاپ"
    if parent == "لپ تاپ":
        return f"لپ‌تاپ {name} | مشخصات و قیمت مدل‌های {name} | یونیکس شاپ"
    if parent == "لوازم جانبی":
        return f"{name} | مشخصات و قیمت {name} | یونیکس شاپ"
    if parent == "مانیتور":
        return f"مانیتور {name} | مشخصات و قیمت | یونیکس شاپ"
    return f"{name} | مشخصات و قیمت محصولات | یونیکس شاپ"


def category_description(name: str, parent: str | None, count: int) -> str:
    if name == "لپ تاپ":
        return f"مشاهده {count} مدل لپ‌تاپ فعال در یونیکس شاپ؛ مشخصات فنی، قیمت و وضعیت موجودی مدل‌های مختلف برای بررسی در ارومیه."
    if name == "لوازم جانبی":
        return f"مشاهده {count} محصول از لوازم جانبی لپ‌تاپ و کامپیوتر در یونیکس شاپ؛ ماوس، کول‌پد، کیف، تبدیل و سایر تجهیزات با مشخصات و قیمت."
    if name == "مانیتور":
        return f"مشاهده {count} مدل مانیتور در یونیکس شاپ؛ بررسی مشخصات فنی، اندازه، رزولوشن، برند، قیمت و وضعیت موجودی مانیتورها."
    if parent == "لپ تاپ":
        return f"مدل‌های لپ‌تاپ {name} در یونیکس شاپ؛ مشخصات فنی، قیمت و وضعیت موجودی مدل‌های فعال را بررسی و برای مقایسه باز کنید."
    if parent == "لوازم جانبی":
        return f"محصولات دسته {name} در یونیکس شاپ؛ مشاهده مشخصات، قیمت و موجودی محصولات فعال و ورود به صفحه هر محصول برای اطلاعات کامل‌تر."
    if parent == "مانیتور":
        return f"مانیتورهای برند {name} در یونیکس شاپ؛ مشخصات فنی، اندازه، رزولوشن، قیمت و موجودی مدل‌های فعال را مشاهده کنید."
    return f"مشاهده محصولات {name} در یونیکس شاپ با مشخصات فنی، قیمت و وضعیت موجودی."


def category_intro(name: str, parent: str | None, count: int) -> str:
    if name == "لپ تاپ":
        return "در این صفحه فهرست لپ‌تاپ‌های فعال یونیکس شاپ را می‌بینید. برای هر مدل، صفحه اختصاصی با مشخصات فنی و اطلاعات به‌روز قیمت و موجودی در دسترس است."
    if name == "لوازم جانبی":
        return "در این صفحه می‌توانید لوازم جانبی لپ‌تاپ و کامپیوتر را بر اساس دسته‌بندی بررسی کنید و برای دیدن جزئیات هر محصول وارد صفحه اختصاصی آن شوید."
    if name == "مانیتور":
        return "این صفحه فهرست مانیتورهای موجود در کاتالوگ یونیکس شاپ را جمع‌آوری می‌کند تا بتوانید مدل‌ها، مشخصات فنی و صفحات اختصاصی آن‌ها را سریع‌تر بررسی کنید."
    if parent == "لپ تاپ":
        return f"در دسته لپ‌تاپ {name}، مدل‌های فعال یونیکس شاپ را همراه با مشخصات کلیدی و لینک صفحه اختصاصی هر محصول مشاهده می‌کنید."
    if parent == "لوازم جانبی":
        return f"این صفحه محصولات دسته {name} را در یک فهرست قابل بررسی جمع‌آوری کرده و برای هر محصول به صفحه اختصاصی آن لینک می‌دهد."
    if parent == "مانیتور":
        return f"در این صفحه مدل‌های مانیتور برند {name} را همراه با مشخصات اصلی و لینک صفحه اختصاصی هر محصول مشاهده می‌کنید."
    return f"فهرست محصولات {name} در یونیکس شاپ با لینک مستقیم به صفحه هر محصول و اطلاعات قابل بررسی."


def visible_children(category_id: int, children: dict[int | None, list[dict]], active_product_ids: set[int]) -> list[dict]:
    result = []
    for child in children.get(category_id, []):
        cid = normalize_id(child.get("id"))
        if cid is None:
            continue
        # Include a child when it contains at least one active product.
        if active_product_ids.intersection({cid}):
            result.append(child)
        else:
            result.append(child)  # parent categories can still be useful navigation
    return result


def render_child_nav(path: list[dict], children: dict[int | None, list[dict]], product_category_ids: set[int], descendants_cache: dict[int, set[int]]) -> str:
    current = path[-1]
    cid = normalize_id(current.get("id"))
    if cid is None:
        return ""
    nav_items = []
    for child in children.get(cid, []):
        child_id = normalize_id(child.get("id"))
        if child_id is None:
            continue
        if not (descendants_cache[child_id] & product_category_ids):
            continue
        url = category_url(child_id)
        if not url:
            continue
        nav_items.append(
            f'<a class="category-chip" href="{esc(url)}">{esc(clean(child.get("name")))}</a>'
        )
    if not nav_items:
        return ""
    return f'''<section class="category-subcategories" aria-labelledby="subcategory-title">
<h2 id="subcategory-title">دسته‌های مرتبط</h2>
<div class="category-chip-list">{"".join(nav_items)}</div>
</section>'''


def render_product_card(product: dict, specs: dict) -> str:
    code = clean(product.get("code"))
    name = clean(product.get("name")) or code
    image = f"/images/products/{esc(code)}.webp" if code else "/images/logo.png"
    summary = spec_summary(product, specs)
    if not summary:
        summary = clean(product.get("technical_specs")) or "مشاهده مشخصات فنی و اطلاعات محصول در صفحه اختصاصی."
    product_id = normalize_id(product.get("id"))
    status_class = "in-stock" if float(product.get("qty") or 0) > 0 else "out-of-stock"
    status_text = "موجود" if float(product.get("qty") or 0) > 0 else "ناموجود"

    return f'''<article class="category-product-card">
<a class="category-product-media" href="{esc(product_url(code))}" aria-label="مشاهده {esc(name)}">
<span class="category-stock-badge {status_class}" data-stock-for="{esc(code)}">{status_text}</span>
<img src="{image}" alt="{esc(name)}" loading="lazy" decoding="async" data-image-base="/images/products/{esc(code)}" onerror="categoryImageFallback(this)">
<div class="category-image-fallback" hidden>یونیکس شاپ</div>
</a>
<div class="category-product-body">
<p class="category-product-code">{esc(code)}</p>
<h3><a href="{esc(product_url(code))}">{esc(name)}</a></h3>
<p class="category-product-summary">{esc(summary)}</p>
<div class="category-product-footer">
<div class="category-product-price" data-price-for="{esc(code)}">قیمت در صفحه محصول</div>
<a class="category-product-link" href="{esc(product_url(code))}">مشاهده مشخصات <span>←</span></a>
</div>
</div>
</article>'''


def build_page(category: dict, products: list[dict], categories_by_id: dict[int, dict], children: dict[int | None, list[dict]], specs: dict, descendants_cache: dict[int, set[int]]) -> str:
    cid = normalize_id(category.get("id"))
    name = clean(category.get("name"))
    path = category_path(cid, categories_by_id)
    parent_name = clean(path[-2].get("name")) if len(path) > 1 else None
    descendants_ids = descendants_cache[cid]
    matching = [p for p in products if normalize_id(p.get("category_id")) in descendants_ids]
    matching.sort(key=lambda p: (float(p.get("qty") or 0) <= 0, clean(p.get("name")).lower()))
    url_path = category_url(cid)
    canonical = BASE_URL + url_path
    title = category_title(name, parent_name)
    description = category_description(name, parent_name, len(matching))
    display_name = name
    if parent_name == "لپ تاپ":
        display_name = f"لپ‌تاپ {name}"
    elif parent_name == "مانیتور":
        display_name = f"مانیتور {name}"

    breadcrumb = [
        {"@type": "ListItem", "position": 1, "name": "خانه", "item": BASE_URL + "/"},
        {"@type": "ListItem", "position": 2, "name": "محصولات", "item": BASE_URL + "/products.html"},
    ]
    for i, item in enumerate(path, start=3):
        item_id = normalize_id(item.get("id"))
        item_url = BASE_URL + category_url(item_id) if item_id in CATEGORY_SLUGS else None
        entry = {"@type": "ListItem", "position": i, "name": clean(item.get("name"))}
        if item_url:
            entry["item"] = item_url
        breadcrumb.append(entry)

    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb,
    }
    item_list = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": name,
        "url": canonical,
        "numberOfItems": len(matching),
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i,
                "name": clean(p.get("name")) or clean(p.get("code")),
                "url": BASE_URL + product_url(clean(p.get("code"))),
            }
            for i, p in enumerate(matching, start=1)
        ],
    }
    collection_schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": name,
        "url": canonical,
        "description": description,
        "isPartOf": {"@type": "WebSite", "name": "یونیکس شاپ", "url": BASE_URL + "/"},
    }

    breadcrumbs_html = ['<nav class="category-breadcrumb" aria-label="مسیر صفحه">', '<a href="/">خانه</a><span>›</span><a href="/products.html">محصولات</a>']
    for item in path:
        item_id = normalize_id(item.get("id"))
        if item_id is None:
            continue
        breadcrumbs_html.append('<span>›</span>')
        item_name = clean(item.get("name"))
        item_url = category_url(item_id)
        if item_id == cid:
            breadcrumbs_html.append(f'<span aria-current="page">{esc(item_name)}</span>')
        elif item_url:
            breadcrumbs_html.append(f'<a href="{esc(item_url)}">{esc(item_name)}</a>')
        else:
            breadcrumbs_html.append(f'<span>{esc(item_name)}</span>')
    breadcrumbs_html.append('</nav>')

    subcategories_html = render_child_nav(path, children, {normalize_id(p.get("category_id")) for p in products if normalize_id(p.get("category_id")) is not None}, descendants_cache)
    product_cards = "".join(render_product_card(p, specs) for p in matching)
    if not product_cards:
        product_cards = '<div class="category-empty"><h2>محصول فعالی در این دسته ثبت نشده است</h2><p>برای مشاهده همه محصولات به فهرست محصولات یونیکس شاپ بروید.</p><a href="/products.html" class="category-main-action">مشاهده همه محصولات</a></div>'

    child_links_for_root = ""
    if len(path) == 1:
        current_children = children.get(cid, [])
        links = []
        for child in current_children:
            child_id = normalize_id(child.get("id"))
            if child_id is None or not (descendants_cache[child_id] & {normalize_id(p.get("category_id")) for p in products if normalize_id(p.get("category_id")) is not None}):
                continue
            url = category_url(child_id)
            if not url:
                continue
            links.append(f'<a href="{esc(url)}" class="category-chip">{esc(clean(child.get("name")))}</a>')
        if links:
            child_links_for_root = f'<section class="category-subcategories"><h2>برندها و دسته‌های این بخش</h2><div class="category-chip-list">{"".join(links)}</div></section>'

    return f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{esc(canonical)}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:locale" content="fa_IR">
<meta property="og:type" content="website">
<meta property="og:site_name" content="یونیکس شاپ">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:image" content="{BASE_URL}/images/logo.png">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v=1.0.9">
<link rel="stylesheet" href="/css/category-page.css?v=1.0.0">
<link rel="icon" href="/images/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/Favicon/favicon-32x32.png">
<script type="application/ld+json">{json.dumps(collection_schema, ensure_ascii=False, separators=(",", ":"))}</script>
<script type="application/ld+json">{json.dumps(item_list, ensure_ascii=False, separators=(",", ":"))}</script>
<script type="application/ld+json">{json.dumps(breadcrumb_schema, ensure_ascii=False, separators=(",", ":"))}</script>
</head>
<body>
<header class="site-header">
<div class="header-container">
<a href="/" class="site-logo"><img src="/images/logo.png" alt="یونیکس شاپ"></a>
<nav class="main-nav" aria-label="منوی اصلی">
<a href="/" class="nav-link">خانه</a>
<a href="/products.html" class="nav-link active">محصولات</a>
<a href="/products.html?finder=1" class="nav-link">پیشنهاد هوشمند</a>
<a href="/compare.html" class="nav-link nav-feature-link">مقایسه</a>
<a href="/#about" class="nav-link">درباره ما</a>
<a href="/#contact" class="nav-link">تماس با ما</a>
</nav>
<div class="header-actions">
<a href="/#contact" class="header-contact">تماس با ما <span>←</span></a>
<button class="mobile-menu-button" type="button" aria-label="باز کردن منوی سایت" aria-expanded="false"><span></span><span></span><span></span></button>
</div>
</div>
</header>
<main class="category-page">
<div class="section-container">
{''.join(breadcrumbs_html)}
<section class="category-hero">
<div class="category-hero-copy">
<span class="section-eyebrow">دسته‌بندی محصولات یونیکس شاپ</span>
<h1>{esc(display_name)}</h1>
<p>{esc(category_intro(name, parent_name, len(matching)))}</p>
</div>
<div class="category-hero-meta">
<strong>{len(matching):,}</strong>
<span>محصول</span>
</div>
</section>
{subcategories_html}
{child_links_for_root}
<section class="category-products-section" aria-labelledby="category-products-title">
<div class="category-section-heading">
<div>
<span class="section-eyebrow">محصولات این دسته</span>
<h2 id="category-products-title">مدل‌های {esc(display_name)}</h2>
</div>
<a href="/products.html" class="category-main-action secondary">همه محصولات <span>←</span></a>
</div>
<div class="category-products-grid">
{product_cards}
</div>
</section>
<section class="category-seo-text">
<h2>مشخصات و اطلاعات {esc(name)} در یونیکس شاپ</h2>
<p>{esc(category_description(name, parent_name, len(matching)))}</p>
<p>برای بررسی دقیق‌تر هر مدل، روی نام محصول کلیک کنید تا صفحه اختصاصی همان محصول، مشخصات فنی، تصویر و اطلاعات به‌روز قیمت و موجودی را ببینید.</p>
</section>
</div>
</main>
<footer class="product-footer"><div class="product-footer-inner"><span>© یونیکس شاپ — ارومیه، آذربایجان غربی</span><a href="/products.html">محصولات</a><a href="/category/laptop/">لپ تاپ</a><a href="/category/monitor/">مانیتور</a><a href="/category/accessories/">لوازم جانبی</a><a href="/#contact">تماس با ما</a></div></footer>
<script>
async function refreshCategoryLiveData() {{
    try {{
        const response = await fetch('/data/availability.json', {{ cache: 'no-store' }});
        if (!response.ok) return;
        const products = await response.json();
        const byCode = new Map(Array.isArray(products) ? products.map(item => [String(item.code || '').trim(), item]) : []);
        document.querySelectorAll('[data-stock-for]').forEach(el => {{
            const code = el.dataset.stockFor || '';
            const product = byCode.get(code);
            if (!product) {{ el.closest('.category-product-card')?.remove(); return; }}
            const inStock = Number(product.qty || 0) > 0;
            el.textContent = inStock ? 'موجود' : 'ناموجود';
            el.classList.toggle('in-stock', inStock);
            el.classList.toggle('out-of-stock', !inStock);
        }});
        document.querySelectorAll('[data-price-for]').forEach(el => {{
            const code = el.dataset.priceFor || '';
            const product = byCode.get(code);
            if (!product) {{ el.textContent = ''; return; }}
            const price = Number(product.sale_price || 0);
            if (!Number.isFinite(price) || price <= 0) {{ el.textContent = 'استعلام قیمت'; return; }}
            el.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(price)) + ' ریال';
        }});
    }} catch (error) {{
        console.warn('Category live data error:', error);
    }}
}}
function categoryImageFallback(img) {{
    const base = img.dataset.imageBase;
    const step = img.dataset.imageStep || 'webp';
    if (step === 'webp') {{ img.dataset.imageStep = 'jpg'; img.src = base + '.jpg'; return; }}
    if (step === 'jpg') {{ img.dataset.imageStep = 'jpeg'; img.src = base + '.jpeg'; return; }}
    if (step === 'jpeg') {{ img.dataset.imageStep = 'png'; img.src = base + '.png'; return; }}
    img.hidden = true;
    const fallback = img.nextElementSibling;
    if (fallback) fallback.hidden = false;
}}
refreshCategoryLiveData();
</script>
<script src="/js/main.js?v=1.0.9" defer></script>
</body>
</html>
'''


def main() -> None:
    availability = json.loads((DATA_DIR / "availability.json").read_text(encoding="utf-8"))
    categories = json.loads((DATA_DIR / "categories.json").read_text(encoding="utf-8"))
    specs_data = json.loads((DATA_DIR / "product-specs.json").read_text(encoding="utf-8"))
    specs = specs_data.get("products", {}) if isinstance(specs_data, dict) else {}

    categories_by_id = {
        int(c["id"]): c for c in categories
        if int(c.get("is_active", 0)) == 1 and int(c["id"]) in CATEGORY_SLUGS
    }
    children: dict[int | None, list[dict]] = {}
    for c in categories_by_id.values():
        parent = normalize_id(c.get("parent_id"))
        children.setdefault(parent, []).append(c)
    for group in children.values():
        group.sort(key=lambda item: clean(item.get("name")))

    active_products = [p for p in availability if int(p.get("is_active", 0)) == 1 and clean(p.get("code"))]
    product_category_ids = {normalize_id(p.get("category_id")) for p in active_products if normalize_id(p.get("category_id")) is not None}

    descendants_cache = {
        cid: descendants(cid, categories_by_id, children) for cid in categories_by_id
    }

    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    generated = []
    for cid, category in categories_by_id.items():
        matching = [p for p in active_products if normalize_id(p.get("category_id")) in descendants_cache[cid]]
        if not matching:
            continue
        slug = CATEGORY_SLUGS[cid]
        directory = OUTPUT_DIR / slug
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text(
            build_page(category, active_products, categories_by_id, children, specs, descendants_cache),
            encoding="utf-8",
        )
        generated.append((cid, slug, len(matching)))

    print(f"Generated {len(generated)} category pages")
    for cid, slug, count in generated:
        print(f"  {cid}: /category/{slug}/ ({count} products)")


if __name__ == "__main__":
    main()
