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


/* =====================================================
DATA
===================================================== */

let products = [];
let categories = [];

let selectedCategory = null;


/* =====================================================
LOAD JSON DATA
===================================================== */

async function loadData() {

    try {

        const [
            availabilityResponse,
            categoriesResponse
        ] = await Promise.all([

            fetch("data/availability.json", {
                cache: "no-store"
            }),

            fetch("data/categories.json", {
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
                                    <span class="product-unavailable-price">
                                        فعلاً موجود نیست
                                    </span>
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


                    <button
                        type="button"
                        class="product-button"
                        aria-label="مشاهده مشخصات ${productName}"
                        data-product-id="${escapeHtml(product.id)}"
                    >
                        ←
                    </button>

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
        formatMoney(
            product.sale_price
        );


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

    const specsHtml =
        formatTechnicalSpecs(
            product.technical_specs
        );


    if (specsHtml) {

        specsText.innerHTML =
            specsHtml;

        specsSection.hidden =
            false;

    } else {

        specsText.innerHTML =
            "";

        specsSection.hidden =
            true;

    }


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
START
===================================================== */

async function initializeProductsPage() {

    try {

        await loadData();


        readUrlCategory();


        renderCategories();


        renderProducts();

    }


    catch (error) {

        console.error(
            "Products page initialization failed:",
            error
        );

    }

}


initializeProductsPage();