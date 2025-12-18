# Markdown Blog - Tasks

## Current Status

v1.3.0 ready for deployment. Build passes. TypeScript verified.

## Completed

- [x] Project setup with Vite + React + TypeScript
- [x] Convex schema for posts, viewCounts, siteConfig, pages
- [x] Build-time markdown sync script
- [x] Theme system (dark/light/tan/cloud)
- [x] Default theme configuration (tan)
- [x] Home page with year-grouped post list
- [x] Post page with markdown rendering
- [x] Static pages support (About, Projects, Contact)
- [x] Syntax highlighting for code blocks
- [x] Open Graph and Twitter Card meta tags
- [x] Netlify edge function for bot detection
- [x] RSS feed support (standard and full content)
- [x] API endpoints for LLMs (/api/posts, /api/post)
- [x] Copy Page dropdown for AI tools
- [x] Sample blog posts and pages
- [x] Security audit completed
- [x] TypeScript type-safety verification
- [x] Netlify build configuration verified
- [x] SPA 404 fallback configured
- [x] Mobile responsive design
- [x] Edge functions for dynamic Convex HTTP proxying
- [x] Vite dev server proxy for local development
- [x] Real-time stats page at /stats
- [x] Page view tracking with event records pattern
- [x] Active session heartbeat system
- [x] Cron job for stale session cleanup
- [x] Stats link in homepage footer
- [x] Real-time search with Command+K shortcut
- [x] Search modal with keyboard navigation
- [x] Full text search indexes for posts and pages

## Deployment Steps

1. Run `npx convex dev` to initialize Convex
2. Set `CONVEX_DEPLOY_KEY` in Netlify environment variables
3. Connect repo to Netlify and deploy
4. Edge functions automatically handle RSS, sitemap, and API routes

## Future Enhancements

- [ ] Related posts suggestions
- [ ] Newsletter signup
- [ ] Comments system
- [ ] Draft preview mode
- [ ] Image optimization
- [ ] Reading progress indicator
