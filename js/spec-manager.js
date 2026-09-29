const AVAILABILITY_URL = "data/availability.json";
const CATEGORIES_URL = "data/categories.json";
const SPECS_URL = "data/product-specs.json";
const LOCAL_SPECS_API = "/__spec_manager__/product-specs";
const LOCAL_HEARTBEAT_API = "/__spec_manager__/heartbeat";
let heartbeatTimer = null;

let products = [];
let categories = [];
let specsData = { version: 1, updated_at: null, products: {} };
let selectedProductId = null;

const $ = id => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCategory(id) {
    return categories.find(c => Number(c.id) === Number(id)) || null;
}

function getCategoryPath(id) {
    const path = [];
    let category = getCategory(id);
    const visited = new Set();

    while (category && !visited.has(Number(category.id))) {
        visited.add(Number(category.id));
        path.unshift(category.name);
        if (category.parent_id === null || category.parent_id === undefined) break;
        category = getCategory(category.parent_id);
    }

    return path.join(" / ");
}

function getProductType(product) {
    const path = getCategoryPath(product.category_id);
    if (path.includes("لپ تاپ")) return "laptop";
    if (path.includes("مانیتور")) return "monitor";
    return "other";
}

function textValue(value) {
    return String(value ?? "").trim();
}

function hasValue(value) {
    return value !== null && value !== undefined && textValue(value) !== "";
}

function faNumber(value) {
    return toPersianDigits(String(value));
}

function formatResolution(value) {
    return textValue(value).replace(/\s*[xX*×]\s*/g, "×");
}

function pushPart(parts, label, value, suffix = "") {
    if (hasValue(value)) parts.push(`${label} ${textValue(value)}${suffix}`);
}

function generateSeoContent(product, specs) {
    const type = getProductType(product);
    const fallbackName = textValue(product.name) || textValue(product.code) || "محصول";
    let brand = "", model = "", titleName = fallbackName;
    let meta = "", description = "";

    if (type === "laptop") {
        brand = textValue(specs.basic?.brand);
        model = textValue(specs.basic?.model);
        titleName = [brand, model].filter(Boolean).join(" ") || fallbackName;

        const highlights = [];
        const cpu = [specs.processor?.brand, specs.processor?.model].filter(Boolean).join(" ");
        pushPart(highlights, "پردازنده", cpu);
        if (hasValue(specs.memory?.capacity_gb)) pushPart(highlights, "رم", `${faNumber(specs.memory.capacity_gb)} گیگابایت`);
        if (hasValue(specs.storage?.capacity_gb)) pushPart(highlights, "حافظه", `${faNumber(specs.storage.capacity_gb)} گیگابایت ${textValue(specs.storage.type)}`.trim());
        if (hasValue(specs.display?.size_inch)) pushPart(highlights, "نمایشگر", `${faNumber(specs.display.size_inch)} اینچ`);
        if (hasValue(specs.display?.resolution)) pushPart(highlights, "رزولوشن", formatResolution(specs.display.resolution));
        if (hasValue(specs.display?.panel)) pushPart(highlights, "پنل", specs.display.panel);
        if (hasValue(specs.display?.refresh_rate_hz)) pushPart(highlights, "نرخ نوسازی", `${faNumber(specs.display.refresh_rate_hz)} هرتز`);
        if (hasValue(specs.graphics?.model)) pushPart(highlights, "گرافیک", specs.graphics.model);
        if (hasValue(specs.physical?.weight_kg)) pushPart(highlights, "وزن", `${faNumber(specs.physical.weight_kg)} کیلوگرم`);

        const keySentence = highlights.slice(0, 7).join("، ");
        meta = `${titleName}؛ ${keySentence || "مشخصات فنی و اطلاعات محصول"}. مشاهده مشخصات، قیمت و وضعیت موجودی در یونیکس شاپ.`;
        description = `${titleName} یکی از محصولات یونیکس شاپ است. ${keySentence ? `این مدل با ${keySentence} ارائه می‌شود. ` : "مشخصات فنی این محصول در صفحه ثبت شده است. "}برای بررسی جزئیات، قیمت و وضعیت موجودی این محصول، مشخصات فنی آن را مشاهده کنید.`;
    } else if (type === "monitor") {
        brand = textValue(specs.basic?.brand);
        model = textValue(specs.basic?.model);
        titleName = [brand, model].filter(Boolean).join(" ") || fallbackName;

        const highlights = [];
        if (hasValue(specs.basic?.size_inch)) pushPart(highlights, "اندازه", `${faNumber(specs.basic.size_inch)} اینچ`);
        if (hasValue(specs.basic?.resolution)) pushPart(highlights, "رزولوشن", formatResolution(specs.basic.resolution));
        if (hasValue(specs.image?.panel)) pushPart(highlights, "پنل", specs.image.panel);
        if (hasValue(specs.image?.refresh_rate_hz)) pushPart(highlights, "نرخ نوسازی", `${faNumber(specs.image.refresh_rate_hz)} هرتز`);
        if (hasValue(specs.image?.brightness_nits)) pushPart(highlights, "روشنایی", `${faNumber(specs.image.brightness_nits)} نیت`);
        if (hasValue(specs.image?.response_time_ms)) pushPart(highlights, "زمان پاسخ", `${faNumber(specs.image.response_time_ms)} میلی‌ثانیه`);
        if (hasValue(specs.image?.adaptive_sync)) pushPart(highlights, "Adaptive Sync", specs.image.adaptive_sync);
        if (hasValue(specs.image?.hdr)) pushPart(highlights, "HDR", specs.image.hdr);

        const keySentence = highlights.slice(0, 7).join("، ");
        meta = `${titleName}؛ ${keySentence || "مشخصات فنی و اطلاعات محصول"}. مشاهده مشخصات، قیمت و وضعیت موجودی در یونیکس شاپ.`;
        description = `${titleName} در یونیکس شاپ با مشخصات فنی ثبت‌شده ارائه می‌شود. ${keySentence ? `این مانیتور دارای ${keySentence} است. ` : "جزئیات فنی محصول در صفحه درج شده است. "}مشخصات کامل، قیمت و وضعیت موجودی را مشاهده کنید.`;
    } else {
        titleName = fallbackName;
        const category = getCategoryPath(product.category_id).split(" / ").filter(Boolean).pop() || "محصول";
        meta = `${titleName}؛ مشاهده مشخصات، قیمت و وضعیت موجودی ${category} در یونیکس شاپ.`;
        description = `${titleName}؛ مشاهده اطلاعات و مشخصات محصول، قیمت و وضعیت موجودی در یونیکس شاپ.`;
    }

    const seoTitle = `${titleName} | یونیکس شاپ`;
    return {
        title: seoTitle.slice(0, 70),
        description: meta.slice(0, 180),
        productDescription: description.slice(0, 900)
    };
}

function fillSeoForm(product, specs) {
    const existing = specs.seo && typeof specs.seo === "object" ? specs.seo : {};

    // Generate from the values currently visible in the editor.
    // This is important because the editor is the source of truth after
    // loading older/partial JSON records.
    const type = getProductType(product);
    const liveSpecs = type === "laptop"
        ? collectLaptopSpecs()
        : type === "monitor"
            ? collectMonitorSpecs()
            : specs;

    const generated = generateSeoContent(product, liveSpecs);

    setValue("seo_title", hasValue(existing.title) ? existing.title : generated.title);
    setValue("seo_description", hasValue(existing.description) ? existing.description : generated.description);
    setValue("product_description", hasValue(existing.product_description) ? existing.product_description : generated.productDescription);
    updateSeoCounters();
}

function regenerateSeo() {
    const product = products.find(p => Number(p.id) === Number(selectedProductId));
    if (!product) return;
    const type = getProductType(product);
    const specs = type === "laptop" ? collectLaptopSpecs() : collectMonitorSpecs();
    const generated = generateSeoContent(product, specs);
    setValue("seo_title", generated.title);
    setValue("seo_description", generated.description);
    setValue("product_description", generated.productDescription);
    updateSeoCounters();
    showStatus("توضیحات SEO بر اساس مشخصات فعلی تولید شد. برای ذخیره، دکمه «ذخیره مشخصات» را بزنید.", "info");
}

function updateSeoCounters() {
    const pairs = [
        ["seo_title", "seoTitleCount"],
        ["seo_description", "seoDescriptionCount"],
        ["product_description", "productDescriptionCount"]
    ];
    pairs.forEach(([field, counter]) => {
        const input = document.querySelector(`[name="${field}"]`);
        const target = $(counter);
        if (input && target) target.textContent = faNumber(input.value.length);
    });
}

function blankLaptop() {
    return {
        type: "laptop",
        basic: { brand: "", model: "" },
        processor: { brand: "", model: "", family: "", generation: "", cores: null, threads: null, base_clock: "", boost_clock: "", cache: "", tdp: "" },
        memory: { capacity_gb: null, type: "", speed_mhz: null, slots: null, max_capacity_gb: null, upgradeable: null },
        storage: { capacity_gb: null, type: "", interface: "", slots: null, additional_slot: null },
        graphics: { type: "", model: "", vram_gb: null, vram_mb: null, vram_type: "", tgp: "" },
        display: { size_inch: null, resolution: "", panel: "", refresh_rate_hz: null, brightness_nits: null, response_time_ms: null, color_gamut: "", touch: null },
        connectivity: { wifi: "", bluetooth: "", ethernet: "" },
        ports: { usb_a: "", usb_c: "", thunderbolt: "", hdmi: "", displayport: "", audio: "", card_reader: "" },
        physical: { battery_wh: null, weight_kg: null },
        features: { keyboard_backlight: null, fingerprint: null, webcam: null },
        software: { os: "" },
        source: { url: "", notes: "" }
    };
}

function blankMonitor() {
    return {
        type: "monitor",
        basic: { brand: "", model: "", size_inch: null, resolution: "" },
        image: { panel: "", refresh_rate_hz: null, brightness_nits: null, contrast: "", response_time_ms: null, color_gamut: "", hdr: "", adaptive_sync: "" },
        ports: { hdmi: "", displayport: "", vga: "", usb: "", audio: "" },
        features: { speakers: "", vesa: "", height_adjustment: "", swivel: "", pivot: "", tilt: "" },
        source: { url: "", notes: "" }
    };
}

function blankSpecs(product) {
    const type = getProductType(product);
    return type === "monitor" ? blankMonitor() : blankLaptop();
}

function normalizeSpecs(product, existing) {
    const base = blankSpecs(product);
    if (!existing || typeof existing !== "object") return base;
    return deepMerge(base, existing);
}

function deepMerge(base, source) {
    const result = Array.isArray(base) ? [...base] : { ...base };
    Object.keys(source || {}).forEach(key => {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && result[key] && typeof result[key] === "object") {
            result[key] = deepMerge(result[key], source[key]);
        } else {
            result[key] = source[key];
        }
    });
    return result;
}

async function loadJson(url, fallback) {
    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        if (url === SPECS_URL) return fallback;
        throw error;
    }
}

async function loadSpecsFile() {
    // When running through the included local Python server, read the real
    // data/product-specs.json through its local API. Otherwise fall back to
    // the normal static JSON request (useful on the hosted website).
    try {
        const response = await fetch(LOCAL_SPECS_API, { cache: "no-store" });
        if (response.ok) return await response.json();
    } catch (error) {
        console.info("Local Spec Manager API is not available; using static JSON.", error);
    }

    return loadJson(SPECS_URL, { version: 1, updated_at: null, products: {} });
}

async function writeSpecsFile() {
    specsData.version = 1;
    specsData.updated_at = new Date().toISOString();

    try {
        const response = await fetch(LOCAL_SPECS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(specsData, null, 2)
        });

        if (response.ok) {
            return { saved: true, local: true };
        }

        const message = await response.text().catch(() => "");
        throw new Error(message || `HTTP ${response.status}`);
    } catch (error) {
        console.info("Local write API is not available.", error);

        // Static/hosted fallback: download a backup instead of pretending
        // that the browser can overwrite an arbitrary local file.
        downloadSpecs();
        return { saved: false, local: false };
    }
}


function startLocalServerHeartbeat() {
    // Only the local server responds to this endpoint.
    // Heartbeat keeps the server informed that the page is alive.
    const sendHeartbeat = () => {
        fetch(LOCAL_HEARTBEAT_API, {
            method: "GET",
            cache: "no-store",
            keepalive: true
        }).catch(() => {});
    };

    sendHeartbeat();

    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }

    heartbeatTimer = setInterval(sendHeartbeat, 2000);
}

async function initialize() {
    try {
        const [availability, categoryData, existingSpecs] = await Promise.all([
            loadJson(AVAILABILITY_URL),
            loadJson(CATEGORIES_URL),
            loadSpecsFile()
        ]);

        products = Array.isArray(availability)
            ? availability.filter(p => Number(p.is_active) === 1)
            : [];
        categories = Array.isArray(categoryData)
            ? categoryData.filter(c => Number(c.is_active) === 1)
            : [];

        specsData = existingSpecs && typeof existingSpecs === "object"
            ? existingSpecs
            : { version: 1, updated_at: null, products: {} };

        if (!specsData.products || typeof specsData.products !== "object") {
            specsData.products = {};
        }

        renderProductList();
        $("productSummary").textContent = `${toPersianDigits(products.length)} محصول فعال`;
        showStatus("اطلاعات محصولات آماده است.", "info");
        startLocalServerHeartbeat();
    } catch (error) {
        console.error(error);
        showStatus("بارگذاری اطلاعات با خطا مواجه شد.", "error");
    }
}

function renderProductList() {
    const search = normalizeSearch($("productSearch").value);
    const filtered = products.filter(product => {
        const text = normalizeSearch(`${product.name} ${product.code} ${getCategoryPath(product.category_id)}`);
        return !search || text.includes(search);
    });

    $("productList").innerHTML = filtered.map(product => {
        const type = getProductType(product);
        const saved = Boolean(specsData.products[String(product.id)]);
        return `
            <button type="button" class="product-item ${Number(selectedProductId) === Number(product.id) ? "active" : ""}" data-product-id="${escapeHtml(product.id)}">
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(product.code)} · ${escapeHtml(getCategoryPath(product.category_id))}</span>
                <em>${saved ? "مشخصات ثبت شده" : (type === "other" ? "مشخصات اختصاصی هنوز ساخته نشده" : "نیازمند تکمیل")}</em>
            </button>
        `;
    }).join("");
}

function normalizeSearch(value) {
    return String(value || "")
        .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .toLowerCase()
        .replace(/[\u200c\u200f\u200e]/g, "")
        .trim();
}

function toPersianDigits(value) {
    return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function selectProduct(id) {
    selectedProductId = Number(id);
    const product = products.find(p => Number(p.id) === selectedProductId);
    if (!product) return;

    const type = getProductType(product);
    const specs = normalizeSpecs(product, specsData.products[String(product.id)]);

    $("emptyEditor").classList.add("hidden");
    $("specForm").classList.remove("hidden");
    $("editorProductName").textContent = product.name;
    $("editorProductCode").textContent = product.code;
    $("editorCategory").textContent = getCategoryPath(product.category_id);

    $("laptopFields").classList.toggle("hidden", type !== "laptop");
    $("monitorFields").classList.toggle("hidden", type !== "monitor");

    if (type === "laptop") fillLaptopForm(specs);
    if (type === "monitor") fillMonitorForm(specs);
    fillCommonForm(specs);
    fillSeoForm(product, specs);

    renderProductList();
}

function setValue(name, value) {
    const element = document.querySelector(`[name="${name}"]`);
    if (!element) return;
    if (element.type === "checkbox") element.checked = value === true;
    else element.value = value === null || value === undefined ? "" : value;
}

function fillLaptopForm(s) {
    setValue("brand", s.basic.brand); setValue("model", s.basic.model);
    setValue("cpu_brand", s.processor.brand); setValue("cpu_model", s.processor.model); setValue("cpu_family", s.processor.family); setValue("cpu_generation", s.processor.generation);
    setValue("cpu_cores", s.processor.cores); setValue("cpu_threads", s.processor.threads); setValue("cpu_base_clock", s.processor.base_clock); setValue("cpu_boost_clock", s.processor.boost_clock); setValue("cpu_cache", s.processor.cache); setValue("cpu_tdp", s.processor.tdp);
    setValue("ram_capacity", s.memory.capacity_gb); setValue("ram_type", s.memory.type); setValue("ram_speed", s.memory.speed_mhz); setValue("ram_slots", s.memory.slots); setValue("ram_max", s.memory.max_capacity_gb); setValue("ram_upgradeable", s.memory.upgradeable);
    setValue("storage_capacity", s.storage.capacity_gb); setValue("storage_type", s.storage.type); setValue("storage_interface", s.storage.interface); setValue("storage_slots", s.storage.slots); setValue("storage_additional", s.storage.additional_slot);
    setValue("gpu_type", s.graphics.type);
    setValue("gpu_model", s.graphics.model);
    const storedVramGb = Number(s.graphics.vram_gb);
    const storedVramMb = Number(s.graphics.vram_mb);
    if (Number.isFinite(storedVramGb) && storedVramGb >= 0) {
        setValue("gpu_vram", storedVramGb);
        setValue("gpu_vram_unit", "gb");
    } else if (Number.isFinite(storedVramMb) && storedVramMb >= 0) {
        setValue("gpu_vram", storedVramMb);
        setValue("gpu_vram_unit", "mb");
    } else {
        setValue("gpu_vram", "");
        setValue("gpu_vram_unit", "gb");
    }
    setValue("gpu_vram_type", s.graphics.vram_type);
    setValue("gpu_tgp", s.graphics.tgp);
    setValue("display_size", s.display.size_inch); setValue("display_resolution", s.display.resolution); setValue("display_panel", s.display.panel); setValue("display_refresh", s.display.refresh_rate_hz); setValue("display_brightness", s.display.brightness_nits); setValue("display_response", s.display.response_time_ms); setValue("display_gamut", s.display.color_gamut); setValue("display_touch", s.display.touch);
    setValue("wifi", s.connectivity.wifi); setValue("bluetooth", s.connectivity.bluetooth); setValue("ethernet", s.connectivity.ethernet);
    setValue("usb_a", s.ports.usb_a); setValue("usb_c", s.ports.usb_c); setValue("thunderbolt", s.ports.thunderbolt); setValue("hdmi", s.ports.hdmi); setValue("displayport", s.ports.displayport); setValue("audio", s.ports.audio); setValue("card_reader", s.ports.card_reader);
    setValue("battery", s.physical.battery_wh); setValue("weight", s.physical.weight_kg); setValue("os", s.software.os);
    setValue("keyboard_backlight", s.features.keyboard_backlight); setValue("fingerprint", s.features.fingerprint); setValue("webcam", s.features.webcam);
}

function fillMonitorForm(s) {
    setValue("monitor_brand", s.basic.brand); setValue("monitor_model", s.basic.model); setValue("monitor_size", s.basic.size_inch); setValue("monitor_resolution", s.basic.resolution);
    setValue("monitor_panel", s.image.panel); setValue("monitor_refresh", s.image.refresh_rate_hz); setValue("monitor_brightness", s.image.brightness_nits); setValue("monitor_contrast", s.image.contrast); setValue("monitor_response", s.image.response_time_ms); setValue("monitor_gamut", s.image.color_gamut); setValue("monitor_hdr", s.image.hdr); setValue("monitor_sync", s.image.adaptive_sync);
    setValue("monitor_hdmi", s.ports.hdmi); setValue("monitor_displayport", s.ports.displayport); setValue("monitor_vga", s.ports.vga); setValue("monitor_usb", s.ports.usb); setValue("monitor_audio", s.ports.audio);
    setValue("monitor_speakers", s.features.speakers); setValue("monitor_vesa", s.features.vesa); setValue("monitor_height", s.features.height_adjustment); setValue("monitor_swivel", s.features.swivel); setValue("monitor_pivot", s.features.pivot); setValue("monitor_tilt", s.features.tilt);
}

function fillCommonForm(s) {
    setValue("source_url", s.source?.url || "");
    setValue("notes", s.source?.notes || "");
}

function numberOrNull(value) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const normalized = text.replace(/,/g, ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}

function checkboxOrNull(name) {
    const element = document.querySelector(`[name="${name}"]`);
    return element ? element.checked : null;
}

function inputValue(name) {
    const element = document.querySelector(`[name="${name}"]`);
    return element ? String(element.value || "").trim() : "";
}

function collectLaptopSpecs() {
    return {
        type: "laptop",
        basic: { brand: inputValue("brand"), model: inputValue("model") },
        processor: { brand: inputValue("cpu_brand"), model: inputValue("cpu_model"), family: inputValue("cpu_family"), generation: inputValue("cpu_generation"), cores: numberOrNull(inputValue("cpu_cores")), threads: numberOrNull(inputValue("cpu_threads")), base_clock: inputValue("cpu_base_clock"), boost_clock: inputValue("cpu_boost_clock"), cache: inputValue("cpu_cache"), tdp: inputValue("cpu_tdp") },
        memory: { capacity_gb: numberOrNull(inputValue("ram_capacity")), type: inputValue("ram_type"), speed_mhz: numberOrNull(inputValue("ram_speed")), slots: numberOrNull(inputValue("ram_slots")), max_capacity_gb: numberOrNull(inputValue("ram_max")), upgradeable: checkboxOrNull("ram_upgradeable") },
        storage: { capacity_gb: numberOrNull(inputValue("storage_capacity")), type: inputValue("storage_type"), interface: inputValue("storage_interface"), slots: numberOrNull(inputValue("storage_slots")), additional_slot: checkboxOrNull("storage_additional") },
        graphics: (() => {
            const rawVram = numberOrNull(inputValue("gpu_vram"));
            const unit = inputValue("gpu_vram_unit") || "gb";
            const vramGb = rawVram === null ? null : (unit === "mb" ? rawVram / 1024 : rawVram);
            const vramMb = rawVram === null ? null : (unit === "mb" ? rawVram : rawVram * 1024);
            return {
                type: inputValue("gpu_type"),
                model: inputValue("gpu_model"),
                vram_gb: vramGb,
                vram_mb: vramMb,
                vram_type: inputValue("gpu_vram_type"),
                tgp: inputValue("gpu_tgp")
            };
        })(),
        display: { size_inch: numberOrNull(inputValue("display_size")), resolution: inputValue("display_resolution"), panel: inputValue("display_panel"), refresh_rate_hz: numberOrNull(inputValue("display_refresh")), brightness_nits: numberOrNull(inputValue("display_brightness")), response_time_ms: numberOrNull(inputValue("display_response")), color_gamut: inputValue("display_gamut"), touch: checkboxOrNull("display_touch") },
        connectivity: { wifi: inputValue("wifi"), bluetooth: inputValue("bluetooth"), ethernet: inputValue("ethernet") },
        ports: { usb_a: inputValue("usb_a"), usb_c: inputValue("usb_c"), thunderbolt: inputValue("thunderbolt"), hdmi: inputValue("hdmi"), displayport: inputValue("displayport"), audio: inputValue("audio"), card_reader: inputValue("card_reader") },
        physical: { battery_wh: numberOrNull(inputValue("battery")), weight_kg: numberOrNull(inputValue("weight")) },
        features: { keyboard_backlight: checkboxOrNull("keyboard_backlight"), fingerprint: checkboxOrNull("fingerprint"), webcam: checkboxOrNull("webcam") },
        software: { os: inputValue("os") },
        source: { url: inputValue("source_url"), notes: inputValue("notes") }
    };
}

function collectMonitorSpecs() {
    return {
        type: "monitor",
        basic: { brand: inputValue("monitor_brand"), model: inputValue("monitor_model"), size_inch: numberOrNull(inputValue("monitor_size")), resolution: inputValue("monitor_resolution") },
        image: { panel: inputValue("monitor_panel"), refresh_rate_hz: numberOrNull(inputValue("monitor_refresh")), brightness_nits: numberOrNull(inputValue("monitor_brightness")), contrast: inputValue("monitor_contrast"), response_time_ms: numberOrNull(inputValue("monitor_response")), color_gamut: inputValue("monitor_gamut"), hdr: inputValue("monitor_hdr"), adaptive_sync: inputValue("monitor_sync") },
        ports: { hdmi: inputValue("monitor_hdmi"), displayport: inputValue("monitor_displayport"), vga: inputValue("monitor_vga"), usb: inputValue("monitor_usb"), audio: inputValue("monitor_audio") },
        features: { speakers: inputValue("monitor_speakers"), vesa: inputValue("monitor_vesa"), height_adjustment: inputValue("monitor_height"), swivel: inputValue("monitor_swivel"), pivot: inputValue("monitor_pivot"), tilt: inputValue("monitor_tilt") },
        source: { url: inputValue("source_url"), notes: inputValue("notes") }
    };
}

async function saveCurrentProduct() {
    const product = products.find(p => Number(p.id) === Number(selectedProductId));
    if (!product) return;

    const type = getProductType(product);
    if (type === "other") {
        showStatus("برای این دسته فعلاً فرم اختصاصی ساخته نشده است.", "error");
        return;
    }

    const collected = type === "laptop"
        ? collectLaptopSpecs()
        : collectMonitorSpecs();

    collected.seo = {
        title: inputValue("seo_title"),
        description: inputValue("seo_description"),
        product_description: inputValue("product_description")
    };

    specsData.products[String(product.id)] = collected;

    const result = await writeSpecsFile();
    renderProductList();

    if (result.local) {
        showStatus("مشخصات ذخیره شد و فایل data/product-specs.json به‌روزرسانی شد.", "success");
    } else {
        showStatus("ذخیره مستقیم در دسترس نیست؛ فایل JSON به‌عنوان پشتیبان دانلود شد.", "info");
    }
}


async function clearCurrentProduct() {
    const product = products.find(p => Number(p.id) === Number(selectedProductId));
    if (!product) return;

    delete specsData.products[String(product.id)];

    const result = await writeSpecsFile();
    selectProduct(product.id);

    if (result.local) {
        showStatus("مشخصات پاک شد و فایل data/product-specs.json به‌روزرسانی شد.", "success");
    } else {
        showStatus("مشخصات پاک شد؛ فایل JSON به‌عنوان پشتیبان دانلود شد.", "info");
    }
}


function downloadSpecs() {
    specsData.version = 1;
    specsData.updated_at = new Date().toISOString();
    const json = JSON.stringify(specsData, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-specs.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus("فایل product-specs.json ساخته شد.", "success");
}

async function importSpecs(file) {
    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported || typeof imported !== "object" || !imported.products || typeof imported.products !== "object") {
            throw new Error("ساختار فایل صحیح نیست.");
        }

        specsData = imported;
        const result = await writeSpecsFile();

        selectedProductId = null;
        $("specForm").classList.add("hidden");
        $("emptyEditor").classList.remove("hidden");
        renderProductList();

        showStatus(
            result.local
                ? "فایل مشخصات وارد و data/product-specs.json به‌روزرسانی شد."
                : "فایل وارد شد و نسخه جدید JSON دانلود شد.",
            result.local ? "success" : "info"
        );
    } catch (error) {
        console.error(error);
        showStatus("فایل JSON معتبر نیست.", "error");
    }
}


function showStatus(message, type) {
    const box = $("statusMessage");
    box.textContent = message;
    box.className = `status-message ${type}`;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => box.classList.add("hidden"), 7000);
}

$("productSearch").addEventListener("input", renderProductList);
$("productList").addEventListener("click", event => {
    const item = event.target.closest("[data-product-id]");
    if (item) selectProduct(item.dataset.productId);
});

$("specForm").addEventListener("submit", event => {
    event.preventDefault();
    saveCurrentProduct();
});

$("clearProductSpecs").addEventListener("click", clearCurrentProduct);
$("regenerateSeo").addEventListener("click", regenerateSeo);
["seo_title", "seo_description", "product_description"].forEach(name => {
    const element = document.querySelector(`[name="${name}"]`);
    if (element) element.addEventListener("input", updateSeoCounters);
});
$("downloadJson").addEventListener("click", downloadSpecs);
$("importJson").addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) importSpecs(file);
    event.target.value = "";
});

initialize();
