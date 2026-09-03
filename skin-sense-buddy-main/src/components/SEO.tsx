import { useEffect } from "react";

const SITE_URL = "https://www.imstevnaturals.com";

export type SeoConfig = {
  title: string;
  description: string;
  path: string;
};

export function SEO({ title, description, path }: SeoConfig) {
  useEffect(() => {
    const canonicalPath = path === "/" ? "/" : `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = title;

    let descriptionTag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.name = "description";
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;

    const canonicalTags = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    const canonicalTag = canonicalTags[0] ?? document.createElement("link");
    canonicalTag.rel = "canonical";
    canonicalTag.href = canonicalUrl;
    if (!canonicalTag.parentNode) document.head.appendChild(canonicalTag);
    canonicalTags.slice(1).forEach((tag) => tag.remove());

    let ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;

    return () => {
      canonicalTag.remove();
      ogUrl?.remove();
    };
  }, [description, path, title]);

  return null;
}

export { SITE_URL };
