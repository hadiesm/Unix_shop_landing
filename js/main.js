document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const mobileButton =
        document.querySelector(".mobile-menu-button");

    const navigation =
        document.querySelector(".main-nav");


    if (mobileButton && navigation) {

        mobileButton.addEventListener("click", () => {

            navigation.classList.toggle("mobile-open");

        });

    }


    /* =====================================================
       ACTIVE NAVIGATION ITEM
    ===================================================== */

    const navLinks =
        document.querySelectorAll(".nav-link");


    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            navLinks.forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

        });

    });


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements =
        document.querySelectorAll(".reveal");


    if (revealElements.length) {

        const revealObserver =
            new IntersectionObserver(
                (entries) => {

                    entries.forEach(entry => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add(
                                "revealed"
                            );

                            revealObserver.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.12
                }
            );


        revealElements.forEach(element => {

            revealObserver.observe(element);

        });

    }


    /* =====================================================
       BACK TO TOP
    ===================================================== */

    const backToTop =
        document.getElementById("backToTop");


    if (backToTop) {

        window.addEventListener("scroll", () => {

            if (window.scrollY > 500) {

                backToTop.classList.add(
                    "visible"
                );

            } else {

                backToTop.classList.remove(
                    "visible"
                );

            }

        });


        backToTop.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }

});

/* =====================================================
FEATURED PRODUCTS
Random products from data/products.json
===================================================== */

async function loadFeaturedProducts() {

    const container =
        document.getElementById("featuredProducts");


    /*
     * Only run on pages that contain
     * the featured products section.
     */

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "data/availability.json",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `availability.json: HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "availability.json باید یک آرایه باشد."
            );

        }


        /*
         * Only active products.
         *
         * qty is used only to determine
         * availability. It is NEVER displayed.
         */

        const availableProducts =
            data.filter(
                product =>
                    Number(product.is_active) === 1 &&
                    Number(product.qty) > 0
            );


        /*
         * Pick random products.
         */

        const selectedProducts =
            getRandomProducts(
                availableProducts,
                4
            );


        if (!selectedProducts.length) {

            container.innerHTML = `
                <div class="products-loading">
                    محصولی برای نمایش وجود ندارد.
                </div>
            `;

            return;
        }


        /*
         * Render cards.
         */

        container.innerHTML =
            selectedProducts
                .map(product =>
                    createFeaturedProductCard(product)
                )
                .join("");


    } catch (error) {

        console.error(
            "Featured products error:",
            error
        );


        container.innerHTML = `
            <div class="products-loading">
                دریافت محصولات با خطا مواجه شد.
            </div>
        `;

    }

}

/* =====================================================
RANDOM PRODUCTS
===================================================== */

function getRandomProducts(
items,
count
) {

/*
 * Create a copy so the original
 * JSON array is never modified.
 */

const shuffled =
    [...items];


/*
 * Fisher-Yates shuffle
 */

for (
    let i = shuffled.length - 1;
    i > 0;
    i--
) {

    const j =
        Math.floor(
            Math.random() * (i + 1)
        );


    [
        shuffled[i],
        shuffled[j]
    ] = [
        shuffled[j],
        shuffled[i]
    ];

}


return shuffled.slice(
    0,
    count
);

}

/* =====================================================
   FEATURED PRODUCT CARD
   WebP → JPG → JPEG → PNG
===================================================== */

function createFeaturedProductCard(product) {

    const stock =
        Number(product.qty || 0);


    const hasStock =
        stock > 0;


    const price =
        Number(product.sale_price || 0);


    const categoryName =
        getFeaturedCategoryName(
            product.category_id
        );


    const description =
        product.technical_specs ||
        product.notes ||
        "محصول با کیفیت از مجموعه یونیکس شاپ";


    const productCode =
        String(
            product.code || ""
        ).trim();


    const imageBasePath =
        productCode
            ? `images/products/${encodeURIComponent(productCode)}`
            : "";


    return `
        <article
            class="product-card"
            data-product-id="${escapeFeaturedHtml(product.id)}"
        >

            <div class="product-image">

                <span class="product-tag">
                    ${
                        hasStock
                            ? "موجود"
                            : "ناموجود"
                    }
                </span>


                ${
                    imageBasePath
                        ? `
                            <img
                                src="${imageBasePath}.webp"
                                alt="${escapeFeaturedHtml(
                                    product.name ||
                                    "محصول"
                                )}"
                                class="featured-product-real-image"
                                loading="lazy"
                                decoding="async"
                                data-image-base="${imageBasePath}"
                                data-image-step="webp"
                                onerror="switchFeaturedProductImage(this);"
                            >

                            <div
                                class="featured-product-fallback"
                                style="display:none;"
                            >
                                ${getFeaturedProductVisual(
                                    categoryName
                                )}
                            </div>
                        `
                        : `
                            ${getFeaturedProductVisual(
                                categoryName
                            )}
                        `
                }

            </div>


            <div class="product-info">

                <span class="product-category">

                    ${escapeFeaturedHtml(
                        categoryName ||
                        "محصول"
                    )}

                </span>


                <h3>

                    ${escapeFeaturedHtml(
                        product.name ||
                        "محصول بدون نام"
                    )}

                </h3>


                <p>

                    ${escapeFeaturedHtml(
                        description
                    )}

                </p>


                <div class="product-bottom">

                    <div class="product-price">

                        <span>
                            قیمت
                        </span>


                        <strong>
                            ${formatFeaturedMoney(price)}
                        </strong>


                        <small>
                            ریال
                        </small>

                    </div>


                    <a
                        href="${productCode ? `product.html?code=${encodeURIComponent(productCode)}` : "products.html"}"
                        class="product-button"
                        aria-label="مشاهده صفحه محصول ${escapeFeaturedHtml(product.name || "محصول")}"
                    >
                        ←
                    </a>

                </div>

            </div>

        </article>
    `;
}


/* =====================================================
   FEATURED IMAGE FALLBACK
   WebP → JPG → JPEG → PNG
===================================================== */

function switchFeaturedProductImage(image) {

    const base =
        image.dataset.imageBase;


    const step =
        image.dataset.imageStep;


    if (step === "webp") {

        image.dataset.imageStep = "jpg";

        image.src =
            `${base}.jpg`;

        return;

    }


    if (step === "jpg") {

        image.dataset.imageStep = "jpeg";

        image.src =
            `${base}.jpeg`;

        return;

    }


    if (step === "jpeg") {

        image.dataset.imageStep = "png";

        image.src =
            `${base}.png`;

        return;

    }


    /*
     * No real image found.
     * Show the existing CSS visual.
     */

    image.style.display = "none";


    const fallback =
        image.nextElementSibling;


    if (fallback) {

        fallback.style.display =
            "flex";

    }

}


/* =====================================================
FEATURED CATEGORY
===================================================== */

let featuredCategories = [];

async function loadFeaturedCategories() {

try {

    const response =
        await fetch(
            "data/categories.json",
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {
        throw new Error(
            "categories.json loading failed"
        );
    }


    const data =
        await response.json();


    if (Array.isArray(data)) {

        featuredCategories =
            data.filter(
                category =>
                    Number(category.is_active) === 1
            );

    }

} catch (error) {

    console.error(
        "Featured categories error:",
        error
    );

    featuredCategories = [];

}

}

function getFeaturedCategory(
id
) {

return featuredCategories.find(
    category =>
        Number(category.id) === Number(id)
) || null;

}

function getFeaturedCategoryPath(
categoryId
) {

const path = [];

let category =
    getFeaturedCategory(
        categoryId
    );


const visited =
    new Set();


while (category) {

    const id =
        Number(category.id);


    if (visited.has(id)) {
        break;
    }


    visited.add(id);


    path.unshift(
        category.name
    );


    if (
        category.parent_id === null ||
        category.parent_id === undefined
    ) {

        break;

    }


    category =
        getFeaturedCategory(
            category.parent_id
        );

}


return path.join(" / ");

}

function getFeaturedCategoryName(
categoryId
) {

return getFeaturedCategoryPath(
    categoryId
);

}

/* =====================================================
FEATURED PRODUCT VISUAL
===================================================== */

function getFeaturedProductVisual(
categoryName
) {

const category =
    String(
        categoryName || ""
    );


/*
 * Laptop
 */

if (category.includes("لپ تاپ")) {

    return `
        <div class="product-device laptop-product">

            <div class="product-screen"></div>

            <div class="product-base"></div>

        </div>
    `;

}


/*
 * Monitor
 */

if (category.includes("مانیتور")) {

    return `
        <div class="product-device monitor-product">

            <div class="monitor-screen"></div>

            <div class="monitor-stand"></div>

        </div>
    `;

}


/*
 * Mouse
 */

if (category.includes("ماوس")) {

    return `
        <div class="product-device mouse-product">

            <div class="mouse-body"></div>

        </div>
    `;

}


/*
 * Cool pad
 */

if (category.includes("کول پد")) {

    return `
        <div class="product-device keyboard-product">

            <div class="keyboard-body">

                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>

            </div>

        </div>
    `;

}


/*
 * Game products
 */

if (
    category.includes("فرمان") ||
    category.includes("دسته بازی")
) {

    return `
        <div class="product-device game-product">

            <div class="game-wheel">
                U
            </div>

        </div>
    `;

}


/*
 * Generic
 */

return `
    <div class="product-device generic-product">

        <div class="generic-product-symbol">
            U
        </div>

    </div>
`;

}

/* =====================================================
FEATURED FORMATTING
===================================================== */

function formatFeaturedMoney(
value
) {

const number =
    Number(value || 0);


return number.toLocaleString(
    "fa-IR"
);

}

function escapeFeaturedHtml(
value
) {

return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

/* =====================================================
START FEATURED PRODUCTS
===================================================== */

async function initializeFeaturedProducts() {

const container =
    document.getElementById(
        "featuredProducts"
    );


if (!container) {
    return;
}


/*
 * Categories are needed to display
 * the real category name.
 */

await loadFeaturedCategories();


await loadFeaturedProducts();

}

initializeFeaturedProducts();


/* =====================================================
   HOMEPAGE QUICK PRODUCT SEARCH
   Fast local search using the existing availability feed.
===================================================== */

(function initializeHomeProductSearch() {

    const input = document.getElementById("homeSearchInput");
    const results = document.getElementById("homeSearchResults");
    const clearButton = document.getElementById("homeSearchClear");
    const searchBox = document.getElementById("homeProductSearch");

    if (!input || !results || !searchBox) {
        return;
    }

    let products = [];
    let categories = [];
    let activeIndex = -1;
    let searchTimer = null;

    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

    function normalizeHomeSearch(value) {
        return String(value ?? "")
            .toLowerCase()
            .trim()
            .replace(/[يى]/g, "ی")
            .replace(/ك/g, "ک")
            .replace(/ۀ/g, "ه")
            .replace(/ؤ/g, "و")
            .replace(/إ|أ/g, "ا")
            .replace(/[\u200c\u200f\u200e]/g, " ")
            .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)))
            .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
            .replace(/[\-_\/|,.،؛;:+()\[\]{}]/g, " ")
            .replace(/\s+/g, " ");
    }

    function escapeHomeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getCategoryName(categoryId) {
        const category = categories.find(
            item => Number(item.id) === Number(categoryId)
        );
        return category ? String(category.name || "") : "";
    }

    function formatSearchPrice(value) {
        const number = Number(value || 0);
        if (!number) return "قیمت نامشخص";
        return `${number.toLocaleString("fa-IR")} ریال`;
    }

    function getSearchImageBase(product) {
        const code = String(product?.code || "").trim();
        return code
            ? `images/products/${encodeURIComponent(code)}`
            : "";
    }

    function createSearchResult(product, index) {
        const name = String(product.name || "محصول بدون نام");
        const code = String(product.code || "").trim();
        const category = getCategoryName(product.category_id);
        const imageBase = getSearchImageBase(product);
        const activeClass = index === activeIndex ? " is-active" : "";

        return `
            <button
                type="button"
                class="home-search-result${activeClass}"
                role="option"
                aria-selected="${index === activeIndex ? "true" : "false"}"
                data-home-search-index="${index}"
            >
                <span class="home-search-result-image">
                    ${imageBase ? `
                        <img
                            src="${imageBase}.webp"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            data-search-image-base="${imageBase}"
                            data-search-image-step="webp"
                            onerror="switchHomeSearchImage(this)"
                        >
                    ` : ""}
                </span>

                <span class="home-search-result-info">
                    <span class="home-search-result-name">${escapeHomeHtml(name)}</span>
                    <span class="home-search-result-meta">
                        ${category ? `<span>${escapeHomeHtml(category)}</span>` : ""}
                        ${code ? `<span>•</span><span>${escapeHomeHtml(code)}</span>` : ""}
                    </span>
                </span>

                <span class="home-search-result-price">${formatSearchPrice(product.sale_price)}</span>
                <span class="home-search-result-arrow" aria-hidden="true">←</span>
            </button>
        `;
    }

    function openProduct(product) {
        const code = String(product?.code || "").trim();
        if (!code) return;
        window.location.href = `product.html?code=${encodeURIComponent(code)}`;
    }

    function renderHomeSearch(query) {
        const normalized = normalizeHomeSearch(query);
        activeIndex = -1;

        if (!normalized) {
            results.hidden = true;
            results.innerHTML = "";
            input.setAttribute("aria-expanded", "false");
            return;
        }

        const terms = normalized.split(" ").filter(Boolean);

        const matches = products
            .map(product => {
                const name = normalizeHomeSearch(product.name);
                const code = normalizeHomeSearch(product.code);
                const specs = normalizeHomeSearch(product.technical_specs);
                const notes = normalizeHomeSearch(product.notes);
                const category = normalizeHomeSearch(getCategoryName(product.category_id));

                const haystack = `${name} ${code} ${specs} ${notes} ${category}`;
                const allTermsMatch = terms.every(term => haystack.includes(term));

                if (!allTermsMatch) return null;

                let score = 0;
                if (name === normalized) score += 100;
                if (name.startsWith(normalized)) score += 45;
                if (code === normalized) score += 80;
                if (code.startsWith(normalized)) score += 35;
                if (category.includes(normalized)) score += 12;
                if (Number(product.qty) > 0) score += 5;

                return { product, score };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || String(a.product.name || "").localeCompare(String(b.product.name || ""), "fa"))
            .slice(0, 6)
            .map(item => item.product);

        if (!matches.length) {
            results.innerHTML = `
                <div class="home-search-empty">
                    <strong>محصولی پیدا نشد</strong>
                    عبارت دیگری مثل «لنوو»، «مانیتور» یا کد کالا را امتحان کنید.
                </div>
            `;
            results.hidden = false;
            input.setAttribute("aria-expanded", "true");
            return;
        }

        results.innerHTML = matches
            .map((product, index) => createSearchResult(product, index))
            .join("");

        results.hidden = false;
        input.setAttribute("aria-expanded", "true");

        results.querySelectorAll("[data-home-search-index]").forEach(button => {
            button.addEventListener("mouseenter", () => {
                activeIndex = Number(button.dataset.homeSearchIndex);
                updateActiveSearchResult();
            });

            button.addEventListener("click", () => {
                const product = matches[Number(button.dataset.homeSearchIndex)];
                openProduct(product);
            });
        });
    }

    function updateActiveSearchResult() {
        results.querySelectorAll("[data-home-search-index]").forEach(button => {
            const isActive = Number(button.dataset.homeSearchIndex) === activeIndex;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
    }

    async function loadHomeSearchData() {
        try {
            const [productsResponse, categoriesResponse] = await Promise.all([
                fetch("data/availability.json", { cache: "no-store" }),
                fetch("data/categories.json", { cache: "no-store" })
            ]);

            if (!productsResponse.ok) {
                throw new Error(`availability.json: HTTP ${productsResponse.status}`);
            }

            products = await productsResponse.json();
            categories = categoriesResponse.ok
                ? await categoriesResponse.json()
                : [];

            if (!Array.isArray(products)) {
                products = [];
            }

            if (!Array.isArray(categories)) {
                categories = [];
            }

            products = products.filter(product => Number(product.is_active) === 1);
        } catch (error) {
            console.error("Homepage search data error:", error);
            products = [];
            categories = [];
        }
    }

    input.addEventListener("input", () => {
        clearButton.hidden = !input.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderHomeSearch(input.value), 35);
    });

    input.addEventListener("keydown", event => {
        const visibleResults = !results.hidden;
        const resultButtons = results.querySelectorAll("[data-home-search-index]");

        if (event.key === "ArrowDown" && visibleResults && resultButtons.length) {
            event.preventDefault();
            activeIndex = Math.min(activeIndex + 1, resultButtons.length - 1);
            updateActiveSearchResult();
            resultButtons[activeIndex]?.scrollIntoView({ block: "nearest" });
            return;
        }

        if (event.key === "ArrowUp" && visibleResults && resultButtons.length) {
            event.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActiveSearchResult();
            resultButtons[activeIndex]?.scrollIntoView({ block: "nearest" });
            return;
        }

        if (event.key === "Enter" && visibleResults && activeIndex >= 0 && resultButtons[activeIndex]) {
            event.preventDefault();
            resultButtons[activeIndex].click();
            return;
        }

        if (event.key === "Escape") {
            results.hidden = true;
            input.setAttribute("aria-expanded", "false");
        }
    });

    clearButton.addEventListener("click", () => {
        input.value = "";
        clearButton.hidden = true;
        renderHomeSearch("");
        input.focus();
    });

    searchBox.querySelectorAll("[data-home-search-example]").forEach(button => {
        button.addEventListener("click", () => {
            input.value = button.dataset.homeSearchExample || "";
            clearButton.hidden = false;
            renderHomeSearch(input.value);
            input.focus();
        });
    });

    document.addEventListener("keydown", event => {
        const tag = document.activeElement?.tagName;
        const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;

        if (event.key === "/" && !isTyping) {
            event.preventDefault();
            input.focus();
        }
    });

    document.addEventListener("click", event => {
        if (!searchBox.contains(event.target)) {
            results.hidden = true;
            input.setAttribute("aria-expanded", "false");
        }
    });

    loadHomeSearchData();

})();

function switchHomeSearchImage(image) {
    const base = image.dataset.searchImageBase;
    const step = image.dataset.searchImageStep;

    if (!base) return;

    if (step === "webp") {
        image.dataset.searchImageStep = "jpg";
        image.src = `${base}.jpg`;
        return;
    }

    if (step === "jpg") {
        image.dataset.searchImageStep = "jpeg";
        image.src = `${base}.jpeg`;
        return;
    }

    if (step === "jpeg") {
        image.dataset.searchImageStep = "png";
        image.src = `${base}.png`;
        return;
    }

    image.style.display = "none";
}
