// AquaVant site builder. No dependencies: `npm run build` (or `node build.mjs`).
// Reads page bodies from src/pages/{en,no}/*.html, wraps them in the shared
// layout (head, header, footer) and writes finished pages to public/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
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
const EMAIL = "kjetil.fyrand@aquavant.no";
const EMAIL2 = "cheng.xu@aquavant.no";
const ORG_NO = "[000 000 000]";
const LINKEDIN = "https://www.linkedin.com/";

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
  <meta property="og:image" content="${SITE}/assets/img/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
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
          <a href="mailto:${EMAIL}">${EMAIL}</a>
          <a href="mailto:${EMAIL2}">${EMAIL2}</a>
          <a href="${LINKEDIN}" rel="noopener">${t.linkedin}</a>
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
            <li><a href="mailto:${EMAIL}">${t.email} Kjetil</a></li>
            <li><a href="mailto:${EMAIL2}">${t.email} Cheng</a></li>
            <li><a href="${LINKEDIN}" rel="noopener">${t.linkedin}</a></li>
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

const sitemap = [];
for (const lang of ["en", "no"]) {
  const dir = join(ROOT, "src", "pages", lang);
  const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
  for (const f of files) {
    const key = f.replace(/\.html$/, "");
    if (!PAGES.includes(key)) throw new Error(`Unknown page ${lang}/${f}`);
    const { meta, body } = parse(readFileSync(join(dir, f), "utf8"));
    if (!meta.title || !meta.description) throw new Error(`${lang}/${f} needs title and description`);
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
