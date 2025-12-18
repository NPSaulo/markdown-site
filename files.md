# Markdown Site - File Structure

A brief description of each file in the codebase.

## Root Files

| File             | Description                                    |
| ---------------- | ---------------------------------------------- |
| `package.json`   | Dependencies and scripts for the blog          |
| `tsconfig.json`  | TypeScript configuration                       |
| `vite.config.ts` | Vite bundler configuration                     |
| `index.html`     | Main HTML entry with SEO meta tags and JSON-LD |
| `netlify.toml`   | Netlify deployment and Convex HTTP redirects   |
| `README.md`      | Project documentation                          |
| `files.md`       | This file - codebase structure                 |
| `changelog.md`   | Version history and changes                    |
| `TASK.md`        | Task tracking and project status               |

## Source Files (`src/`)

### Entry Points

| File            | Description                                |
| --------------- | ------------------------------------------ |
| `main.tsx`      | React app entry point with Convex provider |
| `App.tsx`       | Main app component with routing            |
| `vite-env.d.ts` | Vite environment type definitions          |

### Pages (`src/pages/`)

| File        | Description                                             |
| ----------- | ------------------------------------------------------- |
| `Home.tsx`  | Landing page with intro, featured essays, and post list |
| `Post.tsx`  | Individual blog post view with JSON-LD injection        |
| `Stats.tsx` | Real-time analytics dashboard with visitor stats        |

### Components (`src/components/`)

| File                   | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `Layout.tsx`           | Page wrapper with search button and theme toggle           |
| `ThemeToggle.tsx`      | Theme switcher (dark/light/tan/cloud)                      |
| `PostList.tsx`         | Year-grouped blog post list                                |
| `BlogPost.tsx`         | Markdown renderer with syntax highlighting                 |
| `CopyPageDropdown.tsx` | Share dropdown for LLMs (ChatGPT, Claude)                  |
| `SearchModal.tsx`      | Full text search modal with keyboard navigation            |

### Context (`src/context/`)

| File               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `ThemeContext.tsx` | Theme state management with localStorage persistence |

### Hooks (`src/hooks/`)

| File                 | Description                                   |
| -------------------- | --------------------------------------------- |
| `usePageTracking.ts` | Page view recording and active session heartbeat |

### Styles (`src/styles/`)

| File         | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| `global.css` | Global CSS with theme variables, font config for all four themes |

## Convex Backend (`convex/`)

| File               | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `schema.ts`        | Database schema (posts, pages, viewCounts, pageViews, activeSessions) |
| `posts.ts`         | Queries and mutations for blog posts, view counts             |
| `pages.ts`         | Queries and mutations for static pages                        |
| `search.ts`        | Full text search queries across posts and pages               |
| `stats.ts`         | Real-time stats queries, page view recording, session heartbeat |
| `crons.ts`         | Cron job for stale session cleanup                            |
| `http.ts`          | HTTP endpoints: sitemap, API, Open Graph metadata             |
| `rss.ts`           | RSS feed generation (standard and full content)               |
| `convex.config.ts` | Convex app configuration                                      |
| `tsconfig.json`    | Convex TypeScript configuration                               |

### HTTP Endpoints (defined in `http.ts`)

| Route           | Description                            |
| --------------- | -------------------------------------- |
| `/stats`        | Real-time site analytics page          |
| `/rss.xml`      | RSS feed with descriptions             |
| `/rss-full.xml` | RSS feed with full content for LLMs    |
| `/sitemap.xml`  | Dynamic XML sitemap for search engines |
| `/api/posts`    | JSON list of all posts                 |
| `/api/post`     | Single post as JSON or markdown        |
| `/meta/post`    | Open Graph HTML for social crawlers    |

## Content (`content/blog/`)

Markdown files with frontmatter for blog posts. Each file becomes a blog post.

| Field         | Description                            |
| ------------- | -------------------------------------- |
| `title`       | Post title                             |
| `description` | Short description for SEO              |
| `date`        | Publication date (YYYY-MM-DD)          |
| `slug`        | URL path for the post                  |
| `published`   | Whether post is public                 |
| `tags`        | Array of topic tags                    |
| `readTime`    | Estimated reading time                 |
| `image`       | Header/Open Graph image URL (optional) |

## Static Pages (`content/pages/`)

Markdown files for static pages like About, Projects, Contact.

| Field       | Description                               |
| ----------- | ----------------------------------------- |
| `title`     | Page title                                |
| `slug`      | URL path for the page                     |
| `published` | Whether page is public                    |
| `order`     | Display order in navigation (lower first) |

## Scripts (`scripts/`)

| File            | Description                                  |
| --------------- | -------------------------------------------- |
| `sync-posts.ts` | Syncs markdown files to Convex at build time |

## Netlify (`netlify/edge-functions/`)

| File         | Description                                           |
| ------------ | ----------------------------------------------------- |
| `botMeta.ts` | Edge function for social media crawler detection      |
| `rss.ts`     | Proxies `/rss.xml` and `/rss-full.xml` to Convex HTTP |
| `sitemap.ts` | Proxies `/sitemap.xml` to Convex HTTP                 |
| `api.ts`     | Proxies `/api/posts` and `/api/post` to Convex HTTP   |

## Public Assets (`public/`)

| File          | Description                                    |
| ------------- | ---------------------------------------------- |
| `favicon.svg` | Site favicon                                   |
| `_redirects`  | SPA redirect rules for static files            |
| `robots.txt`  | Crawler rules for search engines and AI bots   |
| `llms.txt`    | AI agent discovery file (llmstxt.org standard) |

### Images (`public/images/`)

| File             | Description                                  |
| ---------------- | -------------------------------------------- |
| `logo.svg`       | Site logo displayed on homepage              |
| `og-default.svg` | Default Open Graph image for social sharing  |
| `*.png/jpg/svg`  | Blog post images (referenced in frontmatter) |

## Cursor Rules (`.cursor/rules/`)

| File            | Description                               |
| --------------- | ----------------------------------------- |
| `sec-check.mdc` | Security guidelines and audit checklist   |
| `dev2.mdc`      | Development guidelines and best practices |
| `help.mdc`      | Core development guidelines               |
| `convex2.mdc`   | Convex-specific guidelines and examples   |
