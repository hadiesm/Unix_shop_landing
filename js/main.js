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
                        href="products.html"
                        class="product-button"
                        aria-label="مشاهده محصول"
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
