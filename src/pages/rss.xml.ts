import { getCollection } from "astro:content";

const siteTitle = "Adi · Cybersecurity & DevOps";
const siteDescription =
  "Cybersecurity, DevOps, cloud security, and infrastructure notes by Adi.";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export async function GET(context: { site?: URL }) {
  const site = context.site ?? new URL("https://adi-param.github.io");
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const posts = (await getCollection("posts")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const siteUrl = new URL(base, site).toString();
  const latestDate = posts[0]?.data.updated ?? posts[0]?.data.date ?? new Date();

  const items = posts
    .map((post) => {
      const url = new URL(`${base}posts/${post.slug}/`, site).toString();
      const updated = post.data.updated ?? post.data.date;

      return `
        <item>
          <title>${escapeXml(post.data.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid>${escapeXml(url)}</guid>
          <description>${escapeXml(post.data.description)}</description>
          <pubDate>${post.data.date.toUTCString()}</pubDate>
          <dc:date>${updated.toISOString()}</dc:date>
          ${post.data.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
        </item>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel>
        <title>${escapeXml(siteTitle)}</title>
        <link>${escapeXml(siteUrl)}</link>
        <description>${escapeXml(siteDescription)}</description>
        <language>en</language>
        <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>
        ${items}
      </channel>
    </rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
      },
    }
  );
}
