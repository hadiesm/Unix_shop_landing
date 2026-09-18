(function () {
    "use strict";

    const body = document.body;
    const code = body?.dataset?.productCode || "";
    const price = document.getElementById("productPrice");
    const stock = document.getElementById("productStock");
    const stockBadge = document.getElementById("productStockBadge");
    const image = document.getElementById("productImage");
    const imageFallback = document.getElementById("productImageFallback");

    const formatNumber = value => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "—";
        return new Intl.NumberFormat("fa-IR").format(n);
    };

    const formatMoney = value => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return "—";
        return formatNumber(Math.round(n));
    };

    if (image) {
        const formats = ["webp", "jpg", "jpeg", "png"];
        let index = 0;
        const tryNext = () => {
            index += 1;
            if (index < formats.length && code) {
                image.src = `/images/products/${encodeURIComponent(code)}.${formats[index]}`;
            } else {
                image.hidden = true;
                if (imageFallback) imageFallback.hidden = false;
            }
        };
        image.addEventListener("error", tryNext);
    }

    async function refreshLiveData() {
        if (!code) return;

        try {
            const response = await fetch("/data/availability.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const products = await response.json();
            const product = Array.isArray(products)
                ? products.find(item => String(item.code || "").trim() === code)
                : null;

            if (!product) {
                if (stock) stock.textContent = "ناموجود در فهرست فعلی";
                if (stockBadge) stockBadge.textContent = "ناموجود";
                if (price) price.textContent = "—";
                return;
            }

            const available = Number(product.qty || 0) > 0;
            if (stock) stock.textContent = available ? "موجود" : "ناموجود";
            if (stockBadge) {
                stockBadge.textContent = available ? "موجود" : "ناموجود";
                stockBadge.classList.toggle("available", available);
                stockBadge.classList.toggle("unavailable", !available);
            }
            if (price) price.textContent = available ? formatMoney(product.sale_price) : "—";

            const schema = document.getElementById("productSchema");
            if (schema) {
                try {
                    const data = JSON.parse(schema.textContent || "{}");
                    data.offers = {
                        "@type": "Offer",
                        "url": window.location.href,
                        "priceCurrency": "IRR",
                        "price": available ? Number(product.sale_price) : 0,
                        "availability": available
                            ? "https://schema.org/InStock"
                            : "https://schema.org/OutOfStock",
                        "itemCondition": "https://schema.org/NewCondition",
                        "seller": {
                            "@type": "Organization",
                            "name": "یونیکس شاپ",
                            "url": "https://unix-shop.ir/"
                        }
                    };
                    schema.textContent = JSON.stringify(data);
                } catch (error) {
                    console.warn("Product schema update failed", error);
                }
            }
        } catch (error) {
            console.warn("Live product data failed", error);
            if (stock) stock.textContent = "اطلاعات به‌روز در دسترس نیست";
            if (price) price.textContent = "—";
            if (stockBadge) stockBadge.textContent = "اطلاعات به‌روز نامشخص";
        }
    }

    refreshLiveData();
})();
