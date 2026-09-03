import { useEffect } from "react";

const SITE_URL = "https://www.imstevnaturals.com";
const DEFAULT_IMAGE = `${SITE_URL}/imstev-naturals-logo.jpeg`;
const ROBOTS_CONTENT = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

export type SeoConfig = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  schemaType?: "WebPage" | "CollectionPage" | "Service";
  serviceName?: string;
};

const absoluteUrl = (value: string) => value.startsWith("http") ? value : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;

function buildStructuredData({ title, description, path, type = "website", image = DEFAULT_IMAGE, schemaType = "WebPage", serviceName }: SeoConfig, canonicalUrl: string) {
  const graph: Record<string, unknown>[] = [
    {
      "@type": schemaType,
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: "en-NG",
      primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(image) },
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ];

  if (path === "/") {
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
        description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-NG",
      },
    );
  }

  if (schemaType === "Service") {
    graph.push({
      "@type": "Service",
      "@id": `${canonicalUrl}#service`,
      name: serviceName || title,
      serviceType: serviceName || title,
      description,
      url: canonicalUrl,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: "Worldwide",
    });
  }

  return { "@context": "https://schema.org", "@graph": graph, "@type": type };
}

export function SEO(config: SeoConfig) {
  const { title, description, path } = config;

  useEffect(() => {
    const canonicalPath = path === "/" ? "/" : `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    const imageUrl = absoluteUrl(config.image || DEFAULT_IMAGE);

    document.title = title;

    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.content = content;
      return tag;
    };

    const descriptionTag = setMeta('meta[name="description"]', "name", "description", description);
    const robotsTag = setMeta('meta[name="robots"]', "name", "robots", ROBOTS_CONTENT);
    const ogTitle = setMeta('meta[property="og:title"]', "property", "og:title", title);
    const ogDescription = setMeta('meta[property="og:description"]', "property", "og:description", description);
    const ogType = setMeta('meta[property="og:type"]', "property", "og:type", config.type || "website");
    const ogUrl = setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    const ogImage = setMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    const ogSiteName = setMeta('meta[property="og:site_name"]', "property", "og:site_name", "IMSTEV NATURALS");
    const ogLocale = setMeta('meta[property="og:locale"]', "property", "og:locale", "en_NG");
    const twitterCard = setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    const twitterTitle = setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    const twitterDescription = setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    const twitterUrl = setMeta('meta[name="twitter:url"]', "name", "twitter:url", canonicalUrl);
    const twitterImage = setMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    const canonicalTags = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    const canonicalTag = canonicalTags[0] || document.createElement("link");
    canonicalTag.rel = "canonical";
    canonicalTag.href = canonicalUrl;
    if (!canonicalTag.parentNode) document.head.appendChild(canonicalTag);
    canonicalTags.slice(1).forEach((tag) => tag.remove());

    let structuredData = document.head.querySelector<HTMLScriptElement>('script[data-imstev-seo="structured-data"]');
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.type = "application/ld+json";
      structuredData.dataset.imstevSeo = "structured-data";
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify(buildStructuredData(config, canonicalUrl));

    return () => {
      [descriptionTag, robotsTag, ogTitle, ogDescription, ogType, ogUrl, ogImage, ogSiteName, ogLocale, twitterCard, twitterTitle, twitterDescription, twitterUrl, twitterImage].forEach((tag) => tag.remove());
      canonicalTag.remove();
      structuredData?.remove();
    };
  }, [config, description, path, title]);

  return null;
}

export { DEFAULT_IMAGE, ROBOTS_CONTENT, SITE_URL };
