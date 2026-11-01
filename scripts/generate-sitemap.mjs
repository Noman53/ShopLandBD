import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

const mode = process.env.npm_lifecycle_event === "prebuild" ? "production" : "development";
const env = loadEnv(process.env.NODE_ENV || mode, process.cwd(), "");
const BASE_URL = new URL(env.VITE_SITE_URL || "https://shoplandbd.vercel.app").origin;

async function getProductEntries() {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("Supabase env vars missing; skipping dynamic product entries.");
    return [];
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("products")
    .select("id, updated_at")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.warn("Failed to fetch products for sitemap:", error.message);
    return [];
  }

  return (data ?? []).map((product) => ({
    path: `/products/${product.id}`,
    lastmod: product.updated_at?.slice(0, 10),
    changefreq: "weekly",
    priority: "0.7",
  }));
}

function generateSitemap(entries) {
  const urls = entries.map((entry) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${entry.path}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

const staticEntries = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/track-order", changefreq: "monthly", priority: "0.4" },
  { path: "/returns", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

const productEntries = await getProductEntries();
const entries = [...staticEntries, ...productEntries];
writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
