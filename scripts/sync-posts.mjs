import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import matter from "gray-matter";
import yaml from "js-yaml";

const root = process.cwd();
const sourcesPath = path.join(root, "sources.yml");
const postsOutputDir = path.resolve(root, process.env.POSTS_OUTPUT_DIR ?? "src/content/posts");
const foundationOutputDir = path.resolve(
  root,
  process.env.FOUNDATION_OUTPUT_DIR ?? "src/generated/foundations"
);
const astroDataStorePath = path.join(root, ".astro", "data-store.json");
const execFileAsync = promisify(execFile);

// gray-matter ships a JavaScript frontmatter engine that calls eval(). Because
// posts are parsed from remote source repos, disable it so only YAML is parsed.
function rejectJsFrontmatter() {
  throw new Error("JavaScript frontmatter is not allowed.");
}

const matterOptions = {
  engines: {
    javascript: rejectJsFrontmatter,
    js: rejectJsFrontmatter,
  },
};

// Slugs become filenames and URL routes, so constrain them to a safe charset
// to prevent path traversal (e.g. "../../astro.config") during the build.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    ...(post.image ? { image: post.image } : {}),
    date: required(post.date, "date", post.slug),
    tags: post.tags ?? [],
    source: required(post.source, "source", post.slug),
    sourceUrl: post.sourceUrl ?? post.source,
  });
}

function serializeFoundationFrontmatter(entry) {
  return matter.stringify("", {
    title: required(entry.title, "title", entry.slug),
    description: required(entry.description, "description", entry.slug),
    date: required(entry.date, "date", entry.slug),
    topic: required(entry.topic, "topic", entry.slug),
    topicSlug: required(entry.topicSlug, "topicSlug", entry.slug),
    entrySlug: required(entry.slug, "entrySlug", entry.slug),
    // Optional explicit ordering for a topic that reads as a sequence. Absent
    // for standalone notes, which the site groups separately and sorts by date.
    ...(Number.isFinite(entry.order) ? { order: entry.order } : {}),
    // Optional section heading used to group entries within a topic.
    ...(entry.group ? { group: entry.group } : {}),
    source: required(entry.source, "source", entry.slug),
    sourceUrl: entry.sourceUrl ?? entry.source,
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

async function firstLocalCommitDate(localRoot, filePath) {
  try {
    // --follow tracks the file across renames so the first publish date is
    // preserved even if the source file was later moved. git lists commits
    // newest-first, so the last line is the oldest (first) commit.
    const { stdout } = await execFileAsync(
      "git",
      ["-C", localRoot, "log", "--follow", "--format=%cI", "--", filePath],
      { timeout: 10000 }
    );
    const dates = stdout.trim().split("\n").filter(Boolean);
    return dates[dates.length - 1] ?? null;
  } catch {
    return null;
  }
}

async function firstRemoteCommitDate(source, filePath) {
  const url = new URL(`https://api.github.com/repos/${source.repo}/commits`);
  url.searchParams.set("sha", source.branch);
  url.searchParams.set("path", filePath);
  url.searchParams.set("per_page", "1");

  try {
    const response = await fetch(url.toString(), { headers: githubHeaders() });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }

    // The commits API returns newest-first. With per_page=1 the "last" page in
    // the Link header holds the file's first (oldest) commit; if there is no
    // Link header there is only one commit, which is also the first.
    const link = response.headers.get("link");
    const lastPage = link?.match(/<([^>]+)>;\s*rel="last"/);

    if (lastPage) {
      const commits = await fetchJson(lastPage[1]);
      return commits?.[commits.length - 1]?.commit?.committer?.date ?? null;
    }

    const commits = await response.json();
    return commits?.[commits.length - 1]?.commit?.committer?.date ?? null;
  } catch {
    return null;
  }
}

async function firstCommitDate(source, filePath, localRoot, hasLocalRoot) {
  if (hasLocalRoot && localRoot) {
    const localDate = await firstLocalCommitDate(localRoot, filePath);
    if (localDate) {
      return localDate;
    }
  }

  return firstRemoteCommitDate(source, filePath);
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

// Maps each source file to the route it publishes at, so cross references
// between source files can be turned into working site links.
function buildUrlMap(posts, foundationEntries) {
  const map = new Map();
  for (const post of posts) {
    map.set(`${post.sourceName}::${post.filePath}`, `/posts/${post.slug}/`);
  }
  for (const entry of foundationEntries) {
    map.set(
      `${entry.sourceName}::${entry.filePath}`,
      `/foundations/${entry.topicSlug}/${entry.slug}/`
    );
  }
  return map;
}

// Rewrites relative links to sibling markdown files (which work when the wiki is
// browsed on GitHub) into the site routes those files publish to. Links to
// unpublished files, external URLs, and anchors are left untouched. Assumes the
// site is served from the root (astro base "/").
function rewriteMarkdownLinks(markdown, filePath, sourceName, urlMap) {
  const dir = path.posix.dirname(filePath);

  return markdown.replace(
    /\]\(([^)\s]+)(\s+"[^"]*")?\)/g,
    (match, target, title = "") => {
      if (/^(https?:|mailto:|#|\/)/i.test(target)) {
        return match;
      }

      const [rawPath, anchor] = target.split("#");

      if (!rawPath.endsWith(".md")) {
        return match;
      }

      const resolved = path.posix.normalize(path.posix.join(dir, rawPath));
      const url = urlMap.get(`${sourceName}::${resolved}`);

      if (!url) {
        return match;
      }

      return `](${url}${anchor ? `#${anchor}` : ""}${title})`;
    }
  );
}

function titleFromMarkdown(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function descriptionFromMarkdown(markdown, fallback) {
  const withoutHeading = stripLeadingH1(markdown).trim();
  const paragraph = withoutHeading
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .find((block) => block && !block.startsWith("```") && !block.startsWith("!") && !block.startsWith("|"));

  if (!paragraph) {
    return fallback;
  }

  return paragraph.length > 180 ? `${paragraph.slice(0, 177).trim()}...` : paragraph;
}

function humanizeSlug(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/\/README$/i, "/overview")
    .split("/")
    .filter((part) => part && part !== "docs")
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromPath(filePath) {
  const slug = humanizeSlug(filePath);
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTopic(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function topicSlug(value) {
  return normalizeTopic(value);
}

function foundationConfig(data, source) {
  if (data?.foundation && typeof data.foundation === "object") {
    return data.foundation;
  }

  return null;
}

async function clearMarkdownFiles(dir) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => fs.unlink(path.join(dir, entry.name)))
  );
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
    const parsed = matter(markdown, matterOptions);
    const blog = parsed.data?.blog;

    if (!blog?.publish) {
      continue;
    }

    const slug = required(blog.slug, "blog.slug", filePath);

    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `Invalid slug "${slug}" in ${filePath}: must match ${SLUG_PATTERN}.`
      );
    }

    posts.push({
      slug,
      title: required(blog.title, "blog.title", filePath),
      description: required(blog.description, "blog.description", filePath),
      image: blog.image,
      date:
        (await firstCommitDate(source, filePath, localRoot, hasLocalRoot)) ??
        required(blog.date, "blog.date", filePath),
      tags: blog.tags ?? [],
      source: rawUrl(source, filePath),
      sourceUrl: sourceUrl(source, filePath),
      filePath,
      sourceName: source.name,
      content: parsed.content,
    });
  }

  return posts;
}

async function discoverFoundationEntries(source) {
  const files = await listMarkdownFiles(source);
  const entries = [];
  const localRoot = source.localPath ? path.resolve(root, source.localPath) : null;
  const hasLocalRoot = localRoot ? await pathExists(localRoot) : false;

  for (const filePath of files) {
    if (filePath.includes("/_template/")) {
      continue;
    }

    const markdown =
      hasLocalRoot
        ? await fs.readFile(path.join(localRoot, filePath), "utf8")
        : await fetchMarkdown(rawUrl(source, filePath));
    const parsed = matter(markdown, matterOptions);

    if (parsed.data?.blog?.publish) {
      continue;
    }

    const foundation = foundationConfig(parsed.data, source);

    if (!foundation || foundation.publish === false) {
      continue;
    }

    const topic = required(foundation.topic, "foundation.topic", filePath);
    const normalizedTopicSlug = topicSlug(topic);

    if (!normalizedTopicSlug) {
      continue;
    }

    const slug = foundation?.slug ?? humanizeSlug(filePath);

    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `Invalid foundation slug "${slug}" in ${filePath}: must match ${SLUG_PATTERN}.`
      );
    }

    const fallbackTitle = titleFromPath(filePath);
    const fallbackDescription = `${titleFromMarkdown(parsed.content, fallbackTitle)} reference notes.`;

    entries.push({
      slug,
      title: foundation?.title ?? titleFromMarkdown(parsed.content, fallbackTitle),
      description:
        foundation?.description ?? descriptionFromMarkdown(parsed.content, fallbackDescription),
      date:
        (await firstCommitDate(source, filePath, localRoot, hasLocalRoot)) ??
        foundation?.date ??
        new Date().toISOString(),
      topic,
      topicSlug: normalizedTopicSlug,
      order: Number.isFinite(foundation?.order) ? foundation.order : undefined,
      group: typeof foundation?.group === "string" ? foundation.group : undefined,
      source: rawUrl(source, filePath),
      sourceUrl: sourceUrl(source, filePath),
      filePath,
      sourceName: source.name,
      content: parsed.content,
    });
  }

  return entries;
}

async function main() {
  const sourcesText = await fs.readFile(sourcesPath, "utf8");
  const manifest = yaml.load(sourcesText);
  const sources = manifest?.sources;

  if (!Array.isArray(sources)) {
    throw new Error("sources.yml must contain a top-level sources array.");
  }

  const posts = [];
  const foundationEntries = [];

  for (const source of sources) {
    required(source.name, "name");
    required(source.repo, "repo", source.name);
    required(source.branch, "branch", source.name);
    posts.push(...(await discoverPosts(source)));
    foundationEntries.push(...(await discoverFoundationEntries(source)));
  }

  await clearMarkdownFiles(postsOutputDir);
  await clearMarkdownFiles(foundationOutputDir);

  const urlMap = buildUrlMap(posts, foundationEntries);

  for (const post of posts) {
    required(post.slug, "slug");

    const frontmatter = serializeFrontmatter(post);
    const content = rewriteMarkdownLinks(
      stripLeadingH1(post.content.trim()),
      post.filePath,
      post.sourceName,
      urlMap
    );
    const outputPath = path.join(postsOutputDir, `${post.slug}.md`);

    await fs.writeFile(outputPath, `${frontmatter.trim()}\n\n${content}\n`);
    console.log(`Synced ${post.slug}`);
  }

  for (const entry of foundationEntries) {
    required(entry.slug, "slug");

    const frontmatter = serializeFoundationFrontmatter(entry);
    const content = rewriteMarkdownLinks(
      stripLeadingH1(entry.content.trim()),
      entry.filePath,
      entry.sourceName,
      urlMap
    );
    const outputPath = path.join(foundationOutputDir, `${entry.topicSlug}-${entry.slug}.md`);

    await fs.writeFile(outputPath, `${frontmatter.trim()}\n\n${content}\n`);
    console.log(`Synced foundation ${entry.topicSlug}/${entry.slug}`);
  }

  await fs.rm(astroDataStorePath, { force: true });

  console.log(`Synced ${posts.length} published post${posts.length === 1 ? "" : "s"}`);
  console.log(
    `Synced ${foundationEntries.length} foundation note${foundationEntries.length === 1 ? "" : "s"}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
