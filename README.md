# adi-blog

A static blog that publishes selected Markdown files from other repositories.

The blog uses `posts.yml` as a manifest. Each entry points to a raw Markdown file, and the build script fetches those files before Astro builds the site.

## How It Works

```text
posts.yml
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

## Add a Post

Add an entry to `posts.yml`:

```yaml
posts:
  - slug: forward-proxy-and-reverse-proxy
    title: Forward Proxy and Reverse Proxy
    description: A practical explanation of proxies, forward proxies, reverse proxies, VPNs, load balancers, and ingress controllers.
    date: 2026-06-27
    source: https://raw.githubusercontent.com/adi-param/networking-wiki/main/docs/architectures/proxies.md
    sourceUrl: https://github.com/adi-param/networking-wiki/blob/main/docs/architectures/proxies.md
    tags:
      - networking
      - proxies
      - architecture
```

Then run:

```bash
npm run sync
```
