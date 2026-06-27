import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import yaml from "js-yaml";

const root = process.cwd();
const manifestPath = path.join(root, "posts.yml");
const outputDir = path.join(root, "src", "content", "posts");

function required(value, field, slug = "unknown") {
  if (!value) {
    throw new Error(`Missing required field "${field}" for post "${slug}".`);
  }
  return value;
}

function serializeFrontmatter(post) {
  return matter.stringify("", {
    title: required(post.title, "title", post.slug),
    description: required(post.description, "description", post.slug),
    date: required(post.date, "date", post.slug),
    tags: post.tags ?? [],
    source: required(post.source, "source", post.slug),
    sourceUrl: post.sourceUrl ?? post.source,
  });
}

function stripLeadingH1(markdown) {
  return markdown.replace(/^# .+\n+/, "");
}

async function fetchMarkdown(source) {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  const manifestText = await fs.readFile(manifestPath, "utf8");
  const manifest = yaml.load(manifestText);
  const posts = manifest?.posts;

  if (!Array.isArray(posts)) {
    throw new Error("posts.yml must contain a top-level posts array.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  for (const post of posts) {
    required(post.slug, "slug");
    required(post.source, "source", post.slug);

    const remoteMarkdown = await fetchMarkdown(post.source);
    const parsed = matter(remoteMarkdown);
    const frontmatter = serializeFrontmatter(post);
    const content = stripLeadingH1(parsed.content.trim());
    const outputPath = path.join(outputDir, `${post.slug}.md`);

    await fs.writeFile(outputPath, `${frontmatter.trim()}\n\n${content}\n`);
    console.log(`Synced ${post.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
