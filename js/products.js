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
        productsResponse,
        categoriesResponse
    ] = await Promise.all([

        fetch("data/products.json", {
            cache: "no-store"
        }),

        fetch("data/categories.json", {
            cache: "no-store"
        })

    ]);


    if (!productsResponse.ok) {

        throw new Error(
            `products.json: HTTP ${productsResponse.status}`
        );

    }


    if (!categoriesResponse.ok) {

        throw new Error(
            `categories.json: HTTP ${categoriesResponse.status}`
        );

    }


    const productsData =
        await productsResponse.json();

    const categoriesData =
        await categoriesResponse.json();


    if (!Array.isArray(productsData)) {

        throw new Error(
            "ساختار products.json باید آرایه باشد."
        );

    }


    if (!Array.isArray(categoriesData)) {

        throw new Error(
            "ساختار categories.json باید آرایه باشد."
        );

    }


    /*
     * Only active products
     */

    products =
        productsData.filter(
            product =>
                Number(product.is_active) === 1
        );


    /*
     * Only active categories
     */

    categories =
        categoriesData.filter(
            category =>
                Number(category.is_active) === 1
        );


    console.log(
        "Unix Shop products loaded:",
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

    if (visited.has(Number(category.id))) {
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


            const barcode =
                normalizeSearch(
                    product.barcode
                );


            const specs =
                normalizeSearch(
                    product.technical_specs
                );


            return (
                name.includes(search) ||
                code.includes(search) ||
                barcode.includes(search) ||
                specs.includes(search)
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
         * Keep JSON order.
         */

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
 * Current JSON stock.
 *
 * Later this can be replaced with
 * real inventory/current_stock.
 */

const stock =
    getNumber(
        product.opening_stock
    );


const hasStock =
    stock > 0;


const visual =
    getProductVisual(
        product.category_id
    );


const description =
    product.technical_specs ||
    product.notes ||
    "محصول با کیفیت از مجموعه یونیکس شاپ";


const stockText =
    hasStock
        ? `
            موجودی:
            ${formatPersianNumber(stock)}
            ${escapeHtml(product.unit || "")}
          `
        : `
            فعلاً ناموجود
          `;


const productName =
    escapeHtml(
        product.name ||
        "محصول بدون نام"
    );


const price =
    formatMoney(
        product.sale_price
    );


return `
    <article
        class="product-card"
        data-product-id="${escapeHtml(product.id)}"
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

            ${visual}

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

                ${escapeHtml(
                    description
                )}

            </p>


            <div class="product-bottom">

                <div class="product-price">

                    <span class="product-price-label">
                        قیمت
                    </span>


                    <strong>
                        ${price}
                    </strong>


                    <small>
                        تومان
                    </small>


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


                <a
                    href="#"
                    class="product-button"
                    aria-label="مشاهده ${productName}"
                    data-product-id="${escapeHtml(product.id)}"
                >
                    ←
                </a>

            </div>

        </div>

    </article>
`;

}

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


} catch (error) {

    console.error(
        "Products page initialization failed:",
        error
    );

}


}

initializeProductsPage();
