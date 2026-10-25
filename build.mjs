// AquaVant site builder. No dependencies: `npm run build` (or `node build.mjs`).
// Reads page bodies from src/pages/{en,no}/*.html, wraps them in the shared
// layout (head, header, footer) and writes finished pages to public/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = dirname(fileURLToPath(import.meta.url));
// Cache busting: each asset link carries a short fingerprint of the file, so browsers
// fetch a fresh copy as soon as the file changes (assets are cached for a week).
const fingerprint = (rel) => createHash("sha1").update(readFileSync(join(ROOT, "public", rel))).digest("hex").slice(0, 8);
const V = { css: fingerprint("assets/css/styles.css"), js: fingerprint("assets/js/main.js"), lenis: fingerprint("assets/js/vendor/lenis.min.js") };
const OUT = join(ROOT, "public");
const SITE = "https://aquavant.no";
// Company details and all page text live in content/ (edited in Pages CMS, see .pages.yml).
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const COMPANY = readJson("content/site.json");
const EMAIL = COMPANY.email.trim();
const EMAIL2 = COMPANY.email2.trim();
const ORG_NO = (COMPANY.orgno || "").trim() || "[000 000 000]";
const LINKEDIN = (COMPANY.linkedin || "").trim() || "https://www.linkedin.com/";

const PAGES = ["index", "technology", "services", "about", "contact", "privacy", "404"];

const L = {
  en: {
    htmlLang: "en", ogLocale: "en_GB", dir: "", name: "English",
    skip: "Skip to content", menuOpen: "Open menu", menuClose: "Close menu", navLabel: "Main", menuWord: "Menu",
    menuTagline: "Adjuvants for fish vaccines. Oslo, Norway.",
    nav: { technology: "Technology", services: "Services", about: "About", contact: "Contact" },
    home: "Home", tab: "Talk to us",
    langLabel: "Language",
    footerLine: "Adjuvant technology for fish vaccines. Developed in Oslo for global aquaculture.",
    explore: "Explore", company: "Company", connect: "Connect",
    email: "Email", linkedin: "LinkedIn", privacy: "Privacy policy",
    orgNo: "Org. no.", city: "Oslo, Norway",
    mvLine: "MicroVant™ is a product series of AquaVant AS.",
    rights: "AquaVant AS. All rights reserved.",
    logoAlt: "AquaVant – home", mvAlt: "MicroVant",
  },
  no: {
    htmlLang: "nb", ogLocale: "nb_NO", dir: "no/", name: "Norsk",
    skip: "Gå til innholdet", menuOpen: "Åpne meny", menuClose: "Lukk meny", navLabel: "Hovedmeny", menuWord: "Meny",
    menuTagline: "Adjuvanser til fiskevaksiner. Oslo, Norge.",
    nav: { technology: "Teknologi", services: "Tjenester", about: "Om oss", contact: "Kontakt" },
    home: "Hjem", tab: "Snakk med oss",
    langLabel: "Språk",
    footerLine: "Adjuvansteknologi for fiskevaksiner. Utviklet i Oslo for global havbruksnæring.",
    explore: "Utforsk", company: "Selskap", connect: "Kontakt",
    email: "E-post til", linkedin: "LinkedIn", privacy: "Personvern",
    orgNo: "Org.nr.", city: "Oslo, Norge",
    mvLine: "MicroVant™ er en produktserie fra AquaVant AS.",
    rights: "AquaVant AS. Alle rettigheter forbeholdt.",
    logoAlt: "AquaVant – forsiden", mvAlt: "MicroVant",
  },
};

const NAV_KEYS = ["technology", "services", "about", "contact"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const pageFile = (key) => (key === "index" ? "index.html" : `${key}.html`);
const pageUrl = (lang, key) => `${SITE}/${L[lang].dir}${key === "index" ? "" : `${key}.html`}`;

function parse(src) {
  const m = src.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (m) for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m ? src.slice(m[0].length) : src };
}

function jsonLd(lang, key, meta) {
  const graph = [];
  if (key === "index") {
    graph.push({
      "@type": "Organization", "@id": `${SITE}/#org`, name: "AquaVant AS", url: `${SITE}/`,
      logo: `${SITE}/assets/logo/aquavant-stacked-fullcolor.svg`,
      contactPoint: [EMAIL, EMAIL2].map((e) => ({ "@type": "ContactPoint", contactType: "customer service", email: e, availableLanguage: ["English", "Norwegian"] })),
      address: { "@type": "PostalAddress", addressLocality: "Oslo", addressCountry: "NO" },
      brand: { "@type": "Brand", name: "MicroVant" },
      description: meta.description,
    });
    graph.push({ "@type": "WebSite", "@id": `${SITE}/#web`, url: `${SITE}/`, name: "AquaVant", inLanguage: ["en", "nb"], publisher: { "@id": `${SITE}/#org` } });
  } else if (NAV_KEYS.includes(key)) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: L[lang].home, item: pageUrl(lang, "index") },
        { "@type": "ListItem", position: 2, name: L[lang].nav[key], item: pageUrl(lang, key) },
      ],
    });
  }
  if (!graph.length) return "";
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function layout(lang, key, meta, body) {
  const t = L[lang];
  // Relative paths so pages also open from disk. The 404 page can be served at
  // any depth, so it uses root-absolute paths instead.
  const is404 = key === "404";
  const r = is404 ? "/" : lang === "en" ? "" : "../";
  const link = (k) => (is404 ? "/" : "") + pageFile(k); // pages of one language share a folder
  const otherHref = is404 ? "/no/" : lang === "en" ? `no/${pageFile(key)}` : `../${pageFile(key)}`;
  const noindex = key === "privacy" || key === "404";
  const canonical = pageUrl(lang, key);
  const title = esc(meta.title);
  const desc = esc(meta.description);
  // Menu links: a hidden copy for screen readers, a visible copy split into letters by main.js.
  const menuItem = (href, label, current, i) =>
    `<li style="--i:${i}"><a href="${href}"${current ? ' aria-current="page"' : ""}><span class="visually-hidden">${label}</span><span class="menu-link-text" data-chars aria-hidden="true">${label}</span></a></li>`;
  const navItems = [menuItem(link("index"), t.home, key === "index", 0)]
    .concat(NAV_KEYS.map((k, i) => menuItem(link(k), t.nav[k], meta.nav === k, i + 1))).join("\n          ");

  return `<!doctype html>
<html lang="${t.htmlLang}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${pageUrl("en", key)}">
  <link rel="alternate" hreflang="nb" href="${pageUrl("no", key)}">
  <link rel="alternate" hreflang="x-default" href="${pageUrl("en", key)}">`}
  <meta name="theme-color" content="#001A33">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AquaVant">
  <meta property="og:locale" content="${t.ogLocale}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/${IMG.share.src}">
  <meta property="og:image:width" content="${IMG.share.w}">
  <meta property="og:image:height" content="${IMG.share.h}">
  <meta property="og:image:alt" content="AquaVant">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${r}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="${r}favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="${r}apple-touch-icon.png">
  <link rel="manifest" href="${r}site.webmanifest">
  <link rel="preload" href="${r}assets/fonts/sora-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${r}assets/css/styles.css?v=${V.css}">
  <script>document.documentElement.classList.replace("no-js","js")</script>
  ${jsonLd(lang, key, meta)}
</head>
<body>
  <a class="skip-link" href="#main">${t.skip}</a>

  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="${link("index")}"><img src="${r}assets/logo/aquavant-horizontal-negative.svg" alt="${t.logoAlt}" width="168" height="58"></a>
      <div class="header-actions">
        <div class="lang" role="group" aria-label="${t.langLabel}">
          <a href="${lang === "en" ? link(key) : otherHref}" lang="en" hreflang="en"${lang === "en" ? ' aria-current="true"' : ""}><span aria-hidden="true">EN</span><span class="visually-hidden">English</span></a>
          <a href="${lang === "no" ? link(key) : otherHref}" lang="nb" hreflang="nb"${lang === "no" ? ' aria-current="true"' : ""}><span aria-hidden="true">NO</span><span class="visually-hidden">Norsk</span></a>
        </div>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-haspopup="dialog" aria-label="${t.menuOpen}" data-label-open="${t.menuOpen}" data-label-close="${t.menuClose}">
          <span class="menu-toggle-bg" aria-hidden="true"></span>
          <span class="menu-toggle-text" data-chars aria-hidden="true">${t.menuWord}</span>
          <span class="menu-toggle-icon" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
      </div>
    </div>
  </header>

  <div class="menu" id="site-menu" role="dialog" aria-modal="true" aria-label="${t.navLabel}" hidden>
    <div class="menu-tile">
      <nav class="menu-nav" aria-label="${t.navLabel}">
        <ul class="menu-list">
          ${navItems}
        </ul>
      </nav>
      <div class="menu-foot">
        <p class="menu-tagline">${t.menuTagline}</p>
        <div class="menu-contact">
          <a href="mailto:${esc(EMAIL)}">${EMAIL}</a>
          <a href="mailto:${esc(EMAIL2)}">${EMAIL2}</a>
          <a href="${esc(LINKEDIN)}" rel="noopener">${t.linkedin}</a>
        </div>
      </div>
    </div>
  </div>

  ${key === "contact" || key === "404" ? "" : `<a class="side-tab" href="${link("contact")}">${t.tab}</a>\n`}
  <main id="main" tabindex="-1">
${body.replace(/\{\{root\}\}/g, r).replace(/\{\{email\}\}/g, EMAIL).replace(/\{\{email2\}\}/g, EMAIL2).replace(/\{\{orgno\}\}/g, ORG_NO).trimEnd()}
  </main>

  <footer class="site-footer deep">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <img src="${r}assets/logo/aquavant-horizontal-negative.svg" alt="AquaVant" width="230" height="79" loading="lazy">
          <p>${t.footerLine}</p>
          <div class="footer-mv"><img src="${r}assets/logo/microvant-horizontal-negative.svg" alt="${t.mvAlt}" width="150" height="52" loading="lazy"></div>
        </div>
        <div class="footer-col">
          <h2>${t.explore}</h2>
          <ul>
            <li><a href="${link("index")}">${t.home}</a></li>
            ${NAV_KEYS.map((k) => `<li><a href="${link(k)}">${t.nav[k]}</a></li>`).join("\n            ")}
          </ul>
        </div>
        <div class="footer-col">
          <h2>${t.company}</h2>
          <ul>
            <li>AquaVant AS</li>
            <li>${t.orgNo} ${ORG_NO}</li>
            <li>${t.city}</li>
          </ul>
        </div>
        <div class="footer-col">
          <h2>${t.connect}</h2>
          <ul>
            <li><a href="mailto:${esc(EMAIL)}">${t.email} Kjetil</a></li>
            <li><a href="mailto:${esc(EMAIL2)}">${t.email} Cheng</a></li>
            <li><a href="${esc(LINKEDIN)}" rel="noopener">${t.linkedin}</a></li>
            <li><a href="${link("privacy")}">${t.privacy}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> ${t.rights}</span>
        <span>${t.mvLine}</span>
      </div>
    </div>
  </footer>

  <script src="${r}assets/js/vendor/lenis.min.js?v=${V.lenis}" defer></script>
  <script src="${r}assets/js/main.js?v=${V.js}" defer></script>
</body>
</html>
`;
}

// ---------- Images (content/images.json, editable in Pages CMS) ----------
// Photos already in assets/img are used as they are, with their -800 copy if there is one.
// Any other image (normally an upload in assets/img/uploads/) is resized and compressed into
// assets/img/cms/ on each build, so a large photo straight from a phone never reaches visitors.
// sharp is only needed for uploads. The images shipped with the site are measured from
// their JPEG headers, so the site still builds if sharp fails to install.
let sharp = null;
try { sharp = (await import("sharp")).default; }
catch { console.warn("sharp is not available: uploaded images cannot be processed (run `npm install`)."); }
const SHIPPED = /^assets\/img\/(fjord|production|lab|emulsion|vaccination|trials|og-image|team\/kjetil-fyrand)(-800)?\.jpg$/;
function jpegSize(file) {
  const b = readFileSync(file);
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1], len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error(`Could not read the size of ${file}`);
}
const IMAGES = readJson("content/images.json");
const CMS_DIR = join(OUT, "assets/img/cms");
const KIND = { kjetil: "portrait", cheng: "portrait", share: "share" };
const CROP = { portrait: [600, 750], share: [1200, 630] };
const made = new Set();

async function prepareImage(slot, kind) {
  const rel = (IMAGES[slot]?.image || "").trim().replace(/^\/+/, "");
  if (!rel) {
    if (kind === "portrait") return null; // shows the initials instead
    throw new Error(`content/images.json: choose an image for "${slot}"`);
  }
  const file = join(OUT, rel);
  if (!existsSync(file)) throw new Error(`content/images.json: "${slot}" points to /${rel}, which does not exist`);
  const size = async (path) => jpegSize(join(OUT, path));
  if (SHIPPED.test(rel)) {
    const small = rel.replace(/\.jpg$/, "-800.jpg");
    const hasSmall = small !== rel && existsSync(join(OUT, small));
    const [w, h] = await size(rel);
    const [sw] = hasSmall ? await size(small) : [w];
    return { src: rel, small: hasSmall ? small : rel, w, h, sw };
  }
  if (!sharp) throw new Error(`"${slot}" uses an uploaded image, but the image tool sharp is not installed. Run \`npm install\`.`);
  mkdirSync(CMS_DIR, { recursive: true });
  const hash = createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 8);
  const write = async (name, resize) => {
    made.add(name);
    const out = join(CMS_DIR, name);
    if (!existsSync(out)) await resize(sharp(file).rotate()).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    const [w, h] = await size(`assets/img/cms/${name}`);
    return { path: `assets/img/cms/${name}`, w, h };
  };
  if (kind === "photo") {
    const full = await write(`${slot}-${hash}.jpg`, (img) => img.resize({ width: 1600, withoutEnlargement: true }));
    const small = await write(`${slot}-${hash}-800.jpg`, (img) => img.resize({ width: 800, withoutEnlargement: true }));
    return { src: full.path, small: small.path, w: full.w, h: full.h, sw: small.w };
  }
  const [cw, ch] = CROP[kind];
  const one = await write(`${slot}-${hash}.jpg`, (img) => img.resize(cw, ch, { fit: "cover", position: "attention" }));
  return { src: one.path, small: one.path, w: one.w, h: one.h, sw: one.w };
}

const IMG = {};
for (const slot of Object.keys(IMAGES)) IMG[slot] = await prepareImage(slot, KIND[slot] || "photo");
if (existsSync(CMS_DIR)) for (const f of readdirSync(CMS_DIR)) if (!made.has(f)) rmSync(join(CMS_DIR, f));

// {{img.slot.field}}: src, small, w, h, sw (width of the small copy) or alt.
const imgValue = (lang, slot, field) => {
  if (!IMG[slot]) throw new Error(`Template uses {{img.${slot}.${field}}}, but content/images.json has no image for it`);
  return field === "alt" ? esc(IMAGES[slot][`alt_${lang}`] || "") : String(IMG[slot][field]);
};
// {{portrait.slot.founder|about}}: the founder photo, or their initials when there is no photo.
const portrait = (lang, slot, variant) => {
  const p = IMG[slot], ini = esc(IMAGES[slot].initials || "");
  const img = p && `<img src="{{root}}${p.src}" alt="${esc(IMAGES[slot][`alt_${lang}`] || "")}" width="${p.w}" height="${p.h}" loading="lazy">`;
  if (variant === "founder") return p ? `<span class="founder-photo">${img}</span>` : `<span class="founder-photo founder-photo--initials" aria-hidden="true">${ini}</span>`;
  return p ? `<div class="portrait">${img}</div>` : `<div class="portrait" aria-hidden="true">${ini}</div>`;
};

const sitemap = [];
for (const lang of ["en", "no"]) {
  const dir = join(ROOT, "src", "pages", lang);
  const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
  for (const f of files) {
    const key = f.replace(/\.html$/, "");
    if (!PAGES.includes(key)) throw new Error(`Unknown page ${lang}/${f}`);
    const { meta, body: template } = parse(readFileSync(join(dir, f), "utf8"));
    const text = readJson(`content/${lang}/${key}.json`);
    Object.assign(meta, text.seo);
    if (!meta.title || !meta.description) throw new Error(`content/${lang}/${key}.json needs a page title and description`);
    // {{t.section.field}} in the page template is filled with that text from the content file.
    const body = template
      .replace(/\{\{img\.(\w+)\.(\w+)\}\}/g, (_, slot, field) => imgValue(lang, slot, field))
      .replace(/\{\{portrait\.(\w+)\.(\w+)\}\}/g, (_, slot, variant) => portrait(lang, slot, variant))
      .replace(/\{\{t\.([\w-]+)\.([\w-]+)\}\}/g, (_, s, k) => {
      const v = text[s]?.[k];
      if (typeof v !== "string") throw new Error(`content/${lang}/${key}.json is missing ${s}.${k}`);
      return v.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    });
    const outDir = join(OUT, L[lang].dir);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, pageFile(key)), layout(lang, key, meta, body));
    if (key !== "privacy" && key !== "404") sitemap.push({ lang, key });
    console.log(`built ${L[lang].dir}${pageFile(key)}`);
  }
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemap.map(({ lang, key }) => `  <url>
    <loc>${pageUrl(lang, key)}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl("en", key)}"/>
    <xhtml:link rel="alternate" hreflang="nb" href="${pageUrl("no", key)}"/>
  </url>`).join("\n")}
</urlset>
`);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(join(OUT, "site.webmanifest"), JSON.stringify({
  name: "AquaVant", short_name: "AquaVant", start_url: "/", display: "browser",
  background_color: "#001A33", theme_color: "#001A33",
  icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
}, null, 2) + "\n");
console.log("built sitemap.xml, robots.txt, site.webmanifest");
