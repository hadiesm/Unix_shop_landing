const productsGrid =
    document.getElementById("productsGrid");

const categoryTree =
    document.getElementById("categoryTree");

const productSearch =
    document.getElementById("productSearch");

const sortProducts =
    document.getElementById("sortProducts");

const productCount =
    document.getElementById("productCount");

const emptyProducts =
    document.getElementById("emptyProducts");

const activeFilters =
    document.getElementById("activeFilters");

const clearCategory =
    document.getElementById("clearCategory");

const resetFilters =
    document.getElementById("resetFilters");

const laptopFinderButton =
    document.getElementById("laptopFinderButton");

const laptopFinderModal =
    document.getElementById("laptopFinderModal");

const laptopFinderForm =
    document.getElementById("laptopFinderForm");

const laptopFinderResults =
    document.getElementById("laptopFinderResults");


/* =====================================================
DATA
===================================================== */

let products = [];
let categories = [];
let laptopFinderSpecs = {};

let selectedCategory = null;


/* =====================================================
PRODUCT COMPARISON
===================================================== */

const MAX_COMPARE = 4;
const COMPARE_STORAGE_KEY = "compareProducts";

function getCompareProducts() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(COMPARE_STORAGE_KEY) || "[]"
        );
        return Array.isArray(stored) ? stored.map(String).slice(0, MAX_COMPARE) : [];
    } catch (error) {
        return [];
    }
}

function saveCompareProducts(ids) {
    localStorage.setItem(
        COMPARE_STORAGE_KEY,
        JSON.stringify(ids.map(String).slice(0, MAX_COMPARE))
    );
}

function isCompared(productId) {
    return getCompareProducts().includes(String(productId));
}

function updateCompareUI() {
    const ids = getCompareProducts();
    const count = ids.length;
    const bar = document.getElementById("compareBar");
    const countEl = document.getElementById("compareCount");

    if (countEl) {
        countEl.textContent = `${formatPersianNumber(count)} محصول انتخاب شده`;
    }

    if (bar) {
        bar.classList.toggle("hidden", count === 0);
    }

    document.querySelectorAll(".product-compare-button").forEach(button => {
        const selected = ids.includes(String(button.dataset.compareId));
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.querySelector(".compare-button-icon").textContent = selected ? "✓" : "⚖";
        button.querySelector(".compare-button-label").textContent = selected ? "در مقایسه" : "مقایسه";
    });
}

function getCompareCategoryKey(productId) {
    const product = products.find(
        item => String(item.id) === String(productId)
    );

    if (!product) {
        return null;
    }

    let category = getCategory(product.category_id);

    if (!category) {
        return null;
    }

    const visited = new Set();

    while (category) {
        const categoryId = Number(category.id);

        if (visited.has(categoryId)) {
            break;
        }

        visited.add(categoryId);

        const parentId = category.parent_id;

        // For laptops and monitors, all brand/model subcategories
        // belong to the same comparison group.
        if (parentId === null || parentId === undefined) {
            return categoryId;
        }

        // Accessories need a more specific comparison group.
        // Example: wired/wireless mouse can compare with each other,
        // but mouse pads cannot compare with cooling pads.
        if (Number(parentId) === 2) {
            return categoryId;
        }

        category = getCategory(parentId);
    }

    return null;
}

function toggleCompare(productId) {
    const id = String(productId);
    let ids = getCompareProducts();

    if (ids.includes(id)) {
        ids = ids.filter(item => item !== id);
    } else {
        if (ids.length >= MAX_COMPARE) {
            alert(`حداکثر ${formatPersianNumber(MAX_COMPARE)} محصول را می‌توانید همزمان مقایسه کنید.`);
            return;
        }

        const selectedKey = getCompareCategoryKey(id);

        if (ids.length > 0) {
            const existingKey = getCompareCategoryKey(ids[0]);

            if (
                selectedKey === null ||
                existingKey === null ||
                selectedKey !== existingKey
            ) {
                alert("محصولات انتخابی باید از یک دسته‌بندی قابل مقایسه باشند.");
                return;
            }
        }

        ids.push(id);
    }

    saveCompareProducts(ids);
    updateCompareUI();
}

function clearCompareSelection() {
    localStorage.removeItem(COMPARE_STORAGE_KEY);
    updateCompareUI();
}


/* =====================================================
LOAD JSON DATA
===================================================== */

async function loadData() {

    try {

        const [
            availabilityResponse,
            categoriesResponse,
            specsResponse
        ] = await Promise.all([

            fetch("data/availability.json", {
                cache: "no-store"
            }),

            fetch("data/categories.json", {
                cache: "no-store"
            }),

            fetch("data/product-specs.json", {
                cache: "no-store"
            })

        ]);


        if (!availabilityResponse.ok) {

            throw new Error(
                `availability.json: HTTP ${availabilityResponse.status}`
            );

        }


        if (!categoriesResponse.ok) {

            throw new Error(
                `categories.json: HTTP ${categoriesResponse.status}`
            );

        }


        const availabilityData =
            await availabilityResponse.json();

        const categoriesData =
            await categoriesResponse.json();

        let specsData = { products: {} };
        if (specsResponse.ok) {
            try {
                specsData = await specsResponse.json();
            } catch (error) {
                console.warn("product-specs.json قابل خواندن نیست.", error);
            }
        }


        if (!Array.isArray(availabilityData)) {

            throw new Error(
                "ساختار availability.json باید آرایه باشد."
            );

        }


        if (!Array.isArray(categoriesData)) {

            throw new Error(
                "ساختار categories.json باید آرایه باشد."
            );

        }


        /*
         * Availability data contains only
         * public product information + quantity.
         *
         * No purchase price is exposed.
         */

        products =
            availabilityData.filter(
                product =>
                    Number(product.is_active) === 1
            );


        categories =
            categoriesData.filter(
                category =>
                    Number(category.is_active) === 1
            );

        laptopFinderSpecs =
            specsData && typeof specsData.products === "object"
                ? specsData.products
                : {};


        console.log(
            "Unix Shop availability loaded:",
            products.length
        );


        console.log(
            "Unix Shop categories loaded:",
            categories.length
        );


    } catch (error) {

        console.error(
            "Unix Shop JSON error:",
            error
        );


        showLoadError(
            "دریافت اطلاعات محصولات با خطا مواجه شد."
        );


        throw error;
    }

}


/* =====================================================
LOAD ERROR
===================================================== */

function showLoadError(message) {

    if (categoryTree) {

        categoryTree.innerHTML = `
            <div class="category-loading">
                ${escapeHtml(message)}
            </div>
        `;

    }


    if (productsGrid) {

        productsGrid.innerHTML = `
            <div class="products-loading">
                <span>
                    ${escapeHtml(message)}
                </span>
            </div>
        `;

    }


    if (emptyProducts) {

        emptyProducts.hidden = true;

    }

}


/* =====================================================
CATEGORY HELPERS
===================================================== */

function getCategory(id) {

    return categories.find(
        category =>
            Number(category.id) === Number(id)
    ) || null;

}


function getChildren(parentId) {

    return categories.filter(
        category =>
            Number(category.parent_id) ===
            Number(parentId)
    );

}


function getDescendantIds(categoryId) {

    const ids = [
        Number(categoryId)
    ];


    const children =
        getChildren(categoryId);


    children.forEach(child => {

        ids.push(
            ...getDescendantIds(child.id)
        );

    });


    return ids;

}


/* =====================================================
CATEGORY PATH
===================================================== */

function getCategoryPath(categoryId) {

    const path = [];

    let category =
        getCategory(categoryId);


    /*
     * Safety protection against
     * accidental circular category data.
     */

    const visited = new Set();


    while (category) {

        if (
            visited.has(
                Number(category.id)
            )
        ) {

            break;

        }


        visited.add(
            Number(category.id)
        );


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
            getCategory(
                category.parent_id
            );

    }


    return path.join(" / ");

}


/* =====================================================
CATEGORY PRODUCT COUNT
===================================================== */

function getCategoryProductCount(categoryId) {

    const descendantIds =
        getDescendantIds(categoryId);


    return products.filter(
        product =>
            descendantIds.includes(
                Number(product.category_id)
            )
    ).length;

}


/* =====================================================
CATEGORY RENDER
===================================================== */

function renderCategories() {

    if (!categoryTree) {
        return;
    }


    categoryTree.innerHTML = "";


    /*
     * ALL PRODUCTS
     */

    const allButton =
        document.createElement("button");


    allButton.type = "button";


    allButton.className =
        "category-button" +
        (
            selectedCategory === null
                ? " active"
                : ""
        );


    allButton.innerHTML = `
        <span class="category-name">
            همه محصولات
        </span>

        <span class="category-count">
            ${formatPersianNumber(products.length)}
        </span>
    `;


    allButton.addEventListener(
        "click",
        () => {

            selectedCategory = null;

            renderCategories();
            renderProducts();

        }
    );


    categoryTree.appendChild(
        allButton
    );


    /*
     * ROOT CATEGORIES
     */

    const roots =
        categories.filter(
            category =>
                (
                    category.parent_id === null ||
                    category.parent_id === undefined
                )
        );


    roots.forEach(category => {

        categoryTree.appendChild(
            createCategoryElement(category)
        );

    });

}


/* =====================================================
CREATE CATEGORY
===================================================== */

function createCategoryElement(category) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "category-item";


    const button =
        document.createElement("button");


    button.type = "button";


    const count =
        getCategoryProductCount(
            category.id
        );


    const isActive =
        selectedCategory ===
        Number(category.id);


    button.className =
        "category-button" +
        (
            isActive
                ? " active"
                : ""
        );


    button.innerHTML = `
        <span class="category-name">
            ${escapeHtml(category.name)}
        </span>

        <span class="category-count">
            ${formatPersianNumber(count)}
        </span>
    `;


    button.addEventListener(
        "click",
        () => {

            selectedCategory =
                Number(category.id);


            renderCategories();
            renderProducts();

        }
    );


    wrapper.appendChild(
        button
    );


    /*
     * CHILDREN
     */

    const children =
        getChildren(category.id);


    if (children.length > 0) {

        const childContainer =
            document.createElement("div");


        childContainer.className =
            "category-children";


        children.forEach(child => {

            childContainer.appendChild(
                createCategoryElement(child)
            );

        });


        wrapper.appendChild(
            childContainer
        );

    }


    return wrapper;

}


/* =====================================================
FILTER PRODUCTS
===================================================== */

function getFilteredProducts() {

    let result =
        [...products];


    /*
     * CATEGORY
     */

    if (selectedCategory !== null) {

        const categoryIds =
            getDescendantIds(
                selectedCategory
            );


        result =
            result.filter(
                product =>
                    categoryIds.includes(
                        Number(product.category_id)
                    )
            );

    }


    /*
     * SEARCH
     */

    const search =
        productSearch
            ? normalizeSearch(
                productSearch.value
            )
            : "";


    if (search) {

        result =
            result.filter(product => {

                const name =
                    normalizeSearch(
                        product.name
                    );


                const code =
                    normalizeSearch(
                        product.code
                    );


                return (
                    name.includes(search) ||
                    code.includes(search)
                );

            });

    }


    /*
     * SORT
     */

    const sortValue =
        sortProducts
            ? sortProducts.value
            : "default";


    switch (sortValue) {

        case "price-low":

            result.sort(
                (a, b) =>
                    getNumber(a.sale_price) -
                    getNumber(b.sale_price)
            );

            break;


        case "price-high":

            result.sort(
                (a, b) =>
                    getNumber(b.sale_price) -
                    getNumber(a.sale_price)
            );

            break;


        case "name":

            result.sort(
                (a, b) =>
                    String(a.name || "")
                        .localeCompare(
                            String(b.name || ""),
                            "fa"
                        )
            );

            break;


        default:

            /*
             * AVAILABLE PRODUCTS FIRST
             *
             * Products with qty > 0 appear first.
             * Products with qty <= 0 appear after them.
             *
             * Original JSON order is preserved
             * inside each group.
             */

            result.sort(
                (a, b) => {

                    const aAvailable =
                        getNumber(a.qty) > 0;

                    const bAvailable =
                        getNumber(b.qty) > 0;


                    if (
                        aAvailable === bAvailable
                    ) {

                        return 0;

                    }


                    return aAvailable
                        ? -1
                        : 1;

                }
            );

            break;

    }


    return result;

}


/* =====================================================
RENDER PRODUCTS
===================================================== */

function renderProducts() {

    if (!productsGrid) {
        return;
    }


    const filtered =
        getFilteredProducts();


    /*
     * COUNT
     */

    if (productCount) {

        productCount.textContent =
            formatPersianNumber(
                filtered.length
            );

    }


    /*
     * ACTIVE FILTER
     */

    renderActiveFilters();


    /*
     * EMPTY
     */

    if (!filtered.length) {

        productsGrid.innerHTML = "";


        if (emptyProducts) {

            emptyProducts.hidden = false;

        }


        return;

    }


    if (emptyProducts) {

        emptyProducts.hidden = true;

    }


    /*
     * CARDS
     */

    productsGrid.innerHTML =
        filtered
            .map(product =>
                createProductCard(product)
            )
            .join("");


}



/* =====================================================
PRODUCT CARD
===================================================== */

function createProductCard(product) {

    const category =
        getCategoryPath(
            product.category_id
        );


    /*
     * STOCK
     */

    const stock =
        getNumber(
            product.qty
        );


    const hasStock =
        stock > 0;


    const stockText =
        hasStock
            ? "موجود"
            : "ناموجود";


    /*
     * PRODUCT NAME
     */

    const productName =
        escapeHtml(
            product.name ||
            "محصول بدون نام"
        );


    /*
     * PRICE
     */

    const price =
        formatMoney(
            product.sale_price
        );


    /*
     * PRODUCT CODE
     *
     * Example:
     *
     * PRD-00001
     */

    const productCode =
        String(
            product.code || ""
        ).trim();


    /*
     * PRODUCT IMAGE
     *
     * The image belongs directly
     * to this product card.
     */

    const imageBase =
        productCode
            ? `images/products/${encodeURIComponent(productCode)}`
            : "";


    return `
        <article
            class="product-card"
            data-product-id="${escapeHtml(product.id)}"
            tabindex="0"
            role="button"
            aria-label="مشاهده مشخصات ${productName}"
        >

            <div class="product-image">

                <span class="product-tag ${
                    hasStock
                        ? "available"
                        : "unavailable"
                }">

                    ${
                        hasStock
                            ? "موجود"
                            : "ناموجود"
                    }

                </span>


                <div class="product-image-wrapper">

                    ${
                        imageBase
                            ? `
                                <img
                                    class="product-real-image"
                                    src="${imageBase}.webp"
                                    alt="${productName}"
                                    loading="lazy"
                                    data-image-base="${imageBase}"
                                >
                            `
                            : `
                                ${getProductVisual(
                                    product.category_id
                                )}
                            `
                    }

                </div>

            </div>


            <div class="product-info">

                <span class="product-category">

                    ${escapeHtml(
                        category ||
                        "بدون دسته‌بندی"
                    )}

                </span>


                <h3>
                    ${productName}
                </h3>


                <p class="product-description">

                    محصول با کیفیت از مجموعه یونیکس شاپ

                </p>


                <div class="product-bottom">

                    <div class="product-price">

                        ${
                            hasStock
                                ? `
                                    <span class="product-price-label">
                                        قیمت
                                    </span>

                                    <strong>
                                        ${price}
                                    </strong>

                                    <small>
                                        ریال
                                    </small>
                                `
                                : `
                                    <strong>
                                        -
                                    </strong>
                                `
                        }


                        <span
                            class="product-stock ${
                                hasStock
                                    ? "available"
                                    : "unavailable"
                            }"
                        >
                            ${stockText}
                        </span>

                    </div>


                    <div class="product-actions">

                        <button
                            type="button"
                            class="product-compare-button ${isCompared(product.id) ? "selected" : ""}"
                            data-compare-id="${escapeHtml(product.id)}"
                            aria-pressed="${isCompared(product.id) ? "true" : "false"}"
                            aria-label="${isCompared(product.id) ? "حذف از مقایسه" : "افزودن به مقایسه"}"
                        >
                            <span class="compare-button-icon">${isCompared(product.id) ? "✓" : "⚖"}</span>
                            <span class="compare-button-label">${isCompared(product.id) ? "در مقایسه" : "مقایسه"}</span>
                        </button>

                        <button
                            type="button"
                            class="product-details-button"
                            aria-label="مشاهده مشخصات ${productName}"
                            data-product-id="${escapeHtml(product.id)}"
                        >
                            <span>مشخصات</span>
                        </button>

                    </div>

                </div>

            </div>

        </article>
    `;

}

/* =====================================================
PRODUCT DETAILS MODAL
===================================================== */

function ensureProductModal() {

    if (document.getElementById("productDetailsModal")) {
        return;
    }

    const modal = document.createElement("div");

    modal.id = "productDetailsModal";
    modal.className = "product-details-modal";
    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="product-details-overlay"
            data-modal-close
        ></div>

        <div
            class="product-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="productDetailsTitle"
        >

            <button
                type="button"
                class="product-details-close"
                aria-label="بستن"
                data-modal-close
            >
                ×
            </button>


            <div class="product-details-content">

                <div class="product-details-image">

                    <img
                        id="productDetailsImage"
                        src=""
                        alt=""
                    >

                    <div
                        id="productDetailsVisual"
                        class="product-details-visual"
                        hidden
                    ></div>

                </div>


                <div class="product-details-info">

                    <span
                        id="productDetailsCategory"
                        class="product-details-category"
                    ></span>


                    <h2
                        id="productDetailsTitle"
                    ></h2>


                    <div class="product-details-code">

                        <span>
                            کد محصول
                        </span>

                        <strong
                            id="productDetailsCode"
                        ></strong>

                    </div>


                    <div class="product-details-summary">

                        <div class="product-details-price">

                            <span>
                                قیمت
                            </span>

                            <strong
                                id="productDetailsPrice"
                            ></strong>

                            <small>
                                ریال
                            </small>

                        </div>


                        <div class="product-details-stock">

                            <span>
                                وضعیت
                            </span>

                            <strong
                                id="productDetailsStock"
                            ></strong>

                        </div>

                    </div>


                    <div
                        id="productDetailsNotes"
                        class="product-details-section"
                        hidden
                    >

                        <h3>
                            توضیحات
                        </h3>

                        <p
                            id="productDetailsNotesText"
                        ></p>

                    </div>


                    <div
                        id="productDetailsSpecs"
                        class="product-details-section"
                        hidden
                    >

                        <h3>
                            مشخصات فنی
                        </h3>

                        <div
                            id="productDetailsSpecsText"
                            class="product-details-specs"
                        ></div>

                    </div>

                    <div
                        id="relatedProductsSection"
                        class="product-details-related"
                        hidden
                    >

                        <div class="product-details-related-heading">

                            <div>
                                <span class="product-details-related-eyebrow">
                                    انتخاب‌های نزدیک
                                </span>

                                <h3>
                                    محصولات مشابه این محصول
                                </h3>

                                <p id="relatedProductsDescription"></p>
                            </div>

                            <span class="product-details-related-count"
                                  id="relatedProductsCount"></span>

                        </div>

                        <div
                            id="relatedProductsGrid"
                            class="related-products-grid"
                        ></div>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

}


/* =====================================================
PARSE TECHNICAL SPECS
===================================================== */

function formatTechnicalSpecs(value) {

    const text =
        String(value ?? "").trim();

    if (!text) {
        return "";
    }

    /*
     * Current database data uses
     * slash-separated specifications.
     *
     * Example:
     *
     * FHD/IPS/100Hz/HDMI/VGA
     */

    const parts =
        text
            .split("/")
            .map(item => item.trim())
            .filter(Boolean);

    if (!parts.length) {
        return "";
    }

    return parts
        .map(
            item => `
                <span class="product-spec-chip">
                    ${escapeHtml(item)}
                </span>
            `
        )
        .join("");
}


/* =====================================================
STRUCTURED TECHNICAL SPECS
===================================================== */

function formatStructuredSpecs(spec) {

    if (!spec || typeof spec !== "object") {
        return "";
    }

    const labels = {
        basic: "اطلاعات پایه",
        processor: "پردازنده",
        memory: "حافظه رم",
        storage: "حافظه داخلی",
        graphics: "گرافیک",
        display: "نمایشگر",
        image: "تصویر",
        connectivity: "اتصالات",
        dimensions: "ابعاد",
        battery: "باتری",
        ports: "درگاه‌ها",
        network: "شبکه",
        features: "ویژگی‌ها"
    };

    const valueLabels = {
        brand: "برند",
        model: "مدل",
        family: "سری پردازنده",
        generation: "نسل",
        cores: "تعداد هسته",
        threads: "تعداد رشته",
        base_clock_ghz: "فرکانس پایه",
        turbo_clock_ghz: "فرکانس بوست",
        capacity_gb: "ظرفیت",
        type: "نوع",
        bus_mhz: "باس",
        speed_mhz: "سرعت",
        model_gpu: "مدل گرافیک",
        vram_gb: "حافظه گرافیک",
        resolution: "رزولوشن",
        size_inch: "اندازه",
        refresh_rate_hz: "نرخ نوسازی",
        response_time_ms: "زمان پاسخ",
        panel: "نوع پنل",
        adaptive_sync: "همگام‌سازی تطبیقی"
    };

    const formatScalar = value => {
        if (value === null || value === undefined || value === "") {
            return "";
        }
        if (typeof value === "boolean") {
            return value ? "دارد" : "ندارد";
        }
        if (Array.isArray(value)) {
            return value
                .map(item => formatScalar(item))
                .filter(Boolean)
                .join("، ");
        }
        if (typeof value === "object") {
            return Object.entries(value)
                .map(([key, item]) => {
                    const rendered = formatScalar(item);
                    return rendered
                        ? `${valueLabels[key] || key}: ${rendered}`
                        : "";
                })
                .filter(Boolean)
                .join(" | ");
        }
        return String(value);
    };

    return Object.entries(spec)
        .filter(([key]) => key !== "type")
        .map(([sectionKey, sectionValue]) => {
            if (!sectionValue || typeof sectionValue !== "object") {
                return "";
            }

            const rows = Object.entries(sectionValue)
                .map(([key, value]) => {
                    const rendered = formatScalar(value);
                    if (!rendered) return "";
                    return `
                        <div class="product-structured-spec-row">
                            <span>${escapeHtml(valueLabels[key] || key)}</span>
                            <strong>${escapeHtml(rendered)}</strong>
                        </div>
                    `;
                })
                .filter(Boolean)
                .join("");

            if (!rows) return "";

            return `
                <div class="product-structured-spec-group">
                    <h4>${escapeHtml(labels[sectionKey] || sectionKey)}</h4>
                    <div class="product-structured-spec-rows">
                        ${rows}
                    </div>
                </div>
            `;
        })
        .filter(Boolean)
        .join("");
}


/* =====================================================
RELATED PRODUCTS
===================================================== */

function getProductSpec(product) {
    if (!product) {
        return null;
    }

    return laptopFinderSpecs[String(product.id)] || null;
}

function getProductType(product) {
    const spec = getProductSpec(product);

    if (spec && spec.type) {
        return String(spec.type).toLowerCase().trim();
    }

    const path = getCategoryPath(product?.category_id || null);
    const normalized = normalizeSearch(path);

    if (normalized.includes("لپ تاپ")) return "laptop";
    if (normalized.includes("مانیتور")) return "monitor";
    if (normalized.includes("ماوس")) return "mouse";
    if (normalized.includes("کول پد")) return "cooling-pad";
    if (normalized.includes("دسته بازی")) return "gamepad";
    if (normalized.includes("فرمان")) return "steering-wheel";
    if (normalized.includes("پد ماوس")) return "mouse-pad";

    return "generic";
}

function similarityNumber(a, b, tolerance = 1) {
    const av = Number(a);
    const bv = Number(b);

    if (!Number.isFinite(av) || !Number.isFinite(bv)) {
        return 0;
    }

    const max = Math.max(Math.abs(av), Math.abs(bv), tolerance);
    const ratio = 1 - Math.abs(av - bv) / max;

    return Math.max(0, Math.min(1, ratio));
}

function normalizedSpecValue(value) {
    return normalizeSearch(value)
        .replace(/\s+/g, "")
        .trim();
}

function getComparableRootKey(product) {
    return getCompareCategoryKey(product?.id);
}

function scoreRelatedProduct(source, candidate) {
    const sourceType = getProductType(source);
    const candidateType = getProductType(candidate);

    if (sourceType !== candidateType) {
        return -1;
    }

    const sourceKey = getComparableRootKey(source);
    const candidateKey = getComparableRootKey(candidate);

    if (sourceKey === null || candidateKey === null || sourceKey !== candidateKey) {
        return -1;
    }

    const sourceSpec = getProductSpec(source) || {};
    const candidateSpec = getProductSpec(candidate) || {};

    let score = 0;
    let weightedMatches = 0;

    const addTextMatch = (a, b, weight) => {
        const av = normalizedSpecValue(a);
        const bv = normalizedSpecValue(b);

        if (!av || !bv) return;

        weightedMatches += weight;
        if (av === bv || av.includes(bv) || bv.includes(av)) {
            score += weight;
        }
    };

    const addNumericMatch = (a, b, weight, tolerance) => {
        const av = Number(a);
        const bv = Number(b);

        if (!Number.isFinite(av) || !Number.isFinite(bv)) return;

        weightedMatches += weight;
        score += weight * similarityNumber(av, bv, tolerance);
    };

    const sourcePrice = getNumber(source.sale_price);
    const candidatePrice = getNumber(candidate.sale_price);

    if (sourcePrice > 0 && candidatePrice > 0) {
        const priceSimilarity = similarityNumber(sourcePrice, candidatePrice, sourcePrice);
        score += 26 * priceSimilarity;
        weightedMatches += 26;
    }

    if (sourceType === "laptop") {
        addTextMatch(sourceSpec.basic?.brand, candidateSpec.basic?.brand, 8);
        addTextMatch(sourceSpec.processor?.family, candidateSpec.processor?.family, 10);
        addTextMatch(sourceSpec.processor?.model, candidateSpec.processor?.model, 9);
        addNumericMatch(sourceSpec.processor?.generation, candidateSpec.processor?.generation, 5, 2);
        addNumericMatch(sourceSpec.memory?.capacity_gb, candidateSpec.memory?.capacity_gb, 8, 16);
        addTextMatch(sourceSpec.memory?.type, candidateSpec.memory?.type, 4);
        addNumericMatch(sourceSpec.storage?.capacity_gb, candidateSpec.storage?.capacity_gb, 6, 512);
        addTextMatch(sourceSpec.storage?.type, candidateSpec.storage?.type, 4);
        addTextMatch(sourceSpec.graphics?.model, candidateSpec.graphics?.model, 8);
        addNumericMatch(sourceSpec.graphics?.vram_gb, candidateSpec.graphics?.vram_gb, 7, 4);
        addTextMatch(sourceSpec.display?.resolution, candidateSpec.display?.resolution, 6);
        addNumericMatch(sourceSpec.display?.size_inch, candidateSpec.display?.size_inch, 4, 3);
        addNumericMatch(sourceSpec.display?.refresh_rate_hz, candidateSpec.display?.refresh_rate_hz, 5, 60);
    } else if (sourceType === "monitor") {
        addTextMatch(sourceSpec.basic?.brand, candidateSpec.basic?.brand, 5);
        addTextMatch(sourceSpec.basic?.resolution, candidateSpec.basic?.resolution, 13);
        addNumericMatch(sourceSpec.basic?.size_inch, candidateSpec.basic?.size_inch, 13, 5);
        addTextMatch(sourceSpec.image?.panel, candidateSpec.image?.panel, 10);
        addNumericMatch(sourceSpec.image?.refresh_rate_hz, candidateSpec.image?.refresh_rate_hz, 12, 120);
        addNumericMatch(sourceSpec.image?.response_time_ms, candidateSpec.image?.response_time_ms, 5, 5);
        addTextMatch(sourceSpec.image?.adaptive_sync, candidateSpec.image?.adaptive_sync, 5);
    } else {
        addTextMatch(sourceSpec.basic?.brand, candidateSpec.basic?.brand, 8);
        addTextMatch(sourceSpec.basic?.model, candidateSpec.basic?.model, 8);
    }

    const baseScore = weightedMatches > 0
        ? (score / weightedMatches) * 100
        : 0;

    // Availability is a useful tie-breaker, not the primary similarity signal.
    const candidateAvailable = getNumber(candidate.qty) > 0;
    return baseScore + (candidateAvailable ? 6 : 0);
}

function getRelatedProducts(source, limit = 4) {
    return products
        .filter(candidate => String(candidate.id) !== String(source.id))
        .map(candidate => ({
            product: candidate,
            score: scoreRelatedProduct(source, candidate)
        }))
        .filter(item => item.score >= 0)
        .sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) {
                return (b.score || 0) - (a.score || 0);
            }

            return getNumber(b.product.qty) - getNumber(a.product.qty);
        })
        .slice(0, limit)
        .map(item => item.product);
}

function getRelatedProductImageBase(product) {
    const code = String(product.code || "").trim();
    if (!code) return "";
    return `images/products/${encodeURIComponent(code)}`;
}

function bindRelatedProductImageFallbacks(grid) {
    if (!grid) return;

    const formats = ["webp", "jpg", "jpeg", "png"];

    grid.querySelectorAll(".related-product-real-image").forEach(image => {
        const base = image.dataset.imageBase;
        if (!base) return;

        image.dataset.tried = "webp";

        image.onerror = function () {
            const tried = this.dataset.tried
                ? this.dataset.tried.split(",").filter(Boolean)
                : [];

            const next = formats.find(format => !tried.includes(format));

            if (next) {
                tried.push(next);
                this.dataset.tried = tried.join(",");
                this.src = `${base}.${next}`;
                return;
            }

            this.hidden = true;
            const fallback = this.parentElement?.querySelector(".related-product-fallback");
            if (fallback) fallback.hidden = false;
        };

        image.src = `${base}.webp`;
    });
}

function renderRelatedProducts(sourceProduct) {
    const section = document.getElementById("relatedProductsSection");
    const grid = document.getElementById("relatedProductsGrid");
    const description = document.getElementById("relatedProductsDescription");
    const count = document.getElementById("relatedProductsCount");

    if (!section || !grid || !sourceProduct) {
        return;
    }

    const related = getRelatedProducts(sourceProduct, 4);

    if (!related.length) {
        section.hidden = true;
        grid.innerHTML = "";
        return;
    }

    const type = getProductType(sourceProduct);
    const typeLabel = {
        laptop: "لپ‌تاپ‌های نزدیک به این مدل",
        monitor: "مانیتورهای مشابه از نظر مشخصات",
        mouse: "ماوس‌های مشابه",
        "cooling-pad": "کول‌پدهای مشابه",
        gamepad: "دسته‌های بازی مشابه",
        "steering-wheel": "فرمان‌های مشابه",
        "mouse-pad": "پدهای ماوس مشابه",
        generic: "محصولات نزدیک به این گزینه"
    }[type] || "محصولات نزدیک به این گزینه";

    description.textContent = typeLabel;
    count.textContent = `${formatPersianNumber(related.length)} گزینه`;

    grid.innerHTML = related.map(product => {
        const available = getNumber(product.qty) > 0;
        const imageBase = getRelatedProductImageBase(product);

        return `
            <button
                type="button"
                class="related-product-card"
                data-related-product-id="${escapeHtml(product.id)}"
            >
                <div class="related-product-image-wrap">
                    ${imageBase ? `
                        <img
                            class="related-product-real-image"
                            src="${imageBase}.webp"
                            alt="${escapeHtml(product.name || "محصول")}"
                            loading="lazy"
                            decoding="async"
                            data-image-base="${imageBase}"
                            data-tried="webp"
                        >
                    ` : ""}
                    <div class="related-product-fallback" ${imageBase ? "hidden" : ""}>
                        U
                    </div>
                </div>

                <div class="related-product-info">
                    <span class="related-product-stock ${available ? "available" : "unavailable"}">
                        ${available ? "موجود" : "ناموجود"}
                    </span>
                    <strong>${escapeHtml(product.name || "محصول بدون نام")}</strong>
                    <span class="related-product-price">
                        ${available ? `${formatMoney(product.sale_price)} تومان` : "تماس برای قیمت"}
                    </span>
                </div>
            </button>
        `;
    }).join("");

    bindRelatedProductImageFallbacks(grid);

    grid.querySelectorAll("[data-related-product-id]").forEach(button => {
        button.addEventListener("click", () => {
            openProductDetails(button.dataset.relatedProductId);
        });
    });

    section.hidden = false;
}


/* =====================================================
OPEN PRODUCT DETAILS
===================================================== */

function openProductDetails(productId) {

    ensureProductModal();

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(productId)
        );

    if (!product) {
        return;
    }

    const modal =
        document.getElementById(
            "productDetailsModal"
        );

    if (!modal) {
        return;
    }


    const category =
        getCategoryPath(
            product.category_id
        );


    const stock =
        getNumber(product.qty);


    const hasStock =
        stock > 0;


    const title =
        document.getElementById(
            "productDetailsTitle"
        );

    const categoryElement =
        document.getElementById(
            "productDetailsCategory"
        );

    const code =
        document.getElementById(
            "productDetailsCode"
        );

    const price =
        document.getElementById(
            "productDetailsPrice"
        );

    const stockElement =
        document.getElementById(
            "productDetailsStock"
        );

    const notesSection =
        document.getElementById(
            "productDetailsNotes"
        );

    const notesText =
        document.getElementById(
            "productDetailsNotesText"
        );

    const specsSection =
        document.getElementById(
            "productDetailsSpecs"
        );

    const specsText =
        document.getElementById(
            "productDetailsSpecsText"
        );

    const image =
        document.getElementById(
            "productDetailsImage"
        );

    const visual =
        document.getElementById(
            "productDetailsVisual"
        );


    /*
     * Basic information
     */

    title.textContent =
        product.name ||
        "محصول بدون نام";


    categoryElement.textContent =
        category ||
        "بدون دسته‌بندی";


    code.textContent =
        product.code ||
        "—";


    price.textContent =
        hasStock
            ? formatMoney(product.sale_price)
            : "-";


    stockElement.textContent =
        hasStock
            ? "موجود"
            : "ناموجود";


    stockElement.className =
        hasStock
            ? "product-details-stock-value available"
            : "product-details-stock-value unavailable";


    /*
     * Notes
     */

    const notes =
        String(
            product.notes ?? ""
        ).trim();


    if (notes) {

        notesText.textContent =
            notes;

        notesSection.hidden =
            false;

    } else {

        notesText.textContent =
            "";

        notesSection.hidden =
            true;

    }


    /*
     * Technical specifications
     */

    const technicalSpecsHtml =
        formatTechnicalSpecs(
            product.technical_specs
        );

    const structuredSpecsHtml =
        formatStructuredSpecs(
            getProductSpec(product)
        );

    const specsHtml =
        technicalSpecsHtml ||
        structuredSpecsHtml;


    if (specsHtml) {

        specsText.innerHTML =
            specsHtml;

        specsSection.hidden =
            false;

    } else {

        specsText.innerHTML =
            "<p class=\"product-specs-empty\">مشخصات فنی این محصول هنوز ثبت نشده است.</p>";

        specsSection.hidden =
            false;

    }


    /*
     * Related products
     */

    renderRelatedProducts(product);


    /*
     * Product image
     */

    const productCode =
        String(
            product.code || ""
        ).trim();


    if (productCode) {

        const imageBase =
            `images/products/${encodeURIComponent(productCode)}`;


        image.hidden = false;

        visual.hidden = true;


        image.alt =
            product.name ||
            "تصویر محصول";


        image.dataset.imageBase =
            imageBase;


        image.dataset.tried =
            "webp";


        image.src =
            `${imageBase}.webp`;


        image.onerror =
            function () {

                const tried =
                    this.dataset.tried
                        ? this.dataset.tried.split(",")
                        : ["webp"];


                const formats = [
                    "webp",
                    "jpg",
                    "jpeg",
                    "png"
                ];


                const next =
                    formats.find(
                        format =>
                            !tried.includes(format)
                    );


                if (next) {

                    tried.push(next);

                    this.dataset.tried =
                        tried.join(",");

                    this.src =
                        `${imageBase}.${next}`;

                    return;

                }


                /*
                 * No real image found.
                 * Show category visual instead.
                 */

                image.hidden = true;

                visual.hidden = false;

                visual.innerHTML =
                    getProductVisual(
                        product.category_id
                    );

            };

    } else {

        image.hidden = true;

        visual.hidden = false;

        visual.innerHTML =
            getProductVisual(
                product.category_id
            );

    }


    /*
     * Open
     */

    modal.hidden = false;

    document.body.classList.add(
        "product-modal-open"
    );


    /*
     * Prevent scrolling behind modal.
     */

    requestAnimationFrame(() => {

        modal.classList.add("open");

    });


    /*
     * Put focus on close button.
     */

    const closeButton =
        modal.querySelector(
            ".product-details-close"
        );


    if (closeButton) {

        closeButton.focus();

    }

}


/* =====================================================
CLOSE PRODUCT DETAILS
===================================================== */

function closeProductDetails() {

    const modal =
        document.getElementById(
            "productDetailsModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove("open");


    document.body.classList.remove(
        "product-modal-open"
    );


    setTimeout(() => {

        modal.hidden = true;

    }, 220);

}


/* =====================================================
PRODUCT CARD CLICK HANDLING
===================================================== */

if (productsGrid) {

    productsGrid.addEventListener(
        "click",
        event => {

            const detailsButton =
                event.target.closest(
                    ".product-details-button"
                );

            if (detailsButton) {
                event.preventDefault();
                event.stopPropagation();
                openProductDetails(detailsButton.dataset.productId);
                return;
            }

            const compareButton =
                event.target.closest(
                    ".product-compare-button"
                );

            if (compareButton) {
                event.preventDefault();
                event.stopPropagation();
                toggleCompare(compareButton.dataset.compareId);
                return;
            }

            const button =
                event.target.closest(
                    ".product-button"
                );


            const card =
                event.target.closest(
                    ".product-card"
                );


            if (!card) {
                return;
            }


            const productId =
                card.dataset.productId;


            if (!productId) {
                return;
            }


            /*
             * Arrow button
             */

            if (button) {

                event.preventDefault();

            }


            openProductDetails(
                productId
            );

        }
    );


    /*
     * Keyboard support
     */

    productsGrid.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {

                return;

            }


            const card =
                event.target.closest(
                    ".product-card"
                );


            if (!card) {
                return;
            }


            event.preventDefault();


            openProductDetails(
                card.dataset.productId
            );

        }
    );

}


/* =====================================================
MODAL EVENTS
===================================================== */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.matches(
                "[data-modal-close]"
            )
        ) {

            closeProductDetails();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }


        const modal =
            document.getElementById(
                "productDetailsModal"
            );


        if (
            modal &&
            !modal.hidden
        ) {

            closeProductDetails();

        }

    }
);

/* =====================================================
PRODUCT VISUAL
===================================================== */

function getProductVisual(categoryId) {

    const path =
        getCategoryPath(categoryId);


    /*
     * LAPTOP
     */

    if (path.includes("لپ تاپ")) {

        return `
            <div class="product-device laptop-product">

                <div class="product-screen"></div>

                <div class="product-base"></div>

            </div>
        `;

    }


    /*
     * MONITOR
     */

    if (path.includes("مانیتور")) {

        return `
            <div class="product-device monitor-product">

                <div class="monitor-screen"></div>

                <div class="monitor-stand"></div>

            </div>
        `;

    }


    /*
     * MOUSE
     */

    if (path.includes("ماوس")) {

        return `
            <div class="product-device mouse-product">

                <div class="mouse-body"></div>

            </div>
        `;

    }


    /*
     * COOL PAD
     */

    if (path.includes("کول پد")) {

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
     * GAME PRODUCTS
     */

    if (
        path.includes("فرمان") ||
        path.includes("دسته بازی")
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
     * GENERIC
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
ACTIVE FILTERS
===================================================== */

function renderActiveFilters() {

    if (!activeFilters) {
        return;
    }


    activeFilters.innerHTML = "";


    if (selectedCategory === null) {
        return;
    }


    const category =
        getCategory(
            selectedCategory
        );


    if (!category) {
        return;
    }


    const chip =
        document.createElement("div");


    chip.className =
        "filter-chip";


    chip.innerHTML = `
        <span>
            ${escapeHtml(
                getCategoryPath(
                    category.id
                )
            )}
        </span>

        <button
            type="button"
            aria-label="حذف فیلتر"
        >
            ×
        </button>
    `;


    const removeButton =
        chip.querySelector("button");


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            () => {

                selectedCategory = null;

                renderCategories();
                renderProducts();

            }
        );

    }


    activeFilters.appendChild(
        chip
    );

}


/* =====================================================
URL CATEGORY
===================================================== */

function readUrlCategory() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const categoryParam =
        params.get("category");


    if (!categoryParam) {
        return;
    }


    const categoryId =
        Number(categoryParam);


    if (
        Number.isInteger(categoryId) &&
        getCategory(categoryId)
    ) {

        selectedCategory =
            categoryId;

    }

}


/* =====================================================
SEARCH NORMALIZATION
===================================================== */

function normalizeSearch(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ى/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/ة/g, "ه")
        .replace(/\s+/g, " ");

}


/* =====================================================
NUMBER HELPERS
===================================================== */

function getNumber(value) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : 0;

}


/* =====================================================
PERSIAN NUMBER
===================================================== */

function formatPersianNumber(value) {

    const number =
        getNumber(value);


    return number.toLocaleString(
        "fa-IR"
    );

}


/* =====================================================
MONEY
===================================================== */

function formatMoney(value) {

    const number =
        getNumber(value);


    return number.toLocaleString(
        "fa-IR"
    );

}


/* =====================================================
HTML ESCAPE
===================================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/* =====================================================
PRODUCT IMAGE FORMAT FALLBACK
===================================================== */

document.addEventListener(
    "error",
    function (event) {

        const image =
            event.target;


        /*
         * Only handle our product images.
         */

        if (
            !image ||
            !image.classList ||
            !image.classList.contains(
                "product-real-image"
            )
        ) {

            return;

        }


        const base =
            image.dataset.imageBase;


        if (!base) {
            return;
        }


        /*
         * Keep track of which formats
         * have already been tried.
         */

        const tried =
            image.dataset.tried
                ? image.dataset.tried.split(",")
                : [];


        const formats = [
            "webp",
            "jpg",
            "jpeg",
            "png"
        ];


        const next =
            formats.find(
                format =>
                    !tried.includes(format)
            );


        /*
         * No image found.
         *
         * Replace ONLY this image
         * with the fallback visual.
         */

        if (!next) {

            const wrapper =
                image.parentElement;


            if (wrapper) {

                const productCard =
                    wrapper.closest(
                        ".product-card"
                    );


                if (productCard) {

                    /*
                     * Get the category from
                     * the product currently
                     * represented by this card.
                     */

                    const productId =
                        productCard.dataset.productId;


                    const product =
                        products.find(
                            item =>
                                String(item.id) ===
                                String(productId)
                        );


                    if (product) {

                        wrapper.innerHTML =
                            getProductVisual(
                                product.category_id
                            );

                    }

                }

            }


            return;

        }


        tried.push(next);


        image.dataset.tried =
            tried.join(",");


        image.src =
            `${base}.${next}`;

    },
    true
);


/* =====================================================
LAPTOP FINDER
===================================================== */

function isLaptopProduct(product) {
    return [1, 3, 4, 5, 6, 7, 8].includes(Number(product?.category_id));
}

function finderSpec(product) {
    const value = laptopFinderSpecs[String(product.id)];
    return value && typeof value === "object" ? value : {};
}

function finderText(value) {
    return String(value ?? "").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک");
}

function finderRam(product) {
    const spec = finderSpec(product);
    const direct = Number(spec.memory?.capacity_gb);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const name = finderText(product.name);
    const matches = [...name.matchAll(/(?:\/|\s)(4|8|12|16|24|32|64)(?:\s*\(d[45]\))?(?=\/)/gi)];
    return matches.length ? Number(matches[0][1]) : 0;
}

function finderStorage(product) {
    const spec = finderSpec(product);
    const direct = Number(spec.storage?.capacity_gb);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const matches = [...finderText(product.name).matchAll(/(?:\/|\s)(128|256|512|1024|2048)(?:\s|\/|$)/gi)];
    return matches.length ? Number(matches[matches.length - 1][1]) : 0;
}

function finderCpu(product) {
    const spec = finderSpec(product);
    const text = `${finderText(product.name)} ${finderText(spec.processor?.model)} ${finderText(spec.processor?.family)}`;
    if (/ryzen\s*7|\bi7\b/.test(text)) return 4;
    if (/ryzen\s*5|\bi5\b/.test(text)) return 3;
    if (/ryzen\s*3|\bi3\b/.test(text)) return 2;
    if (/athlon|n4500|celeron|pentium/.test(text)) return 1;
    return 0;
}

function parseVramGb(spec) {
    const gb = Number(spec?.graphics?.vram_gb);
    if (Number.isFinite(gb) && gb >= 0) {
        return gb;
    }

    const mb = Number(spec?.graphics?.vram_mb);
    if (Number.isFinite(mb) && mb >= 0) {
        return mb / 1024;
    }

    return 0;
}

function finderGpuInfo(product) {
    const spec = finderSpec(product);
    const graphics = spec.graphics || {};
    const model = finderText(graphics.model);
    const fullText = `${finderText(product.name)} ${model}`;
    const declaredType = finderText(graphics.type);
    const vramGb = parseVramGb(spec);

    const dedicatedPattern = /(rtx\s*(?:20|30|40|50)\d{2})|(gtx\s*(?:16|10)\d{2})|(mx\s*\d{3,4})|(rx\s*\d{3,4}[a-z]*)|(arc\s*[a-z]\s*\d{2,3})|(radeon\s*(?:rx|pro)\b)|(3050\b|3060\b|3070\b|3080\b|4050\b|4060\b|4070\b|4080\b|4090\b)/i;
    const integratedPattern = /(integrated|یکپارچه|uhd\s*graphics|iris\s*(?:xe)?|vega\s*graphics|radeon\s*graphics|radeon\s*(?:610m|660m|680m|740m|760m|780m|880m|890m))/i;

    let kind = "unknown";

    if (declaredType === "dedicated" || declaredType === "مجزا") {
        kind = "dedicated";
    } else if (declaredType === "integrated" || declaredType === "یکپارچه") {
        kind = "integrated";
    } else if (declaredType === "hybrid" || declaredType === "یکپارچه + مجزا") {
        kind = dedicatedPattern.test(fullText) ? "dedicated" : "integrated";
    } else if (dedicatedPattern.test(fullText)) {
        kind = "dedicated";
    } else if (integratedPattern.test(fullText)) {
        kind = "integrated";
    }

    return {
        kind,
        model: fullText,
        vramGb,
        modelKnown: dedicatedPattern.test(fullText)
    };
}

function finderGpu(product) {
    const info = finderGpuInfo(product);
    const text = info.model;

    // Dedicated GPUs — model-specific ranking.
    if (/rtx\s*4090/.test(text)) return 10;
    if (/rtx\s*4080/.test(text)) return 9.5;
    if (/rtx\s*4070/.test(text)) return 9;
    if (/rtx\s*4060/.test(text)) return 8;
    if (/rtx\s*4050/.test(text)) return 7;
    if (/rtx\s*30|3050|3060|3070|3080/.test(text)) return 6;
    if (/gtx\s*1660|gtx\s*1650/.test(text)) return 5;
    if (/mx\s*550|mx\s*450/.test(text)) return 4;
    if (info.kind === "dedicated" && info.vramGb >= 4) return 4.5;
    if (info.kind === "dedicated" && info.vramGb >= 2) return 3.5;

    // Integrated graphics are never treated as gaming-class.
    if (info.kind === "integrated") return 1;

    return 0;
}

function isGamingReady(product) {
    const info = finderGpuInfo(product);

    // A laptop with integrated/unknown graphics must never be recommended
    // as a gaming laptop. A declared or recognized dedicated GPU qualifies.
    if (info.kind !== "dedicated") {
        return false;
    }

    // When VRAM is explicitly recorded, reject sub-2GB dedicated graphics too.
    if (info.vramGb > 0 && info.vramGb < 2) {
        return false;
    }

    return info.modelKnown || info.vramGb >= 2;
}

function finderPerformance(product) {
    return finderCpu(product) * 3 + finderGpu(product) * 3 + Math.min(finderRam(product), 32) / 4 + (finderStorage(product) >= 512 ? 2 : 0);
}

function finderBudget(product, budget) {
    if (budget === "any") return 0;
    const price = getNumber(product.sale_price) / 10;
    const ranges = {
        under100: [0, 1000000000],
        "100to130": [1000000000, 1300000000],
        "130to160": [1300000000, 1600000000],
        over160: [1600000000, Infinity]
    };
    const range = ranges[budget];
    if (!range) return 0;
    if (price >= range[0] && price < range[1]) return 40;
    const distance = price < range[0] ? range[0] - price : price - range[1];
    return Math.max(-20, 12 - distance / 10000000);
}

function finderUse(product, use) {
    const cpu = finderCpu(product);
    const gpu = finderGpu(product);
    const ram = finderRam(product);
    const storage = finderStorage(product);
    const price = getNumber(product.sale_price);

    if (use === "gaming") return isGamingReady(product) ? gpu * 12 + cpu * 4 + Math.min(ram, 32) / 2 : -1000;
    if (use === "design") return gpu * 6 + cpu * 3 + Math.min(ram, 32) / 2;
    if (use === "programming") return cpu * 5 + Math.min(ram, 32) / 2 + (storage >= 512 ? 3 : 1);
    if (use === "student") return Math.max(0, 7 - price / 300000000) + Math.min(ram, 16) / 3 + (storage >= 512 ? 2 : 0);
    return Math.max(0, 7 - price / 300000000) + Math.min(ram, 16) / 4 + (storage >= 512 ? 2 : 0);
}

function finderPriority(product, priority) {
    const cpu = finderCpu(product);
    const gpu = finderGpu(product);
    const ram = finderRam(product);
    const storage = finderStorage(product);
    if (priority === "value") return finderPerformance(product) * 8 + Math.max(0, 18 - getNumber(product.sale_price) / 100000000);
    if (priority === "memory") return ram * 2 + Math.min(storage, 1024) / 128;
    if (priority === "graphics") return gpu * 9 + cpu;
    return cpu * 4 + gpu * 4 + Math.min(ram, 32) / 2;
}

function finderReason(product, answers) {
    const parts = [];
    const cpu = finderCpu(product);
    const gpu = finderGpu(product);
    const ram = finderRam(product);
    const storage = finderStorage(product);

    if ((answers.use === "gaming" || answers.use === "design") && gpu >= 5) parts.push("گرافیک مجزا و قدرتمندتر");
    if ((answers.use === "programming" || answers.priority === "performance") && cpu >= 3) parts.push("پردازنده مناسب");
    if (answers.priority === "memory" && ram) parts.push(`${formatPersianNumber(ram)} گیگ رم`);
    if (storage >= 512) parts.push("حافظه ۵۱۲ گیگ یا بیشتر");
    return (parts.length ? parts : ["تناسب مناسب با انتخاب‌های شما"]).slice(0, 2).join(" • ");
}

function bindFinderImageFallbacks() {
    document.querySelectorAll(".finder-result-real-image").forEach(image => {
        if (image.dataset.fallbackBound === "1") return;
        image.dataset.fallbackBound = "1";
        image.addEventListener("error", () => {
            const base = image.dataset.imageBase;
            const tried = image.dataset.tried ? image.dataset.tried.split(",") : [];
            const formats = ["webp", "jpg", "jpeg", "png"];
            const next = formats.find(format => !tried.includes(format));
            if (next) {
                tried.push(next);
                image.dataset.tried = tried.join(",");
                image.src = `${base}.${next}`;
                return;
            }
            image.style.display = "none";
        });
    });
}

function renderFinderResults(results, answers) {
    if (!laptopFinderResults) return;

    if (!results.length) {
        laptopFinderResults.innerHTML = `<div class="finder-empty">در حال حاضر لپ‌تاپی مطابق انتخاب‌های شما پیدا نشد.</div>`;
        laptopFinderResults.hidden = false;
        return;
    }

    laptopFinderResults.innerHTML = `
        <div class="finder-results-head">
            <h3>پیشنهادهای مناسب شما</h3>
            <p>نتایج بر اساس کاربری، بودجه، اولویت و اطلاعات فعلی محصولات رتبه‌بندی شده‌اند.</p>
        </div>
        ${results.map((item, index) => {
            const product = item.product;
            const code = String(product.code || "").trim();
            const base = code ? `images/products/${encodeURIComponent(code)}` : "";
            const ram = finderRam(product);
            const storage = finderStorage(product);
            const meta = [];
            if (ram) meta.push(`${formatPersianNumber(ram)}GB RAM`);
            if (storage) meta.push(`${formatPersianNumber(storage)}GB SSD`);
            if (isGamingReady(product)) meta.push("گرافیک مجزا");
            else if (answers.use === "gaming") meta.push("مناسب گیمینگ");

            return `
                <article class="finder-result-card">
                    <div class="finder-result-image">
                        ${base ? `<img class="finder-result-real-image" src="${base}.webp" data-image-base="${base}" data-tried="webp" alt="${escapeHtml(product.name || "لپ‌تاپ")}" loading="lazy">` : `<span>U</span>`}
                    </div>
                    <div class="finder-result-info">
                        <h4>${index === 0 ? "⭐ بهترین پیشنهاد — " : ""}${escapeHtml(product.name || "محصول")}</h4>
                        <div class="finder-result-meta">${meta.map(v => `<span>${escapeHtml(v)}</span>`).join("")}</div>
                        <div class="finder-result-reason">${escapeHtml(finderReason(product, answers))}</div>
                        <button type="button" class="finder-result-link" data-finder-product-id="${escapeHtml(product.id)}">مشاهده محصول</button>
                    </div>
                    <div class="finder-result-price">${formatPersianNumber(getNumber(product.sale_price) / 10)} تومان</div>
                </article>
            `;
        }).join("")}
    `;
    laptopFinderResults.hidden = false;
    bindFinderImageFallbacks();
}

function runLaptopFinder() {
    if (!laptopFinderForm) return;
    const data = new FormData(laptopFinderForm);
    const answers = {
        use: data.get("finder-use"),
        budget: data.get("finder-budget"),
        priority: data.get("finder-priority")
    };

    const laptopProducts = products
        .filter(isLaptopProduct)
        .filter(product => answers.use === "gaming" ? isGamingReady(product) : true);

    const results = laptopProducts
        .map(product => ({
            product,
            score:
                finderUse(product, answers.use) * 5 +
                finderBudget(product, answers.budget) +
                finderPriority(product, answers.priority) * 2 +
                (getNumber(product.qty) > 0 ? 12 : -4)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    renderFinderResults(results, answers);
}

function openLaptopFinder() {
    if (!laptopFinderModal) return;
    laptopFinderModal.hidden = false;
    document.body.classList.add("modal-open");
    if (laptopFinderResults) {
        laptopFinderResults.hidden = true;
        laptopFinderResults.innerHTML = "";
    }
}

function closeLaptopFinder() {
    if (!laptopFinderModal) return;
    laptopFinderModal.hidden = true;
    document.body.classList.remove("modal-open");
}

/* =====================================================
EVENTS
===================================================== */

if (productSearch) {

    productSearch.addEventListener(
        "input",
        renderProducts
    );

}


if (sortProducts) {

    sortProducts.addEventListener(
        "change",
        renderProducts
    );

}


if (clearCategory) {

    clearCategory.addEventListener(
        "click",
        () => {

            selectedCategory = null;

            renderCategories();
            renderProducts();

        }
    );

}


if (resetFilters) {

    resetFilters.addEventListener(
        "click",
        () => {

            selectedCategory = null;


            if (productSearch) {

                productSearch.value = "";

            }


            if (sortProducts) {

                sortProducts.value =
                    "default";

            }


            renderCategories();
            renderProducts();

        }
    );

}


/* =====================================================
LAPTOP FINDER EVENTS
===================================================== */

if (laptopFinderButton) {
    laptopFinderButton.addEventListener("click", openLaptopFinder);
}

if (laptopFinderForm) {
    laptopFinderForm.addEventListener("submit", event => {
        event.preventDefault();
        runLaptopFinder();
    });
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-finder-close]")) {
        closeLaptopFinder();
        return;
    }

    const finderProductButton = event.target.closest("[data-finder-product-id]");

    if (finderProductButton) {
        const productId = finderProductButton.dataset.finderProductId;
        closeLaptopFinder();
        openProductDetails(productId);
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && laptopFinderModal && !laptopFinderModal.hidden) {
        closeLaptopFinder();
    }
});

/* =====================================================
START
===================================================== */

async function initializeProductsPage() {

    try {

        await loadData();

        readUrlCategory();

        renderCategories();

        renderProducts();

        /* Open smart laptop finder when requested from header */
        const finderParams =
            new URLSearchParams(window.location.search);

        if (finderParams.get("finder") === "1") {

            setTimeout(() => {

                openLaptopFinder();

                window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname
                );

            }, 100);

        }

    }

    catch (error) {

        console.error(
            "Products page initialization failed:",
            error
        );

    }

}


initializeProductsPage();


/* =====================================================
COMPARE BAR
===================================================== */

const compareClearButton = document.getElementById("clearCompare");

if (compareClearButton) {
    compareClearButton.addEventListener("click", clearCompareSelection);
}

updateCompareUI();


/* =====================================================
SEO STRUCTURED DATA
Adds an ItemList from the same product feed used by the catalog.
===================================================== */

function updateProductStructuredData() {
    const existing = document.getElementById("productItemListSchema");
    if (existing) existing.remove();

    const visibleProducts = products.filter(product => Number(product.is_active) === 1);

    const itemListElement = visibleProducts.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": product.name || product.code || `محصول ${index + 1}`,
        "url": `${window.location.origin}/products.html#product-${encodeURIComponent(product.id)}`
    }));

    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "محصولات یونیکس شاپ",
        "url": `${window.location.origin}/products.html`,
        "numberOfItems": itemListElement.length,
        "itemListElement": itemListElement
    };

    const script = document.createElement("script");
    script.id = "productItemListSchema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

