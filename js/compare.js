/* =====================================================
   UNIX SHOP - PRODUCT COMPARISON
   Structured specifications version
===================================================== */

const COMPARE_STORAGE_KEY = "compareProducts";
const MAX_COMPARE = 4;
const SPECS_URL = "data/product-specs.json";

let compareProducts = [];
let compareCategories = [];
let compareSpecs = {};

const compareGrid = document.getElementById("compareGrid");
const compareContent = document.getElementById("compareContent");
const compareLoading = document.getElementById("compareLoading");
const compareEmpty = document.getElementById("compareEmpty");
const compareNeedMore = document.getElementById("compareNeedMore");
const compareSummary = document.getElementById("compareSummary");
const clearCompare = document.getElementById("clearCompare");
const smartCompareAnalysis = document.getElementById("smartCompareAnalysis");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
}

function persianNumber(value) {
    return Number(value).toLocaleString("fa-IR");
}

function formatMoney(value) {
    const number = getNumber(value);
    return number > 0 ? `${number.toLocaleString("fa-IR")} تومان` : "—";
}

function formatBoolean(value) {
    if (value === true || value === 1 || value === "1" || value === "true") return "دارد";
    if (value === false || value === 0 || value === "0" || value === "false") return "ندارد";
    return "—";
}

function formatValue(value, suffix = "") {
    if (!hasValue(value)) return "—";

    if (typeof value === "boolean") return formatBoolean(value);

    if (typeof value === "number") {
        return `${persianNumber(value)}${suffix}`;
    }

    return `${String(value).trim()}${suffix}`;
}

function getCompareIds() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(COMPARE_STORAGE_KEY) || "[]"
        );

        return Array.isArray(stored)
            ? stored.map(String).slice(0, MAX_COMPARE)
            : [];
    } catch (error) {
        console.error("خطا در خواندن مقایسه:", error);
        return [];
    }
}

function saveCompareIds(ids) {
    localStorage.setItem(
        COMPARE_STORAGE_KEY,
        JSON.stringify(ids.map(String))
    );
}

function getCategory(id) {
    return compareCategories.find(
        category => Number(category.id) === Number(id)
    ) || null;
}

function getCategoryPath(categoryId) {
    const path = [];
    let category = getCategory(categoryId);
    const visited = new Set();

    while (category) {
        const id = Number(category.id);

        if (visited.has(id)) break;
        visited.add(id);
        path.unshift(category.name);

        if (category.parent_id === null || category.parent_id === undefined) break;
        category = getCategory(category.parent_id);
    }

    return path.join(" / ");
}

function getImageBase(product) {
    const code = String(product.code || "").trim();
    return code ? `images/products/${encodeURIComponent(code)}` : "";
}

function createImage(product) {
    const base = getImageBase(product);

    if (!base) {
        return `<div class="compare-product-visual"><span>U</span></div>`;
    }

    return `
        <div class="compare-product-image-wrap">
            <img
                class="compare-product-image"
                src="${base}.webp"
                data-image-base="${base}"
                data-tried="webp"
                alt="${escapeHtml(product.name || "محصول")}">
        </div>
    `;
}

function getProductSpecs(product) {
    const data = compareSpecs[String(product.id)];
    return data && typeof data === "object" ? data : null;
}

/*
 * Every field in the structured specification schema is defined here.
 * Empty fields are still rendered as — so the comparison layout is stable
 * and users can immediately see which specifications have not been entered.
 */
const LAPTOP_GROUPS = [
    {
        title: "اطلاعات پایه",
        rows: [
            ["brand", "برند", s => s.basic?.brand],
            ["model", "مدل", s => s.basic?.model]
        ]
    },
    {
        title: "پردازنده",
        rows: [
            ["processor-brand", "سازنده", s => s.processor?.brand],
            ["processor-family", "خانواده", s => s.processor?.family],
            ["processor-model", "مدل دقیق", s => s.processor?.model],
            ["processor-generation", "نسل", s => s.processor?.generation],
            ["processor-cores", "هسته", s => formatValue(s.processor?.cores)],
            ["processor-threads", "رشته", s => formatValue(s.processor?.threads)],
            ["processor-base", "فرکانس پایه", s => formatValue(s.processor?.base_clock)],
            ["processor-boost", "فرکانس بوست", s => formatValue(s.processor?.boost_clock)],
            ["processor-cache", "کش", s => formatValue(s.processor?.cache)],
            ["processor-tdp", "توان مصرفی (TDP)", s => formatValue(s.processor?.tdp)]
        ]
    },
    {
        title: "حافظه رم",
        rows: [
            ["memory-capacity", "ظرفیت رم", s => formatValue(s.memory?.capacity_gb, " گیگابایت")],
            ["memory-type", "نوع رم", s => s.memory?.type],
            ["memory-speed", "سرعت رم", s => formatValue(s.memory?.speed_mhz, " مگاهرتز")],
            ["memory-slots", "تعداد اسلات", s => formatValue(s.memory?.slots)],
            ["memory-max", "حداکثر رم قابل پشتیبانی", s => formatValue(s.memory?.max_capacity_gb, " گیگابایت")],
            ["memory-upgrade", "قابلیت ارتقا", s => formatBoolean(s.memory?.upgradeable)]
        ]
    },
    {
        title: "حافظه ذخیره‌سازی",
        rows: [
            ["storage-capacity", "ظرفیت", s => formatValue(s.storage?.capacity_gb, " گیگابایت")],
            ["storage-type", "نوع حافظه", s => s.storage?.type],
            ["storage-interface", "رابط", s => s.storage?.interface],
            ["storage-slots", "تعداد اسلات", s => formatValue(s.storage?.slots)],
            ["storage-additional", "اسلات اضافی", s => formatBoolean(s.storage?.additional_slot)]
        ]
    },
    {
        title: "گرافیک",
        rows: [
            ["graphics-type", "نوع گرافیک", s => s.graphics?.type],
            ["graphics-model", "مدل گرافیک", s => s.graphics?.model],
            ["graphics-vram", "حافظه گرافیک", s => formatValue(s.graphics?.vram_gb, " گیگابایت")],
            ["graphics-vram-type", "نوع حافظه گرافیک", s => s.graphics?.vram_type],
            ["graphics-tgp", "توان گرافیک (TGP)", s => formatValue(s.graphics?.tgp)]
        ]
    },
    {
        title: "نمایشگر",
        rows: [
            ["display-size", "اندازه", s => formatValue(s.display?.size_inch, " اینچ")],
            ["display-resolution", "رزولوشن", s => s.display?.resolution],
            ["display-panel", "نوع پنل", s => s.display?.panel],
            ["display-refresh", "نرخ نوسازی", s => formatValue(s.display?.refresh_rate_hz, " هرتز")],
            ["display-brightness", "روشنایی", s => formatValue(s.display?.brightness_nits, " نیت")],
            ["display-response", "زمان پاسخ‌گویی", s => formatValue(s.display?.response_time_ms, " میلی‌ثانیه")],
            ["display-color", "محدوده رنگ", s => s.display?.color_gamut],
            ["display-touch", "صفحه لمسی", s => formatBoolean(s.display?.touch)]
        ]
    },
    {
        title: "ارتباطات",
        rows: [
            ["wifi", "Wi-Fi", s => s.connectivity?.wifi],
            ["bluetooth", "Bluetooth", s => s.connectivity?.bluetooth],
            ["ethernet", "Ethernet", s => s.connectivity?.ethernet]
        ]
    },
    {
        title: "درگاه‌ها",
        rows: [
            ["usb-a", "USB-A", s => s.ports?.usb_a],
            ["usb-c", "USB-C", s => s.ports?.usb_c],
            ["thunderbolt", "Thunderbolt", s => s.ports?.thunderbolt],
            ["hdmi", "HDMI", s => s.ports?.hdmi],
            ["displayport", "DisplayPort", s => s.ports?.displayport],
            ["audio", "جک صدا", s => s.ports?.audio],
            ["card-reader", "کارت‌خوان", s => s.ports?.card_reader]
        ]
    },
    {
        title: "مشخصات فیزیکی",
        rows: [
            ["battery", "ظرفیت باتری", s => formatValue(s.physical?.battery_wh, " وات‌ساعت")],
            ["weight", "وزن", s => formatValue(s.physical?.weight_kg, " کیلوگرم")]
        ]
    },
    {
        title: "امکانات",
        rows: [
            ["backlight", "کیبورد با نور پس‌زمینه", s => formatBoolean(s.features?.keyboard_backlight)],
            ["fingerprint", "حسگر اثر انگشت", s => formatBoolean(s.features?.fingerprint)],
            ["webcam", "وب‌کم", s => formatBoolean(s.features?.webcam)]
        ]
    },
    {
        title: "نرم‌افزار",
        rows: [
            ["os", "سیستم‌عامل", s => s.software?.os]
        ]
    }
];

const MOUSE_GROUPS = [
    {
        title: "اطلاعات پایه",
        rows: [
            ["brand", "برند", s => s.basic?.brand],
            ["model", "مدل", s => s.basic?.model],
            ["type", "نوع", s => s.basic?.type],
            ["connection", "نوع اتصال", s => s.connectivity?.connection]
        ]
    },
    {
        title: "مشخصات فنی",
        rows: [
            ["sensor", "نوع سنسور", s => s.sensor?.type],
            ["dpi", "دقت (DPI)", s => formatValue(s.sensor?.dpi)],
            ["polling", "نرخ نمونه‌برداری", s => formatValue(s.sensor?.polling_rate_hz, " هرتز")],
            ["tracking", "نوع ردیابی", s => s.sensor?.tracking],
            ["buttons", "تعداد کلیدها", s => formatValue(s.features?.buttons)],
            ["switch", "نوع سوئیچ", s => s.features?.switch_type]
        ]
    },
    {
        title: "ارتباطات و باتری",
        rows: [
            ["wireless", "بی‌سیم", s => formatBoolean(s.connectivity?.wireless)],
            ["bluetooth", "Bluetooth", s => s.connectivity?.bluetooth],
            ["battery", "ظرفیت باتری", s => formatValue(s.battery?.capacity_mah, " میلی‌آمپر ساعت")],
            ["battery-life", "عمر باتری", s => formatValue(s.battery?.life_hours, " ساعت")],
            ["cable", "طول کابل", s => formatValue(s.connectivity?.cable_length_m, " متر")]
        ]
    },
    {
        title: "امکانات",
        rows: [
            ["rgb", "نورپردازی RGB", s => formatBoolean(s.features?.rgb)],
            ["software", "نرم‌افزار اختصاصی", s => s.features?.software],
            ["ergonomic", "طراحی ارگونومیک", s => formatBoolean(s.features?.ergonomic)],
            ["weight", "وزن", s => formatValue(s.physical?.weight_g, " گرم")]
        ]
    }
];

const GENERIC_GROUPS = [
    {
        title: "اطلاعات پایه",
        rows: [
            ["brand", "برند", s => s.basic?.brand],
            ["model", "مدل", s => s.basic?.model]
        ]
    },
    {
        title: "مشخصات فنی",
        rows: [
            ["type", "نوع محصول", s => s.type],
            ["description", "توضیحات", s => s.basic?.description]
        ]
    }
];

const MONITOR_GROUPS = [
    {
        title: "اطلاعات پایه",
        rows: [
            ["brand", "برند", s => s.basic?.brand],
            ["model", "مدل", s => s.basic?.model],
            ["size", "اندازه", s => formatValue(s.basic?.size_inch, " اینچ")],
            ["resolution", "رزولوشن", s => s.basic?.resolution]
        ]
    },
    {
        title: "تصویر",
        rows: [
            ["panel", "نوع پنل", s => s.image?.panel],
            ["refresh", "نرخ نوسازی", s => formatValue(s.image?.refresh_rate_hz, " هرتز")],
            ["brightness", "روشنایی", s => formatValue(s.image?.brightness_nits, " نیت")],
            ["contrast", "کنتراست", s => s.image?.contrast],
            ["response", "زمان پاسخ‌گویی", s => formatValue(s.image?.response_time_ms, " میلی‌ثانیه")],
            ["gamut", "محدوده رنگ", s => s.image?.color_gamut],
            ["hdr", "HDR", s => formatBoolean(s.image?.hdr)],
            ["adaptive-sync", "Adaptive Sync", s => s.image?.adaptive_sync]
        ]
    },
    {
        title: "درگاه‌ها",
        rows: [
            ["hdmi", "HDMI", s => s.ports?.hdmi],
            ["displayport", "DisplayPort", s => s.ports?.displayport],
            ["vga", "VGA", s => s.ports?.vga],
            ["usb", "USB", s => s.ports?.usb],
            ["audio", "Audio", s => s.ports?.audio]
        ]
    },
    {
        title: "امکانات",
        rows: [
            ["speakers", "بلندگو", s => formatBoolean(s.features?.speakers)],
            ["vesa", "VESA", s => s.features?.vesa],
            ["height", "تنظیم ارتفاع", s => formatBoolean(s.features?.height_adjustment)],
            ["swivel", "چرخش افقی", s => formatBoolean(s.features?.swivel)],
            ["pivot", "چرخش عمودی", s => formatBoolean(s.features?.pivot)],
            ["tilt", "تنظیم زاویه", s => formatBoolean(s.features?.tilt)]
        ]
    }
];

function getComparisonType(product) {
    const spec = getProductSpecs(product);

    if (spec?.type) {
        return spec.type;
    }

    const categoryId = Number(product.category_id);

    // Root categories from data/categories.json.
    if (categoryId === 1 || [3, 4, 5, 6, 7, 8].includes(categoryId)) {
        return "laptop";
    }

    if (categoryId === 20 || [21, 23, 24].includes(categoryId)) {
        return "monitor";
    }

    // Mouse categories: 9 = mouse, 10 = wired, 11 = wireless.
    if ([9, 10, 11].includes(categoryId)) {
        return "mouse";
    }

    return "generic";
}

function getGroupsForProducts(products) {
    const types = new Set(products.map(getComparisonType));

    if (types.size === 1) {
        const type = [...types][0];

        if (type === "monitor") return MONITOR_GROUPS;
        if (type === "laptop") return LAPTOP_GROUPS;
        if (type === "mouse") return MOUSE_GROUPS;
        return GENERIC_GROUPS;
    }

    // This should normally be prevented by the same-category rule on products.html.
    // If an old localStorage selection contains mixed types, use only generic fields
    // instead of incorrectly showing laptop specifications.
    return GENERIC_GROUPS;
}

function buildComparisonGroups(products) {
    const groups = getGroupsForProducts(products);
    const productSpecs = products.map(getProductSpecs);

    return groups.map(group => ({
        title: group.title,
        rows: group.rows.map(([key, label, getter]) => ({
            key,
            label,
            values: productSpecs.map(spec => {
                if (!spec) return "—";
                try {
                    return getter(spec) || "—";
                } catch (error) {
                    return "—";
                }
            })
        }))
    }));
}

function renderProductHeader(product) {
    const stock = getNumber(product.qty) > 0;

    return `
        <article class="compare-product-card">
            <div class="compare-product-remove-wrap">
                <button
                    type="button"
                    class="compare-remove-button"
                    data-remove-id="${escapeHtml(product.id)}"
                    aria-label="حذف ${escapeHtml(product.name || "محصول")} از مقایسه">
                    × حذف
                </button>
            </div>

            ${createImage(product)}

            <div class="compare-product-category">
                ${escapeHtml(getCategoryPath(product.category_id) || "بدون دسته‌بندی")}
            </div>

            <h3 class="compare-product-name">
                ${escapeHtml(product.name || "محصول بدون نام")}
            </h3>

            <div class="compare-product-price">
                ${formatMoney(product.sale_price)}
            </div>

            <div class="compare-product-stock ${stock ? "available" : "unavailable"}">
                <span class="compare-stock-dot"></span>
                ${stock ? "موجود" : "ناموجود"}
            </div>
        </article>
    `;
}


/* =====================================================
   SMART COMPARISON ANALYSIS
===================================================== */

function normalizeCompareText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/‌/g, " ")
        .replace(/,/g, "");
}

function getSpecNumber(specValue) {
    const value = Number(specValue);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function getLaptopCompareProfile(product) {
    const spec = getProductSpecs(product) || {};
    const name = normalizeCompareText(product.name);
    const cpuText = `${name} ${normalizeCompareText(spec.processor?.model)} ${normalizeCompareText(spec.processor?.family)}`;
    const gpuText = `${name} ${normalizeCompareText(spec.graphics?.model)}`;

    let cpuScore = 0;
    if (/ryzen\s*9|core\s*i9|\bi9\b/.test(cpuText)) cpuScore = 10;
    else if (/ryzen\s*7|core\s*i7|\bi7\b/.test(cpuText)) cpuScore = 8;
    else if (/ryzen\s*5|core\s*i5|\bi5\b/.test(cpuText)) cpuScore = 6;
    else if (/ryzen\s*3|core\s*i3|\bi3\b/.test(cpuText)) cpuScore = 4;
    else if (/ultra\s*7/.test(cpuText)) cpuScore = 8;
    else if (/ultra\s*5/.test(cpuText)) cpuScore = 7;
    else if (/athlon|celeron|pentium|n[345]\d{3}/.test(cpuText)) cpuScore = 2;

    const generationMatch = cpuText.match(/(?:ryzen|i[3579]|core\s*i[3579])\s*[- ]?(\d{4,5})/i);
    if (generationMatch) {
        const modelNumber = Number(generationMatch[1]);
        if (Number.isFinite(modelNumber)) {
            if (/ryzen/.test(cpuText)) {
                const generation = Math.floor(modelNumber / 1000);
                cpuScore += Math.min(generation, 8) * 0.25;
            } else {
                const generation = Math.floor(modelNumber / 10000) || Math.floor(modelNumber / 1000);
                cpuScore += Math.min(generation, 14) * 0.15;
            }
        }
    }

    const directRam = getSpecNumber(spec.memory?.capacity_gb);
    let ram = directRam;
    if (!ram) {
        const ramMatches = [...name.matchAll(/(?:\/|\s)(4|8|12|16|24|32|64)(?:\s*\(d[45]\))?(?=\/)/gi)];
        ram = ramMatches.length ? Number(ramMatches[0][1]) : 0;
    }

    const directStorage = getSpecNumber(spec.storage?.capacity_gb);
    let storage = directStorage;
    if (!storage) {
        const storageMatches = [...name.matchAll(/(?:\/|\s)(128|256|512|1024|2048)(?:\s|\/|$)/gi)];
        storage = storageMatches.length ? Number(storageMatches[storageMatches.length - 1][1]) : 0;
    }

    let gpuScore = 0;
    let gpuKnown = false;
    let dedicatedGpu = false;
    let gpuLabel = "";

    if (/rtx\s*50|rtx\s*40|rtx\s*30|gtx\s*16|gtx\s*10|rx\s*7\d{2,3}|rx\s*6\d{2,3}|radeon\s*(?:rx|pro)/.test(gpuText)) {
        dedicatedGpu = true;
        gpuKnown = true;
        if (/rtx\s*50/.test(gpuText)) gpuScore = 10;
        else if (/rtx\s*40/.test(gpuText)) gpuScore = 9;
        else if (/rtx\s*30/.test(gpuText)) gpuScore = 8;
        else if (/gtx\s*16/.test(gpuText)) gpuScore = 6;
        else if (/gtx\s*10/.test(gpuText)) gpuScore = 5;
        else gpuScore = 6;
        gpuLabel = (spec.graphics?.model || product.name || "").trim();
    } else if (/mx\s*\d+/.test(gpuText)) {
        dedicatedGpu = true;
        gpuKnown = true;
        gpuScore = 4;
        gpuLabel = (spec.graphics?.model || "NVIDIA MX").trim();
    } else if (/arc\s*a\d|radeon\s*7m|radeon\s*5m/.test(gpuText)) {
        dedicatedGpu = true;
        gpuKnown = true;
        gpuScore = 4;
        gpuLabel = (spec.graphics?.model || product.name || "").trim();
    } else if (/iris xe|iris|uhd|vega|radeon graphics|integrated|گرافیک آنبرد/.test(gpuText)) {
        gpuKnown = true;
        gpuScore = 2;
        gpuLabel = "گرافیک مجتمع";
    }

    const vramGb = getSpecNumber(spec.graphics?.vram_gb);
    if (dedicatedGpu && vramGb > 0) {
        gpuScore += Math.min(vramGb, 12) * 0.35;
    }

    const size = getSpecNumber(spec.display?.size_inch);
    const refresh = getSpecNumber(spec.display?.refresh_rate_hz);
    const displayScore = Math.min(10, (size ? Math.min(size / 2.0, 4) : 0) + (refresh ? Math.min(refresh / 30, 4) : 0) + (spec.display?.resolution ? 2 : 0));

    const availability = getNumber(product.qty) > 0;
    const price = getNumber(product.sale_price);

    return {
        product,
        cpuScore,
        ram,
        storage,
        gpuScore,
        gpuKnown,
        dedicatedGpu,
        gpuLabel,
        displayScore,
        availability,
        price
    };
}

function compareNormalize(values, value, invert = false) {
    const usable = values.filter(v => Number.isFinite(v) && v > 0);
    if (!usable.length || !Number.isFinite(value) || value <= 0) return 0;
    const min = Math.min(...usable);
    const max = Math.max(...usable);
    if (max === min) return 1;
    const normalized = (value - min) / (max - min);
    return invert ? 1 - normalized : normalized;
}

function getLaptopCompareAnalysis(products) {
    const profiles = products.map(getLaptopCompareProfile);
    const cpuValues = profiles.map(p => p.cpuScore);
    const ramValues = profiles.map(p => p.ram);
    const storageValues = profiles.map(p => p.storage);
    const gpuValues = profiles.map(p => p.gpuScore);
    const displayValues = profiles.map(p => p.displayScore);
    const priceValues = profiles.map(p => p.price);

    profiles.forEach(profile => {
        const cpu = compareNormalize(cpuValues, profile.cpuScore);
        const ram = compareNormalize(ramValues, profile.ram);
        const storage = compareNormalize(storageValues, profile.storage);
        const gpu = compareNormalize(gpuValues, profile.gpuScore);
        const display = compareNormalize(displayValues, profile.displayScore);
        const price = compareNormalize(priceValues, profile.price, true);
        const performance = cpu * 0.32 + gpu * 0.34 + ram * 0.14 + storage * 0.10 + display * 0.10;
        const value = performance * 0.72 + price * 0.20 + (profile.availability ? 0.08 : 0);
        profile.performance = performance * 100;
        profile.value = value * 100;
        profile.overall = (
            cpu * 0.25 +
            gpu * 0.25 +
            ram * 0.12 +
            storage * 0.10 +
            display * 0.08 +
            price * 0.10 +
            (profile.availability ? 0.10 : 0)
        ) * 100;
    });

    const bestOverall = [...profiles].sort((a, b) => b.overall - a.overall)[0];
    const bestValue = [...profiles].sort((a, b) => b.value - a.value)[0];
    const bestCpu = [...profiles].sort((a, b) => b.cpuScore - a.cpuScore)[0];
    const gpuCandidates = profiles.filter(p => p.gpuKnown && p.dedicatedGpu);
    const bestGpu = gpuCandidates.length ? [...gpuCandidates].sort((a, b) => b.gpuScore - a.gpuScore)[0] : null;
    const bestMemory = [...profiles].sort((a, b) => (b.ram * 100000 + b.storage) - (a.ram * 100000 + a.storage))[0];

    return { profiles, bestOverall, bestValue, bestCpu, bestGpu, bestMemory };
}

function laptopCompareReason(profile, bestOverall) {
    const parts = [];
    if (profile === bestOverall) parts.push("متعادل‌ترین انتخاب بین گزینه‌های فعلی");
    if (profile.dedicatedGpu) parts.push("گرافیک مجزا");
    if (profile.cpuScore >= 8) parts.push("پردازنده رده‌بالا");
    else if (profile.cpuScore >= 6) parts.push("پردازنده مناسب");
    if (profile.ram >= 16) parts.push(`${persianNumber(profile.ram)} گیگ رم`);
    if (profile.storage >= 512) parts.push(`${persianNumber(profile.storage)} گیگ حافظه`);
    if (profile.availability) parts.push("موجود");
    return parts.slice(0, 3).join(" • ") || "بر اساس اطلاعات ثبت‌شده در فروشگاه";
}

function renderSmartCompareAnalysis(products) {
    if (!smartCompareAnalysis) return;

    const type = getComparisonType(products[0]);
    if (type !== "laptop" || products.length < 2) {
        smartCompareAnalysis.hidden = true;
        smartCompareAnalysis.innerHTML = "";
        return;
    }

    const analysis = getLaptopCompareAnalysis(products);
    const { bestOverall, bestValue, bestCpu, bestGpu, bestMemory, profiles } = analysis;

    const unique = value => !profiles.some(p => p.product.id !== value.product.id && p.product.id === value.product.id);

    const awardCards = [
        {
            icon: "🏆",
            title: "بهترین انتخاب کلی",
            profile: bestOverall,
            text: laptopCompareReason(bestOverall, bestOverall)
        },
        {
            icon: "💰",
            title: "بهترین ارزش خرید",
            profile: bestValue,
            text: "تعادل بهتر بین کارایی، قیمت و موجودی"
        },
        {
            icon: "🚀",
            title: "قوی‌ترین پردازنده",
            profile: bestCpu,
            text: "بر اساس مدل پردازنده ثبت‌شده"
        },
        bestGpu ? {
            icon: "🎮",
            title: "قوی‌ترین گرافیک",
            profile: bestGpu,
            text: bestGpu.gpuLabel || "گرافیک مجزا"
        } : {
            icon: "💾",
            title: "بهترین حافظه",
            profile: bestMemory,
            text: `${bestMemory.ram ? persianNumber(bestMemory.ram) + " گیگ رم" : "رم نامشخص"}${bestMemory.storage ? " • " + persianNumber(bestMemory.storage) + " گیگ ذخیره‌سازی" : ""}`
        }
    ];

    let conclusion = `بر اساس اطلاعات ثبت‌شده، «${bestOverall.product.name || "این محصول"}» متعادل‌ترین انتخاب در این مقایسه است.`;
    if (bestValue.product.id !== bestOverall.product.id) {
        conclusion += ` برای صرفه‌جویی بیشتر، «${bestValue.product.name || "محصول دوم"}» ارزش خرید بهتری دارد.`;
    }

    smartCompareAnalysis.innerHTML = `
        <div class="smart-compare-head">
            <div>
                <span class="smart-compare-eyebrow">تحلیل یونیکس شاپ</span>
                <h2>🏆 تحلیل هوشمند مقایسه</h2>
                <p>بر اساس قیمت، کارایی پردازنده و گرافیک، رم، حافظه، نمایشگر و موجودی همین محصولات.</p>
            </div>
        </div>

        <div class="smart-compare-awards">
            ${awardCards.map(card => `
                <article class="smart-compare-award">
                    <div class="smart-award-icon">${card.icon}</div>
                    <div class="smart-award-content">
                        <span class="smart-award-title">${escapeHtml(card.title)}</span>
                        <strong>${escapeHtml(card.profile.product.name || "محصول")}</strong>
                        <small>${escapeHtml(card.text)}</small>
                    </div>
                </article>
            `).join("")}
        </div>

        <div class="smart-compare-conclusion">
            <span class="smart-conclusion-icon">💡</span>
            <p>${escapeHtml(conclusion)}</p>
        </div>
    `;

    smartCompareAnalysis.hidden = false;
}

function renderComparison(products) {
    renderSmartCompareAnalysis(products);
    const groups = buildComparisonGroups(products);
    const columnCount = products.length;
    const gridTemplate = `170px repeat(${columnCount}, minmax(210px, 1fr))`;

    const groupsHtml = groups.map(group => `
        <section class="compare-spec-group">
            <div class="compare-group-title">${escapeHtml(group.title)}</div>
            ${group.rows.map(row => `
                <div class="compare-row">
                    <div class="compare-label">${escapeHtml(row.label)}</div>
                    ${row.values.map(value => `
                        <div class="compare-value">${escapeHtml(value)}</div>
                    `).join("")}
                </div>
            `).join("")}
        </section>
    `).join("");

    compareGrid.innerHTML = `
        <div class="compare-products-row" style="grid-template-columns:${gridTemplate}">
            <div class="compare-label-spacer"></div>
            ${products.map(renderProductHeader).join("")}
        </div>

        <div class="compare-table">
            ${groupsHtml}

            <section class="compare-spec-group compare-source-group">
                <div class="compare-group-title">منبع مشخصات</div>
                <div class="compare-row">
                    <div class="compare-label">منبع</div>
                    ${products.map(product => {
                        const spec = getProductSpecs(product);
                        const url = spec?.source?.url || "";
                        if (!url) return `<div class="compare-value">—</div>`;
                        const safeUrl = escapeHtml(url);
                        return `<div class="compare-value"><a class="compare-source-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">مشاهده منبع</a></div>`;
                    }).join("")}
                </div>
                <div class="compare-row">
                    <div class="compare-label">یادداشت</div>
                    ${products.map(product => {
                        const spec = getProductSpecs(product);
                        return `<div class="compare-value">${escapeHtml(spec?.source?.notes || "—")}</div>`;
                    }).join("")}
                </div>
            </section>
        </div>
    `;

    compareGrid.querySelectorAll(".compare-products-row, .compare-row").forEach(row => {
        if (row.classList.contains("compare-row")) {
            row.style.gridTemplateColumns = gridTemplate;
        }
    });

    bindImageFallbacks();
}

function bindImageFallbacks() {
    document.querySelectorAll(".compare-product-image").forEach(image => {
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

            const wrapper = image.closest(".compare-product-image-wrap");
            if (wrapper) {
                wrapper.innerHTML = `<div class="compare-product-visual"><span>U</span></div>`;
            }
        });
    });
}

function removeProduct(id) {
    const ids = getCompareIds().filter(item => String(item) !== String(id));
    saveCompareIds(ids);
    initializeCompare();
}

function clearAllCompare() {
    localStorage.removeItem(COMPARE_STORAGE_KEY);
    initializeCompare();
}

async function loadJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
}

async function loadCompareData() {
    const [productsData, categoriesData, specsData] = await Promise.all([
        loadJson("data/availability.json"),
        loadJson("data/categories.json"),
        loadJson(SPECS_URL).catch(error => {
            console.warn("product-specs.json در دسترس نیست:", error);
            return { products: {} };
        })
    ]);

    if (!Array.isArray(productsData) || !Array.isArray(categoriesData)) {
        throw new Error("ساختار اطلاعات محصولات یا دسته‌بندی‌ها صحیح نیست.");
    }

    const ids = getCompareIds();

    compareProducts = ids
        .map(id => productsData.find(product => String(product.id) === String(id)))
        .filter(product => product && Number(product.is_active) === 1);

    compareCategories = categoriesData.filter(
        category => Number(category.is_active) === 1
    );

    compareSpecs = specsData && typeof specsData.products === "object"
        ? specsData.products
        : {};

    const validIds = compareProducts.map(product => String(product.id));
    if (validIds.length !== ids.length) saveCompareIds(validIds);
}

function showState(state) {
    compareLoading.hidden = state !== "loading";
    compareEmpty.hidden = state !== "empty";
    compareNeedMore.hidden = state !== "need-more";
    compareContent.hidden = state !== "content";
}

function initializeCompare() {
    showState("loading");

    loadCompareData()
        .then(() => {
            const count = compareProducts.length;

            if (!count) {
                compareSummary.textContent = "هنوز محصولی انتخاب نشده است.";
                showState("empty");
                return;
            }

            compareSummary.textContent = `${persianNumber(count)} محصول در مقایسه`;

            if (count < 2) {
                showState("need-more");
                return;
            }

            renderComparison(compareProducts);
            showState("content");
        })
        .catch(error => {
            console.error("Compare page error:", error);
            compareSummary.textContent = "دریافت اطلاعات محصولات با خطا مواجه شد.";
            compareLoading.innerHTML = `
                <div class="compare-state-icon">!</div>
                <h2>خطا در دریافت اطلاعات</h2>
                <p>لطفاً صفحه را دوباره بارگذاری کنید.</p>
                <a href="products.html" class="compare-primary-button">بازگشت به محصولات</a>
            `;
            showState("loading");
        });
}

document.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove-id]");
    if (removeButton) removeProduct(removeButton.dataset.removeId);
});

if (clearCompare) clearCompare.addEventListener("click", clearAllCompare);

initializeCompare();
