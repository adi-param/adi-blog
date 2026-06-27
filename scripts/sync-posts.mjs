import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import yaml from "js-yaml";

const root = process.cwd();
const sourcesPath = path.join(root, "sources.yml");
const outputDir = path.resolve(root, process.env.POSTS_OUTPUT_DIR ?? "src/content/posts");

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

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "adi-blog-sync",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function matchesGlob(filePath, pattern) {
  if (pattern.endsWith("/**/*.md")) {
    const prefix = pattern.slice(0, -"**/*.md".length);
    return filePath.startsWith(prefix) && filePath.endsWith(".md");
  }

  return filePath === pattern;
}

function sourceUrl(source, filePath) {
  return `https://github.com/${source.repo}/blob/${source.branch}/${filePath}`;
}

function rawUrl(source, filePath) {
  return `https://raw.githubusercontent.com/${source.repo}/${source.branch}/${filePath}`;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir, rootDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, rootDir)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(rootDir, fullPath).split(path.sep).join("/"));
    }
  }

  return files;
}

function stripLeadingH1(markdown) {
  return markdown.replace(/^# .+\n+/, "");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchMarkdown(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function listMarkdownFiles(source) {
  if (source.localPath) {
    const localRoot = path.resolve(root, source.localPath);

    if (await pathExists(localRoot)) {
      const localFiles = await walkFiles(localRoot);
      const paths = source.paths ?? [];

      return localFiles.filter((filePath) =>
        paths.some((pattern) => matchesGlob(filePath, pattern))
      );
    }
  }

  const treeUrl = `https://api.github.com/repos/${source.repo}/git/trees/${source.branch}?recursive=1`;
  const tree = await fetchJson(treeUrl);
  const paths = source.paths ?? [];

  if (!Array.isArray(tree.tree)) {
    throw new Error(`GitHub tree response for ${source.repo} did not contain a tree array.`);
  }

  return tree.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((filePath) => paths.some((pattern) => matchesGlob(filePath, pattern)));
}

async function discoverPosts(source) {
  const files = await listMarkdownFiles(source);
  const posts = [];
  const localRoot = source.localPath ? path.resolve(root, source.localPath) : null;
  const hasLocalRoot = localRoot ? await pathExists(localRoot) : false;

  for (const filePath of files) {
    const markdown =
      hasLocalRoot
        ? await fs.readFile(path.join(localRoot, filePath), "utf8")
        : await fetchMarkdown(rawUrl(source, filePath));
    const parsed = matter(markdown);
    const blog = parsed.data?.blog;

    if (!blog?.publish) {
      continue;
    }

    posts.push({
      slug: required(blog.slug, "blog.slug", filePath),
      title: required(blog.title, "blog.title", filePath),
      description: required(blog.description, "blog.description", filePath),
      date: required(blog.date, "blog.date", filePath),
      tags: blog.tags ?? [],
      source: rawUrl(source, filePath),
      sourceUrl: sourceUrl(source, filePath),
      content: parsed.content,
    });
  }

  return posts;
}

async function main() {
  const sourcesText = await fs.readFile(sourcesPath, "utf8");
  const manifest = yaml.load(sourcesText);
  const sources = manifest?.sources;

  if (!Array.isArray(sources)) {
    throw new Error("sources.yml must contain a top-level sources array.");
  }

  const posts = [];

  for (const source of sources) {
    required(source.name, "name");
    required(source.repo, "repo", source.name);
    required(source.branch, "branch", source.name);
    posts.push(...(await discoverPosts(source)));
  }

  await fs.mkdir(outputDir, { recursive: true });

  for (const post of posts) {
    required(post.slug, "slug");

    const frontmatter = serializeFrontmatter(post);
    const content = stripLeadingH1(post.content.trim());
    const outputPath = path.join(outputDir, `${post.slug}.md`);

    await fs.writeFile(outputPath, `${frontmatter.trim()}\n\n${content}\n`);
    console.log(`Synced ${post.slug}`);
  }

  console.log(`Synced ${posts.length} published post${posts.length === 1 ? "" : "s"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
