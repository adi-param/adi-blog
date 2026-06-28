# Adi · Cybersecurity & DevOps

A static blog that publishes selected Markdown files from other repositories.

Live site: https://adi-param.github.io/adi-blog/

The blog uses `sources.yml` as a source registry. Source Markdown files opt in to publishing with `blog.publish: true` frontmatter, and the build script fetches those files before Astro builds the site.

## How It Works

```text
sources.yml
  -> scripts/sync-posts.mjs
  -> src/content/posts/
  -> Astro build
```

The Markdown source stays in its original repository. Generated post files are build artifacts and are not committed.

## Local Development

```bash
npm install
npm run dev
```

## Add a Source Repository

Add a source repository to `sources.yml`:

```yaml
sources:
  - name: enterprise-security-governance
    repo: adi-param/enterprise-security-governance
    branch: main
    paths:
      - docs/**/*.md
```

## Publish a Post

Add this frontmatter to a Markdown file in a configured source repository:

```yaml
---
blog:
  publish: true
  slug: saas-vendor-security-evaluation
  title: SaaS Vendor Security Evaluation
  description: Why SaaS vendor security reviews matter and how to evaluate vendors.
  date: 2026-06-27
  tags:
    - cybersecurity
    - governance
    - vendor-risk
    - saas
---
```

Then run:

```bash
npm run sync
```
