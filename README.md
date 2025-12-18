# markdown "sync" site

A minimalist markdown site built with React, Convex, and Vite. Optimized for SEO, AI agents, and LLM discovery.

**How publishing works:** Write posts in markdown, run `npm run sync` for development or `npm run sync:prod` for production, and they appear on your live site immediately. No rebuild or redeploy needed. Convex handles real-time data sync, so all connected browsers update automatically.

## Features

- Markdown-based blog posts with frontmatter
- Syntax highlighting for code blocks
- Four theme options: Dark, Light, Tan (default), Cloud
- Real-time data with Convex
- Fully responsive design
- Real-time analytics at `/stats`
- Full text search with Command+K shortcut

### SEO and Discovery

- RSS feeds at `/rss.xml` and `/rss-full.xml` (with full content)
- Dynamic sitemap at `/sitemap.xml`
- JSON-LD structured data for Google rich results
- Open Graph and Twitter Card meta tags
- `robots.txt` with AI crawler rules
- `llms.txt` for AI agent discovery

### AI and LLM Access

- `/api/posts` - JSON list of all posts for agents
- `/api/post?slug=xxx` - Single post JSON or markdown
- `/rss-full.xml` - Full content RSS for LLM ingestion
- Copy Page dropdown for sharing to ChatGPT, Claude

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A Convex account

### Setup

1. Install dependencies:

```bash
npm install
```

2. Initialize Convex:

```bash
npx convex dev
```

This will create your Convex project and generate the `.env.local` file.

3. Start the development server:

```bash
npm run dev
```

4. Open http://localhost:5173

## Writing Blog Posts

Create markdown files in `content/blog/` with frontmatter:

## Static Pages (Optional)

Create optional pages like About, Projects, or Contact in `content/pages/`:

```markdown
---
title: "About"
slug: "about"
published: true
order: 1
---

Your page content here...
```

Pages appear as navigation links in the top right, next to the theme toggle. The `order` field controls display order (lower numbers first).

```markdown
---
title: "Your Post Title"
description: "A brief description"
date: "2025-01-15"
slug: "your-post-slug"
published: true
tags: ["tag1", "tag2"]
readTime: "5 min read"
image: "/images/my-header.png"
---

Your markdown content here...
```

## Images

### Open Graph Images

Add an `image` field to frontmatter for social media previews:

```yaml
image: "/images/my-header.png"
```

Recommended dimensions: 1200x630 pixels. Images can be local (`/images/...`) or external URLs.

### Inline Images

Add images in markdown content:

```markdown
![Alt text description](/images/screenshot.png)
```

Place image files in `public/images/`. The alt text displays as a caption.

### Site Logo

Edit `src/pages/Home.tsx` to set your site logo:

```typescript
const siteConfig = {
  logo: "/images/logo.svg", // Set to null to hide
  // ...
};
```

Replace `public/images/logo.svg` with your own logo file.

### Favicon

Replace `public/favicon.svg` with your own icon. The default is a rounded square with the letter "m". Edit the SVG to change the letter or style.

### Default Open Graph Image

The default OG image is used when posts do not have an `image` field. Replace `public/images/og-default.svg` with your own image (1200x630 recommended).

Update the reference in `src/pages/Post.tsx`:

```typescript
const DEFAULT_OG_IMAGE = "/images/og-default.svg";
```

## Syncing Posts

Posts are synced to Convex. The sync script reads markdown files from `content/blog/` and `content/pages/`, then uploads them to your Convex database.

### Environment Files

| File                    | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `.env.local`            | Development deployment URL (created by `npx convex dev`) |
| `.env.production.local` | Production deployment URL (create manually)              |

Both files are gitignored. Each developer creates their own.

### Sync Commands

| Command             | Target      | When to use                 |
| ------------------- | ----------- | --------------------------- |
| `npm run sync`      | Development | Local testing, new posts    |
| `npm run sync:prod` | Production  | Deploy content to live site |

**Development sync:**

```bash
npm run sync
```

**Production sync:**

First, create `.env.production.local` with your production Convex URL:

```
VITE_CONVEX_URL=https://your-prod-deployment.convex.cloud
```

Then sync:

```bash
npm run sync:prod
```

## Deployment

### Netlify

[![Netlify Status](https://api.netlify.com/api/v1/badges/d8c4d83d-7486-42de-844b-6f09986dc9aa/deploy-status)](https://app.netlify.com/projects/markdowncms/deploys)

For detailed setup, see the [Convex Netlify Deployment Guide](https://docs.convex.dev/production/hosting/netlify).

1. Deploy Convex functions to production:

```bash
npx convex deploy
```

Note the production URL (e.g., `https://your-deployment.convex.cloud`).

2. Connect your repository to Netlify
3. Configure build settings:
   - Build command: `npm ci --include=dev && npx convex deploy --cmd 'npm run build'`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard:
   - `CONVEX_DEPLOY_KEY` - Generate from [Convex Dashboard](https://dashboard.convex.dev) > Project Settings > Deploy Key
   - `VITE_CONVEX_URL` - Your production Convex URL (e.g., `https://your-deployment.convex.cloud`)

The `CONVEX_DEPLOY_KEY` deploys functions at build time. The `VITE_CONVEX_URL` is required for edge functions (RSS, sitemap, API) to proxy requests at runtime.

**Build issues?** Netlify sets `NODE_ENV=production` which skips devDependencies. The `--include=dev` flag fixes this. See [netlify-deploy-fix.md](./netlify-deploy-fix.md) for detailed troubleshooting.

## Project Structure

```
markdown-site/
├── content/blog/      # Markdown blog posts
├── convex/            # Convex backend
│   ├── http.ts        # HTTP endpoints (sitemap, API, RSS)
│   ├── posts.ts       # Post queries and mutations
│   ├── rss.ts         # RSS feed generation
│   └── schema.ts      # Database schema
├── netlify/           # Netlify edge functions
│   └── edge-functions/
│       ├── rss.ts     # RSS feed proxy
│       ├── sitemap.ts # Sitemap proxy
│       ├── api.ts     # API endpoint proxy
│       └── botMeta.ts # OG crawler detection
├── public/            # Static assets
│   ├── images/        # Blog images and OG images
│   ├── robots.txt     # Crawler rules
│   └── llms.txt       # AI agent discovery
├── scripts/           # Build scripts
└── src/
    ├── components/    # React components
    ├── context/       # Theme context
    ├── pages/         # Page components
    └── styles/        # Global CSS
```

## Scripts Reference

| Script                | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start Vite dev server                        |
| `npm run dev:convex`  | Start Convex dev backend                     |
| `npm run sync`        | Sync posts to dev deployment                 |
| `npm run sync:prod`   | Sync posts to production deployment          |
| `npm run build`       | Build for production                         |
| `npm run deploy`      | Sync + build (for manual deploys)            |
| `npm run deploy:prod` | Deploy Convex functions + sync to production |

## Tech Stack

- React 18
- TypeScript
- Vite
- Convex
- react-markdown
- react-syntax-highlighter
- date-fns
- lucide-react
- @phosphor-icons/react
- Netlify

## Search

Press `Command+K` (Mac) or `Ctrl+K` (Windows/Linux) to open the search modal. The search uses Convex full text search to find posts and pages by title and content.

Features:

- Real-time results as you type
- Keyboard navigation (arrow keys, Enter, Escape)
- Result snippets with context around matches
- Distinguishes between posts and pages
- Works with all four themes

The search icon appears in the top navigation bar next to the theme toggle.

## Real-time Stats

The `/stats` page shows real-time analytics powered by Convex:

- **Active visitors**: Current visitors on the site with per-page breakdown
- **Total page views**: All-time view count
- **Unique visitors**: Based on anonymous session IDs
- **Views by page**: List of all pages sorted by view count

Stats update automatically via Convex subscriptions. No page refresh needed.

How it works:

- Page views are recorded as event records (not counters) to avoid write conflicts
- Active sessions use heartbeat presence (30s interval, 2min timeout)
- A cron job cleans up stale sessions every 5 minutes
- No PII stored (only anonymous session UUIDs)

## API Endpoints

| Endpoint                       | Description                     |
| ------------------------------ | ------------------------------- |
| `/stats`                       | Real-time site analytics        |
| `/rss.xml`                     | RSS feed with post descriptions |
| `/rss-full.xml`                | RSS feed with full post content |
| `/sitemap.xml`                 | Dynamic XML sitemap             |
| `/api/posts`                   | JSON list of all posts          |
| `/api/post?slug=xxx`           | Single post as JSON             |
| `/api/post?slug=xxx&format=md` | Single post as markdown         |
| `/meta/post?slug=xxx`          | Open Graph HTML for crawlers    |

## How Blog Post Slugs Work

Slugs are defined in the frontmatter of each markdown file:

```markdown
---
slug: "my-post-slug"
---
```

The slug becomes the URL path: `yourdomain.com/my-post-slug`

Rules:

- Slugs must be unique across all posts
- Use lowercase letters, numbers, and hyphens
- The sync script reads the `slug` field from frontmatter
- Posts are queried by slug using a Convex index

## Theme Configuration

The default theme is Tan. Users can cycle through themes using the toggle:

- Dark (Moon icon)
- Light (Sun icon)
- Tan (Half icon) - default
- Cloud (Cloud icon)

To change the default theme, edit `src/context/ThemeContext.tsx`:

```typescript
const DEFAULT_THEME: Theme = "tan"; // Change to "dark", "light", or "cloud"
```

## Font Configuration

The blog uses a serif font (New York) by default. To switch fonts, edit `src/styles/global.css`:

```css
body {
  /* Sans-serif option */
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, sans-serif;

  /* Serif option (default) */
  font-family:
    "New York",
    -apple-system-ui-serif,
    ui-serif,
    Georgia,
    Cambria,
    "Times New Roman",
    Times,
    serif;
}
```

Replace the `font-family` property with your preferred font stack.

## Source

Fork this project: [github.com/waynesutton/markdown-site](https://github.com/waynesutton/markdown-site)
