from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "products"
BASE_URL = "https://unix-shop.ir"

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

def category_url(category_id: int | None) -> str | None:
    if category_id is None:
        return None
    slug = CATEGORY_SLUGS.get(int(category_id))
    return f"/category/{slug}/" if slug else None

SECTION_LABELS = {
    "basic": "اطلاعات پایه",
    "processor": "پردازنده",
    "memory": "حافظه رم",
    "storage": "حافظه داخلی",
    "graphics": "گرافیک",
    "display": "نمایشگر",
    "image": "تصویر",
    "connectivity": "اتصالات",
    "dimensions": "ابعاد",
    "battery": "باتری",
    "ports": "درگاه‌ها",
    "network": "شبکه",
    "features": "ویژگی‌ها",
    "software": "نرم‌افزار",
    "physical": "مشخصات فیزیکی",
}

FIELD_LABELS = {
    "brand": "برند",
    "model": "مدل",
    "family": "خانواده",
    "generation": "نسل",
    "cores": "هسته",
    "threads": "رشته",
    "base_clock": "فرکانس پایه",
    "boost_clock": "فرکانس بوست",
    "base_clock_ghz": "فرکانس پایه",
    "turbo_clock_ghz": "فرکانس بوست",
    "cache": "کش",
    "tdp": "توان مصرفی",
    "capacity_gb": "ظرفیت",
    "type": "نوع",
    "speed_mhz": "سرعت",
    "slots": "تعداد اسلات",
    "max_capacity_gb": "حداکثر ظرفیت",
    "upgradeable": "قابلیت ارتقا",
    "interface": "رابط",
    "additional_slot": "اسلات اضافی",
    "model_gpu": "مدل گرافیک",
    "model": "مدل",
    "vram_gb": "حافظه گرافیک",
    "vram_mb": "حافظه گرافیک",
    "vram_type": "نوع حافظه گرافیک",
    "tgp": "توان گرافیک",
    "size_inch": "اندازه",
    "resolution": "رزولوشن",
    "panel": "نوع پنل",
    "refresh_rate_hz": "نرخ نوسازی",
    "brightness_nits": "روشنایی",
    "response_time_ms": "زمان پاسخ‌گویی",
    "color_gamut": "محدوده رنگ",
    "touch": "صفحه لمسی",
    "wifi": "Wi-Fi",
    "bluetooth": "Bluetooth",
    "ethernet": "Ethernet",
    "usb_a": "USB-A",
    "usb_c": "USB-C",
    "thunderbolt": "Thunderbolt",
    "hdmi": "HDMI",
    "displayport": "DisplayPort",
    "audio": "جک صدا",
    "card_reader": "کارت‌خوان",
    "battery_wh": "ظرفیت باتری",
    "weight_kg": "وزن",
    "keyboard_backlight": "کیبورد با نور پس‌زمینه",
    "fingerprint": "حسگر اثر انگشت",
    "webcam": "وب‌کم",
    "os": "سیستم‌عامل",
    "adaptive_sync": "همگام‌سازی تطبیقی",
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def normalize_id(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def slug_safe(code: str) -> str:
    # Keep product codes stable and URL-safe.
    return re.sub(r"[^A-Za-z0-9_-]+", "-", code).strip("-").lower()


def scalar(value: object) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, bool):
        return "دارد" if value else "ندارد"
    if isinstance(value, list):
        return "، ".join(filter(None, (scalar(item) for item in value)))
    if isinstance(value, dict):
        pairs = []
        for key, item in value.items():
            rendered = scalar(item)
            if rendered:
                pairs.append(f"{FIELD_LABELS.get(key, key)}: {rendered}")
        return " | ".join(pairs)
    return clean_text(value)


def category_path(category_id: int | None, by_id: dict[int, dict]) -> list[str]:
    result: list[str] = []
    seen: set[int] = set()
    current = by_id.get(int(category_id)) if category_id is not None else None
    while current:
        cid = int(current["id"])
        if cid in seen:
            break
        seen.add(cid)
        result.insert(0, clean_text(current.get("name")))
        parent_id = current.get("parent_id")
        current = by_id.get(int(parent_id)) if parent_id is not None else None
    return [item for item in result if item]


def product_description(product: dict, spec: dict | None, cat: list[str]) -> str:
    name = clean_text(product.get("name")) or clean_text(product.get("code"))
    category = clean_text(cat[0]) if cat else "محصول دیجیتال"
    compact = []

    if spec:
        basic = spec.get("basic", {}) or {}
        processor = spec.get("processor", {}) or {}
        memory = spec.get("memory", {}) or {}
        storage = spec.get("storage", {}) or {}

        if basic.get("brand"):
            compact.append(clean_text(basic["brand"]))
        if basic.get("model"):
            compact.append(clean_text(basic["model"]))
        if processor.get("model"):
            compact.append(clean_text(processor["model"]))
        if memory.get("capacity_gb"):
            compact.append(f"رم {memory['capacity_gb']} گیگابایت")
        if storage.get("capacity_gb"):
            compact.append(f"حافظه {storage['capacity_gb']} گیگابایت")

    lead = f"مشخصات {name} از دسته {category} در یونیکس شاپ"
    if compact:
        lead += "؛ " + "، ".join(compact[:5])
    lead += ". قیمت و موجودی به‌روز در یونیکس شاپ."

    result = clean_text(lead)
    if len(result) <= 155:
        return result

    # Preserve a complete sentence rather than cutting through a model/spec value.
    shorter = f"مشخصات {name} در یونیکس شاپ؛ "
    if compact:
        shorter += "، ".join(compact[:3]) + ". "
    shorter += "قیمت و موجودی به‌روز."
    result = clean_text(shorter)
    return result if len(result) <= 155 else result[:152].rsplit(" ", 1)[0] + "..."


def render_value(key: str, value: object) -> str:
    rendered = scalar(value)
    if not rendered:
        return ""
    suffixes = {
        "capacity_gb": " گیگابایت",
        "max_capacity_gb": " گیگابایت",
        "vram_gb": " گیگابایت",
        "vram_mb": " مگابایت",
        "size_inch": " اینچ",
        "refresh_rate_hz": " هرتز",
        "brightness_nits": " نیت",
        "response_time_ms": " میلی‌ثانیه",
        "battery_wh": " وات‌ساعت",
        "weight_kg": " کیلوگرم",
        "speed_mhz": " مگاهرتز",
    }
    return rendered + suffixes.get(key, "")


def render_specs(spec: dict | None, technical_specs: object, notes: object) -> str:
    blocks = []
    if spec:
        for section_key, section in spec.items():
            if section_key == "type" or not isinstance(section, dict):
                continue
            rows = []
            for key, value in section.items():
                rendered = render_value(key, value)
                if not rendered:
                    continue
                rows.append(
                    f'<tr><th scope="row">{esc(FIELD_LABELS.get(key, key))}</th>'
                    f'<td>{esc(rendered)}</td></tr>'
                )
            if rows:
                title = SECTION_LABELS.get(section_key, section_key)
                blocks.append(
                    f'<section class="spec-group"><h2>{esc(title)}</h2>'
                    f'<div class="spec-table-wrap"><table><tbody>{"".join(rows)}</tbody></table></div></section>'
                )

    if not blocks and clean_text(technical_specs):
        chips = "".join(
            f'<li>{esc(item.strip())}</li>'
            for item in str(technical_specs).replace("،", "/").split("/")
            if clean_text(item)
        )
        blocks.append(
            f'<section class="spec-group"><h2>مشخصات فنی</h2><ul class="spec-chips">{chips}</ul></section>'
        )

    if clean_text(notes):
        blocks.append(
            f'<section class="spec-group"><h2>توضیحات</h2><p class="notes">{esc(clean_text(notes))}</p></section>'
        )

    return "\n".join(blocks) or (
        '<section class="spec-group"><h2>مشخصات فنی</h2>'
        '<p class="notes">مشخصات فنی این محصول هنوز ثبت نشده است.</p></section>'
    )


def related_products(product: dict, all_products: list[dict], categories_by_id: dict[int, dict]) -> list[dict]:
    same_category = [
        item for item in all_products
        if str(item.get("id")) != str(product.get("id"))
        and int(item.get("category_id") or 0) == int(product.get("category_id") or 0)
        and clean_text(item.get("code"))
    ]
    if len(same_category) >= 4:
        return same_category[:4]

    root_category = None
    current = categories_by_id.get(int(product.get("category_id") or 0))
    seen = set()
    while current:
        cid = int(current["id"])
        if cid in seen:
            break
        seen.add(cid)
        root_category = cid
        parent = current.get("parent_id")
        current = categories_by_id.get(int(parent)) if parent is not None else None

    candidates = list(same_category)
    for item in all_products:
        if str(item.get("id")) == str(product.get("id")) or not clean_text(item.get("code")):
            continue
        current = categories_by_id.get(int(item.get("category_id") or 0))
        item_root = None
        seen = set()
        while current:
            cid = int(current["id"])
            if cid in seen:
                break
            seen.add(cid)
            item_root = cid
            parent = current.get("parent_id")
            current = categories_by_id.get(int(parent)) if parent is not None else None
        if item_root == root_category and item not in candidates:
            candidates.append(item)
        if len(candidates) >= 4:
            break
    return candidates[:4]


def product_page(product: dict, categories_by_id: dict[int, dict], specs: dict, all_products: list[dict]) -> str:
    code = clean_text(product.get("code"))
    name = clean_text(product.get("name")) or code
    cat = category_path(product.get("category_id"), categories_by_id)
    category = " / ".join(cat) if cat else "محصولات دیجیتال"
    spec = specs.get(str(product.get("id"))) or {}
    description = product_description(product, spec, cat)
    url_path = f"/products/{slug_safe(code)}/"
    canonical = BASE_URL + url_path
    image = f"{BASE_URL}/images/products/{code}.webp" if code else f"{BASE_URL}/images/logo.png"

    brand = clean_text((spec.get("basic") or {}).get("brand")) or None
    model = clean_text((spec.get("basic") or {}).get("model")) or None
    product_type = clean_text(spec.get("type")) or (cat[0] if cat else "محصول دیجیتال")

    product_schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description,
        "sku": code,
        "category": product_type,
        "url": canonical,
        "image": [image],
    }
    if brand:
        product_schema["brand"] = {"@type": "Brand", "name": brand}
    if model:
        product_schema["model"] = model

    breadcrumb_items = [
        {"@type": "ListItem", "position": 1, "name": "خانه", "item": BASE_URL + "/"},
        {"@type": "ListItem", "position": 2, "name": "محصولات", "item": BASE_URL + "/products.html"},
    ]
    if cat:
        category_id = normalize_id(product.get("category_id"))
        category_href = BASE_URL + category_url(category_id) if category_url(category_id) else None
        item = {"@type": "ListItem", "position": 3, "name": cat[-1]}
        if category_href:
            item["item"] = category_href
        breadcrumb_items.append(item)
    breadcrumb_items.append({"@type": "ListItem", "position": len(breadcrumb_items) + 1, "name": name, "item": canonical})

    breadcrumb_schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumb_items,
    }

    title = f"{name} | مشخصات و قیمت | یونیکس شاپ"
    product_id = str(product.get("id"))
    related = related_products(product, all_products, categories_by_id)
    related_html = "".join(
        f'''<a class="related-product-card" href="/products/{esc(slug_safe(clean_text(item.get("code"))))}/">
<span>{esc(clean_text(item.get("name")) or clean_text(item.get("code")))}</span>
<small>{esc("کد محصول: " + clean_text(item.get("code")))}</small>
</a>'''
        for item in related
    )

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
<meta property="og:type" content="product">
<meta property="og:site_name" content="یونیکس شاپ">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:image" content="{esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{esc(image)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v=1.0.9">
<link rel="stylesheet" href="/css/product-page.css?v=1.0.0">
<link rel="icon" href="/images/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/images/Favicon/favicon-32x32.png">
<script type="application/ld+json" id="productSchema">{json.dumps(product_schema, ensure_ascii=False, separators=(",", ":"))}</script>
<script type="application/ld+json">{json.dumps(breadcrumb_schema, ensure_ascii=False, separators=(",", ":"))}</script>
</head>
<body data-product-code="{esc(code)}" data-product-id="{esc(product_id)}">
<header class="site-header"><div class="header-container">
<a href="/" class="site-logo"><img src="/images/logo.png" alt="یونیکس شاپ"></a>
<nav class="main-nav" aria-label="منوی اصلی">
<a href="/" class="nav-link">خانه</a>
<a href="/products.html" class="nav-link active">محصولات</a>
<a href="/products.html?finder=1" class="nav-link">پیشنهاد هوشمند</a>
<a href="/compare.html" class="nav-link nav-feature-link">مقایسه</a>
<a href="/#about" class="nav-link">درباره ما</a>
<a href="/#contact" class="nav-link">تماس با ما</a>
</nav>
<div class="header-actions"><a href="/#contact" class="header-contact">تماس با ما <span>←</span></a><button class="mobile-menu-button" type="button" aria-label="باز کردن منوی سایت" aria-expanded="false"><span></span><span></span><span></span></button></div>
</div></header>
<main class="product-page">
<nav class="product-breadcrumb" aria-label="مسیر صفحه">
<a href="/">خانه</a><span>›</span><a href="/products.html">محصولات</a><span>›</span>{f'<a href="{esc(BASE_URL + category_url(normalize_id(product.get("category_id"))))}">{esc(cat[-1])}</a><span>›</span>' if cat and category_url(normalize_id(product.get("category_id"))) else ''}<span>{esc(name)}</span>
</nav>
<section class="product-hero">
<div class="product-media-card">
<span id="productStockBadge" class="product-stock-badge">در حال بررسی موجودی...</span>
<img id="productImage" src="{esc(image)}" alt="{esc(name)}" loading="eager" decoding="async">
<div id="productImageFallback" class="product-image-fallback" hidden>یونیکس شاپ</div>
</div>
<div class="product-summary">
<p class="eyebrow">{esc(category)}</p>
<h1>{esc(name)}</h1>
<p class="product-code">کد محصول: <strong>{esc(code)}</strong></p>
<p class="product-intro">{esc(description)}</p>
<div class="live-info">
<div><span>وضعیت</span><strong id="productStock">در حال بررسی...</strong></div>
<div><span>قیمت</span><strong id="productPrice">در حال دریافت...</strong><small> ریال</small></div>
</div>
<div class="product-actions-row">
<a class="primary-product-action" href="/products.html">بازگشت به محصولات</a>
<a class="secondary-product-action" href="/compare.html">مقایسه محصولات</a>
</div>
</div>
</section>
<section class="product-description-section">
<h2>درباره {esc(name)}</h2>
<p>در این صفحه مشخصات فنی و اطلاعات عمومی <strong>{esc(name)}</strong> را مشاهده می‌کنید. برای قیمت و موجودی به‌روز، اطلاعات زنده از فهرست محصولات یونیکس شاپ دریافت می‌شود.</p>
</section>
<section class="product-specs-section">
<h2>مشخصات فنی {esc(name)}</h2>
{render_specs(spec, product.get("technical_specs"), product.get("notes"))}
</section>
<section class="related-products-section">
<h2>محصولات مرتبط</h2>
<p>چند محصول دیگر از همین دسته‌بندی را نیز بررسی کنید.</p>
<div class="related-products-grid">{related_html}</div>
</section>
<section class="product-cta-section">
<h2>مشاهده همه محصولات</h2>
<p>برای مقایسه مدل‌های دیگر و بررسی محصولات مرتبط، به فهرست محصولات یونیکس شاپ مراجعه کنید.</p>
<a class="primary-product-action" href="/products.html">مشاهده محصولات</a>
</section>
</main>
<footer class="product-footer"><div class="product-footer-inner"><span>© یونیکس شاپ</span><a href="/products.html">محصولات</a><a href="/#contact">تماس با ما</a></div></footer>
<script src="/js/main.js?v=1.0.9" defer></script>
<script src="/js/product-page.js?v=1.0.0" defer></script>
</body>
</html>
'''


def main() -> None:
    availability = json.loads((DATA_DIR / "availability.json").read_text(encoding="utf-8"))
    categories = json.loads((DATA_DIR / "categories.json").read_text(encoding="utf-8"))
    specs_data = json.loads((DATA_DIR / "product-specs.json").read_text(encoding="utf-8"))
    specs = specs_data.get("products", {}) if isinstance(specs_data, dict) else {}
    by_id = {int(item["id"]): item for item in categories if int(item.get("is_active", 0)) == 1}

    if OUTPUT_DIR.exists():
        for child in OUTPUT_DIR.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            elif child.name != "README.txt":
                child.unlink()
    else:
        OUTPUT_DIR.mkdir(parents=True)

    active = [item for item in availability if int(item.get("is_active", 0)) == 1 and clean_text(item.get("code"))]
    for product in active:
        directory = OUTPUT_DIR / slug_safe(clean_text(product["code"]))
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text(product_page(product, by_id, specs, active), encoding="utf-8")

    print(f"Generated {len(active)} product pages in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
