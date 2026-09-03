import { useEffect } from "react";

export const SITE_URL = "https://www.imstevnaturals.com";
const DEFAULT_IMAGE = `${SITE_URL}/imstev-naturals-logo.jpeg`;
const ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

export type SeoConfig = {
  title: string;
  description: string;
  path: string;
  schemaType?: "WebPage" | "CollectionPage" | "Service";
  serviceName?: string;
};

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
  return tag;
}

function createStructuredData(config: SeoConfig, canonicalUrl: string) {
  const graph: Record<string, unknown>[] = [{
    "@type": config.schemaType || "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: config.title,
    description: config.description,
    inLanguage: "en-NG",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_IMAGE },
  }];

  if (config.path === "/") {
    graph.push(
      {
        "@type": ["Organization", "LocalBusiness"],
        "@id": `${SITE_URL}/#organization`,
        name: "IMSTEV NATURALS",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
        image: DEFAULT_IMAGE,
        telephone: "+2348110523763",
        address: {
          "@type": "PostalAddress",
          streetAddress: "JAMB National Headquarter, Bwari",
          addressLocality: "Bwari",
          addressRegion: "Federal Capital Territory",
          postalCode: "901101",
          addressCountry: "NG",
        },
        areaServed: "Worldwide",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "IMSTEV NATURALS",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-NG",
      },
    );
  }

  if (config.schemaType === "Service") {
    graph.push({
      "@type": "Service",
      "@id": `${canonicalUrl}#service`,
      name: config.serviceName || config.title,
      serviceType: config.serviceName || config.title,
      description: config.description,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: "Worldwide",
      url: canonicalUrl,
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function SEO(config: SeoConfig) {
  useEffect(() => {
    const canonicalPath = config.path === "/" ? "/" : `/${config.path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const tags = [
      upsertMeta('meta[name="description"]', "name", "description", config.description),
      upsertMeta('meta[name="robots"]', "name", "robots", ROBOTS),
      upsertMeta('meta[property="og:title"]', "property", "og:title", config.title),
      upsertMeta('meta[property="og:description"]', "property", "og:description", config.description),
      upsertMeta('meta[property="og:type"]', "property", "og:type", "website"),
      upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl),
      upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "IMSTEV NATURALS"),
      upsertMeta('meta[property="og:locale"]', "property", "og:locale", "en_NG"),
      upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE),
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image"),
      upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", config.title),
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", config.description),
      upsertMeta('meta[name="twitter:url"]', "name", "twitter:url", canonicalUrl),
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE),
    ];
    document.title = config.title;

    const canonicalTags = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    const canonical = canonicalTags[0] || document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = canonicalUrl;
    if (!canonical.parentNode) document.head.appendChild(canonical);
    canonicalTags.slice(1).forEach((tag) => tag.remove());

    let jsonLd = document.head.querySelector<HTMLScriptElement>('script[data-imstev-seo="jsonld"]');
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      jsonLd.dataset.imstevSeo = "jsonld";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(createStructuredData(config, canonicalUrl));

    return () => {
      tags.forEach((tag) => tag.remove());
      canonical.remove();
      jsonLd?.remove();
    };
  }, [config]);

  return null;
}
