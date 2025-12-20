# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.11.1] - 2025-12-20

### Fixed

- Stats page now shows all historical page views correctly
  - Changed `getStats` to use direct counting until aggregates are fully backfilled
  - Ensures accurate stats display even if aggregate backfilling is incomplete

### Changed

- Chunked backfilling for aggregate component
  - Backfill mutation now processes 500 records at a time
  - Prevents memory limit issues with large datasets (16MB Convex limit)
  - Schedules itself to continue processing until complete
  - Progress visible in Convex dashboard logs

### Technical

- `backfillAggregatesChunk` internal mutation handles pagination
- Uses `ctx.scheduler.runAfter` to chain batch processing
- Tracks seen session IDs across chunks for unique visitor counting

## [1.11.0] - 2025-12-20

### Added

- Aggregate component for efficient O(log n) stats counts
  - Replaces O(n) table scans with pre-computed denormalized counts
  - Uses `@convex-dev/aggregate` package for TableAggregate
  - Three aggregates: totalPageViews, pageViewsByPath, uniqueVisitors
- Backfill mutation for existing page view data
  - `stats:backfillAggregates` populates counts from existing data
  - Idempotent and safe to run multiple times

### Changed

- `recordPageView` mutation now updates aggregate components
  - Inserts into pageViewsByPath aggregate for per-page counts
  - Inserts into totalPageViews aggregate for global count
  - Inserts into uniqueVisitors aggregate for new sessions only
- `getStats` query now uses aggregate counts
  - O(log n) count operations instead of O(n) table scans
  - Consistent fast response times regardless of data size
  - Still queries posts/pages for title matching

### Technical

- New file: `convex/convex.config.ts` (updated with aggregate component registrations)
- Three TableAggregate instances with different namespacing strategies
- Performance improvement scales better with growing page view data

### Documentation

- Updated `prds/howstatsworks.md` with old vs new implementation comparison
- Added aggregate component usage examples and configuration

## [1.10.0] - 2025-12-20

### Added

- Fork configuration documentation
  - "Files to Update When Forking" section in docs.md and setup-guide.md
  - Lists all 9 files with site-specific configuration
  - Backend configuration examples for Convex files
  - Code snippets for `convex/http.ts`, `convex/rss.ts`, `src/pages/Post.tsx`
- Same documentation added to README.md for discoverability

### Changed

- Updated site branding across all configuration files
  - `public/robots.txt`: Updated sitemap URL and header
  - `public/llms.txt`: Updated site name and description
  - `public/.well-known/ai-plugin.json`: Updated name and description for AI plugins
  - `public/openapi.yaml`: Updated API title and site name example
  - `convex/http.ts`: Updated SITE_URL and SITE_NAME constants

### Documentation

- Setup guide table of contents now includes fork configuration sections
- Docs page configuration section expanded with backend file list
- All AI discovery files reflect new "markdown sync site" branding

## [1.9.0] - 2025-12-20

### Added

- Scroll-to-top button
  - Appears after scrolling 300px (configurable)
  - Uses Phosphor ArrowUp icon for consistency
  - Smooth scroll animation (configurable)
  - Works with all four themes (dark, light, tan, cloud)
  - Enabled by default (can be disabled in Layout.tsx)
  - Fade-in animation when appearing
  - Responsive sizing for mobile devices

### Technical

- New component: `src/components/ScrollToTop.tsx`
  - Configurable via `ScrollToTopConfig` interface
  - Exports `defaultScrollToTopConfig` for customization
  - Uses passive scroll listener for performance
- Configuration options in Layout.tsx `scrollToTopConfig`
- CSS styles added to global.css with theme-specific shadows

## [1.8.0] - 2025-12-20

### Added

- Mobile menu with hamburger navigation
  - Slide-out drawer on mobile and tablet views
  - Accessible with keyboard navigation (Escape to close)
  - Focus trap for screen reader support
  - Smooth CSS transform animations
  - Page links and Home link in drawer
  - Auto-closes on route change
- Generate Skill option in CopyPageDropdown
  - Formats post/page content as an AI agent skill file
  - Downloads as `{slug}-skill.md` with skill structure
  - Includes metadata, when to use, and instructions sections
  - Uses Download icon from lucide-react

### Changed

- Layout.tsx now includes hamburger button and MobileMenu component
- Desktop navigation hidden on mobile, mobile menu hidden on desktop
- Improved responsive navigation across all breakpoints

### Technical

- New component: `src/components/MobileMenu.tsx`
- HamburgerButton exported from MobileMenu for Layout use
- New `formatAsSkill()` function for skill file generation
- New `handleDownloadSkill()` handler with blob download logic
- Uses browser File API for client-side file download
- CSS styles for mobile menu in global.css

## [1.7.0] - 2025-12-20

### Added

- Static raw markdown files at `/raw/{slug}.md`
  - Generated during `npm run sync` (development) or `npm run sync:prod` (production) in `public/raw/` directory
  - Each published post and page gets a corresponding static `.md` file
  - SEO indexable and accessible to AI agents
  - Includes metadata header (type, date, reading time, tags)
- View as Markdown option in CopyPageDropdown
  - Opens raw `.md` file in new tab
  - Available on all post and page views
- Perplexity added to AI service options in CopyPageDropdown
  - Sends full markdown content via URL parameter
  - Research articles directly in Perplexity
- Featured image support for posts and pages
  - `image` field in frontmatter displays as square thumbnail in card view
  - Non-square images automatically cropped to center
  - Recommended size: 400x400px minimum (800x800px for retina)

### Changed

- CopyPageDropdown now accepts `slug` prop for raw file links
- Updated `_redirects` to serve `/raw/*` files directly
- Improved markdown table CSS styling
  - GitHub-style tables with proper borders
  - Mobile responsive with horizontal scroll
  - Theme-aware alternating row colors
  - Hover states for better readability

### Technical

- Updated `scripts/sync-posts.ts` to generate `public/raw/` files
- Files are regenerated on each sync (old files cleaned up)
- Only published posts and pages generate raw files
- CopyPageDropdown uses FileText icon from lucide-react for View as Markdown

## [1.6.1] - 2025-12-18

### Added

- AGENTS.md with codebase instructions for AI coding agents

### Changed

- Added Firecrawl import to all "When to sync vs deploy" tables in docs
- Clarified import workflow: creates local files only, no `import:prod` needed
- Updated README, setup-guide, how-to-publish, docs page, about-this-blog
- Renamed `content/pages/changelog.md` to `changelog-page.md` to avoid confusion with root changelog

## [1.6.0] - 2025-12-18

### Added

- Firecrawl content importer for external URLs
  - New `npm run import <url>` command
  - Scrapes URLs and converts to local markdown drafts
  - Creates drafts in `content/blog/` with frontmatter
  - Uses Firecrawl API (requires `FIRECRAWL_API_KEY` in `.env.local`)
  - Then sync to dev (`npm run sync`) or prod (`npm run sync:prod`)
  - No separate `import:prod` command needed (import creates local files only)
- New API endpoint `/api/export` for batch content fetching
  - Returns all posts with full markdown content
  - Single request for LLM ingestion
- AI plugin discovery at `/.well-known/ai-plugin.json`
  - Standard format for AI tool integration
- OpenAPI 3.0 specification at `/openapi.yaml`
  - Full API documentation
  - Describes all endpoints, parameters, and responses
- Enhanced `llms.txt` with complete API documentation
  - Added all new endpoints
  - Improved quick start section
  - Added response schema documentation

### Technical

- New script: `scripts/import-url.ts`
- New package dependency: `@mendable/firecrawl-js`
- Updated `netlify/edge-functions/api.ts` for `/api/export` proxy
- Updated `convex/http.ts` with export endpoint
- Created `public/.well-known/` directory

## [1.5.0] - 2025-12-17

### Added

- Frontmatter-controlled featured items
  - Add `featured: true` to any post or page frontmatter
  - Use `featuredOrder` to control display order (lower = first)
  - Featured items sync instantly with `npm run sync` (no redeploy needed)
- New Convex queries for featured content
  - `getFeaturedPosts`: returns posts with `featured: true`
  - `getFeaturedPages`: returns pages with `featured: true`
- Schema updates with `featured` and `featuredOrder` fields
  - Added `by_featured` index for efficient queries

### Changed

- Home.tsx now queries featured items from Convex instead of siteConfig
- FeaturedCards component uses Convex queries for real-time updates
- Removed hardcoded `featuredItems` and `featuredEssays` from siteConfig

### Technical

- Updated sync script to parse `featured` and `featuredOrder` from frontmatter
- Added index on `featured` field in posts and pages tables
- Both list and card views now use frontmatter data

## [1.4.0] - 2025-12-17

### Added

- Featured section with list/card view toggle
  - Card view displays title and excerpt in a responsive grid
  - Toggle button in featured header to switch between views
  - View preference saved to localStorage
- Logo gallery with continuous marquee scroll
  - Clickable logos with configurable URLs
  - CSS only animation for smooth infinite scrolling
  - Configurable speed, position, and title
  - Grayscale logos with color on hover
  - Responsive sizing across breakpoints
  - 5 sample logos included for easy customization
- New `excerpt` field for posts and pages frontmatter
  - Used for card view descriptions
  - Falls back to description field for posts
- Expanded `siteConfig` in Home.tsx
  - `featuredViewMode`: 'list' or 'cards'
  - `showViewToggle`: enable user toggle
  - `logoGallery`: full configuration object

### Technical

- New components: `FeaturedCards.tsx`, `LogoMarquee.tsx`
- Updated schema with optional excerpt field
- Updated sync script to parse excerpt from frontmatter
- CSS uses theme variables for all four themes
- Mobile responsive grid (3 to 2 to 1 columns for cards)

## [1.3.0] - 2025-12-17

### Added

- Real-time search with Command+K keyboard shortcut
  - Search icon in top nav using Phosphor Icons
  - Modal with keyboard navigation (arrow keys, Enter, Escape)
  - Full text search across posts and pages using Convex search indexes
  - Result snippets with context around search matches
  - Distinguishes between posts and pages with type badges
- Search indexes for pages table (title and content)
- New `@phosphor-icons/react` dependency for search icon

### Technical

- Uses Convex full text search with reactive queries
- Deduplicates results from title and content searches
- Sorts results with title matches first
- Mobile responsive modal design
- All four themes supported (dark, light, tan, cloud)

## [1.2.0] - 2025-12-15

### Added

- Real-time stats page at `/stats` with live visitor tracking
  - Active visitors count with per-page breakdown
  - Total page views and unique visitors
  - Views by page sorted by popularity
- Page view tracking via event records pattern (no write conflicts)
- Active session heartbeat system (30s interval, 2min timeout)
- Cron job for stale session cleanup every 5 minutes
- New Convex tables: `pageViews` and `activeSessions`
- Stats link in homepage footer

### Technical

- Uses anonymous session UUIDs (no PII stored)
- All stats update in real-time via Convex subscriptions
- Mobile responsive stats grid (4 to 2 to 1 columns)
- Theme support with CSS variables (dark, light, tan, cloud)

## [1.1.0] - 2025-12-14

### Added

- Netlify Edge Functions for dynamic Convex HTTP proxying
  - `rss.ts` proxies `/rss.xml` and `/rss-full.xml`
  - `sitemap.ts` proxies `/sitemap.xml`
  - `api.ts` proxies `/api/posts` and `/api/post`
- Vite dev server proxy for RSS, sitemap, and API endpoints

### Changed

- Replaced hardcoded Convex URLs in netlify.toml with edge functions
- Edge functions dynamically read `VITE_CONVEX_URL` from environment
- Updated setup guide, docs, and README with edge function documentation

### Fixed

- RSS feeds and sitemap now work without manual URL configuration
- Local development properly proxies API routes to Convex

## [1.0.0] - 2025-12-14

### Added

- Initial project setup with Vite, React, TypeScript
- Convex backend with posts, pages, viewCounts, and siteConfig tables
- Markdown blog post support with frontmatter parsing
- Static pages support (About, Projects, Contact) with navigation
- Four theme options: Dark, Light, Tan (default), Cloud
- Font configuration option in global.css with serif (New York) as default
- Syntax highlighting for code blocks using custom Prism themes
- Year-grouped post list on home page
- Individual post pages with share buttons
- SEO optimization with dynamic sitemap at `/sitemap.xml`
- JSON-LD structured data injection for blog posts
- RSS feeds at `/rss.xml` and `/rss-full.xml` (full content for LLMs)
- AI agent discovery with `llms.txt` following llmstxt.org standard
- `robots.txt` with rules for AI crawlers
- API endpoints for LLM access:
  - `/api/posts` - JSON list of all posts
  - `/api/post?slug=xxx` - Single post as JSON or markdown
- Copy Page dropdown for sharing to ChatGPT, Claude
- Open Graph and Twitter Card meta tags
- Netlify edge function for social media crawler detection
- Build-time markdown sync from `content/blog/` to Convex
- Responsive design for mobile, tablet, and desktop

### Security

- All HTTP endpoints properly escape HTML and XML output
- Convex queries use indexed lookups
- External links use rel="noopener noreferrer"
- No console statements in production code

### Technical Details

- React 18 with TypeScript
- Convex for real-time database
- react-markdown for rendering
- react-syntax-highlighter for code blocks
- date-fns for date formatting
- lucide-react for icons
- Netlify deployment with edge functions
- SPA 404 fallback configured
