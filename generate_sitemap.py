from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent

DATA_DIR = ROOT / "data"
OUTPUT_FILE = ROOT / "sitemap.xml"

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


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_id(value: object) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def slug_safe(code: str) -> str:
    return re.sub(
        r"[^A-Za-z0-9_-]+",
        "-",
        code,
    ).strip("-").lower()


def category_url(category_id: int) -> str | None:
    slug = CATEGORY_SLUGS.get(category_id)
    if not slug:
        return None
    return f"/category/{slug}/"


def product_url(code: str) -> str:
    return (
        "/product.html?code="
        + quote(code.strip(), safe="")
    )


def main() -> None:

    availability_file = DATA_DIR / "availability.json"
    categories_file = DATA_DIR / "categories.json"

    availability = json.loads(
        availability_file.read_text(encoding="utf-8")
    )

    categories = json.loads(
        categories_file.read_text(encoding="utf-8")
    )

    today = date.today().isoformat()

    urls: list[tuple[str, str, float]] = []

    # -------------------------------------------------
    # MAIN STATIC PAGES
    # -------------------------------------------------

    static_pages = [
        ("/", 1.0),
        ("/products.html", 0.9),
        ("/about.html", 0.5),
        ("/contact.html", 0.5),
        ("/compare.html", 0.4),
    ]

    for path, priority in static_pages:
        urls.append(
            (
                BASE_URL + path,
                today,
                priority,
            )
        )

    # -------------------------------------------------
    # ACTIVE PRODUCTS
    # -------------------------------------------------

    active_products = [
        product
        for product in availability
        if int(product.get("is_active", 0)) == 1
        and clean(product.get("code"))
    ]

    for product in active_products:

        code = clean(product.get("code"))

        urls.append(
            (
                BASE_URL + product_url(code),
                today,
                0.7,
            )
        )

    # -------------------------------------------------
    # CATEGORY PAGES
    # Only include active categories that currently
    # contain at least one active product.
    # -------------------------------------------------

    active_categories = {
        normalize_id(category.get("id")): category
        for category in categories
        if int(category.get("is_active", 0)) == 1
        and normalize_id(category.get("id")) in CATEGORY_SLUGS
    }

    active_product_category_ids = {
        normalize_id(product.get("category_id"))
        for product in active_products
        if normalize_id(product.get("category_id")) is not None
    }

    for category_id, category in active_categories.items():

        if category_id is None:
            continue

        slug = CATEGORY_SLUGS.get(category_id)

        if not slug:
            continue

        # Direct products in this category.
        direct_match = any(
            normalize_id(product.get("category_id")) == category_id
            for product in active_products
        )

        # Include parent/root categories when they have
        # active descendant categories.
        has_descendants = False

        for product_category_id in active_product_category_ids:

            current = product_category_id
            visited = set()

            while current is not None and current not in visited:

                visited.add(current)

                if current == category_id:
                    has_descendants = True
                    break

                parent = active_categories.get(current)

                if not parent:
                    break

                current = normalize_id(
                    parent.get("parent_id")
                )

            if has_descendants:
                break

        if not direct_match and not has_descendants:
            continue

        urls.append(
            (
                BASE_URL + f"/category/{slug}/",
                today,
                0.8,
            )
        )

    # -------------------------------------------------
    # REMOVE DUPLICATES
    # -------------------------------------------------

    unique = {}

    for loc, lastmod, priority in urls:
        unique[loc] = (
            lastmod,
            priority,
        )

    # -------------------------------------------------
    # XML
    # -------------------------------------------------

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for loc in sorted(unique):

        lastmod, priority = unique[loc]

        xml_lines.extend(
            [
                "  <url>",
                f"    <loc>{esc(loc)}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                f"    <priority>{priority:.1f}</priority>",
                "  </url>",
            ]
        )

    xml_lines.append("</urlset>")

    OUTPUT_FILE.write_text(
        "\n".join(xml_lines),
        encoding="utf-8",
    )

    print(
        f"Generated sitemap with {len(unique)} URLs:"
    )
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()