# How stats work

This document explains the real-time analytics system for the markdown site.

## Overview

The stats page at `/stats` shows live visitor data and page view counts. All stats update automatically via Convex subscriptions. No page refresh required.

## Data flow

1. Visitor loads any page
2. `usePageTracking` hook fires on mount and path change
3. Page view event recorded to `pageViews` table
4. Session heartbeat sent to `activeSessions` table
5. Stats page queries both tables and displays results

## Database tables

### pageViews

Stores individual view events. Uses the event records pattern to avoid write conflicts.

| Field | Type | Purpose |
|-------|------|---------|
| path | string | URL path visited |
| pageType | string | "home", "blog", "page", or "stats" |
| sessionId | string | Anonymous UUID per browser |
| timestamp | number | Unix timestamp of visit |

Indexes:
- `by_path` for filtering by page
- `by_timestamp` for ordering
- `by_session_path` for deduplication

### activeSessions

Tracks who is currently on the site. Sessions expire after 2 minutes without a heartbeat.

| Field | Type | Purpose |
|-------|------|---------|
| sessionId | string | Anonymous UUID per browser |
| currentPath | string | Page visitor is currently viewing |
| lastSeen | number | Last heartbeat timestamp |

Indexes:
- `by_sessionId` for upserts
- `by_lastSeen` for cleanup queries

## Frontend tracking

The `usePageTracking` hook in `src/hooks/usePageTracking.ts` handles all client-side tracking.

### Session ID generation

Each browser gets a persistent UUID stored in localStorage. No cookies, no PII.

```typescript
const SESSION_ID_KEY = "markdown_blog_session_id";

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}
```

### Page view recording

Records a view when the URL path changes. Deduplication happens server-side.

```typescript
useEffect(() => {
  const path = location.pathname;
  if (lastRecordedPath.current !== path) {
    lastRecordedPath.current = path;
    recordPageView({ path, pageType: getPageType(path), sessionId });
  }
}, [location.pathname, recordPageView]);
```

### Heartbeat system

Sends a ping every 30 seconds while the page is open. This powers the "Active Now" count.

Uses refs to prevent duplicate calls and avoid write conflicts:

```typescript
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const HEARTBEAT_DEBOUNCE_MS = 5 * 1000;

// Track heartbeat state to prevent duplicate calls
const isHeartbeatPending = useRef(false);
const lastHeartbeatTime = useRef(0);
const lastHeartbeatPath = useRef<string | null>(null);

const sendHeartbeat = useCallback(
  async (path: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const now = Date.now();

    // Skip if heartbeat is already pending
    if (isHeartbeatPending.current) {
      return;
    }

    // Skip if same path and sent recently (debounce)
    if (
      lastHeartbeatPath.current === path &&
      now - lastHeartbeatTime.current < HEARTBEAT_DEBOUNCE_MS
    ) {
      return;
    }

    isHeartbeatPending.current = true;
    lastHeartbeatTime.current = now;
    lastHeartbeatPath.current = path;

    try {
      await heartbeatMutation({ sessionId, currentPath: path });
    } catch {
      // Silently fail
    } finally {
      isHeartbeatPending.current = false;
    }
  },
  [heartbeatMutation],
);

useEffect(() => {
  const path = location.pathname;
  sendHeartbeat(path);

  const intervalId = setInterval(() => {
    sendHeartbeat(path);
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(intervalId);
}, [location.pathname, sendHeartbeat]);
```

## Backend mutations

### recordPageView

Located in `convex/stats.ts`. Records view events with deduplication.

Deduplication window: 30 minutes. Same session viewing same path within 30 minutes counts as 1 view.

```typescript
export const recordPageView = mutation({
  args: {
    path: v.string(),
    pageType: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const dedupCutoff = Date.now() - DEDUP_WINDOW_MS;

    const recentView = await ctx.db
      .query("pageViews")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .order("desc")
      .first();

    if (recentView && recentView.timestamp > dedupCutoff) {
      return null;
    }

    await ctx.db.insert("pageViews", {
      path: args.path,
      pageType: args.pageType,
      sessionId: args.sessionId,
      timestamp: Date.now(),
    });

    return null;
  },
});
```

### heartbeat

Creates or updates a session record. Uses indexed lookup for upsert with a 10-second dedup window to prevent write conflicts.

```typescript
const HEARTBEAT_DEDUP_MS = 10 * 1000;

export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    currentPath: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    const existingSession = await ctx.db
      .query("activeSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existingSession) {
      // Early return if same path and recently updated (idempotent)
      if (
        existingSession.currentPath === args.currentPath &&
        now - existingSession.lastSeen < HEARTBEAT_DEDUP_MS
      ) {
        return null;
      }

      await ctx.db.patch(existingSession._id, {
        currentPath: args.currentPath,
        lastSeen: now,
      });
      return null;
    }

    await ctx.db.insert("activeSessions", {
      sessionId: args.sessionId,
      currentPath: args.currentPath,
      lastSeen: now,
    });

    return null;
  },
});
```

## Backend query

### getStats

Returns all stats for the `/stats` page. Single query, real-time subscription.

What it returns:

| Field | Type | Description |
|-------|------|-------------|
| activeVisitors | number | Sessions with heartbeat in last 2 minutes |
| activeByPath | array | Breakdown of active visitors by current page |
| totalPageViews | number | All recorded views since tracking started |
| uniqueVisitors | number | Count of distinct session IDs |
| publishedPosts | number | Blog posts with `published: true` |
| publishedPages | number | Static pages with `published: true` |
| trackingSince | number or null | Timestamp of earliest view event |
| pageStats | array | Views per page with title and type |

### Title matching

The query matches URL paths to post/page titles by slug:

```typescript
const slug = path.startsWith("/") ? path.slice(1) : path;
const post = posts.find((p) => p.slug === slug);
const page = pages.find((p) => p.slug === slug);

if (post) {
  title = post.title;
  pageType = "blog";
} else if (page) {
  title = page.title;
  pageType = "page";
}
```

## Cleanup cron

Stale sessions are cleaned up every 5 minutes via cron job in `convex/crons.ts`.

```typescript
crons.interval(
  "cleanup stale sessions",
  { minutes: 5 },
  internal.stats.cleanupStaleSessions,
  {}
);
```

The cleanup mutation deletes sessions older than 2 minutes:

```typescript
const cutoff = Date.now() - SESSION_TIMEOUT_MS;
const staleSessions = await ctx.db
  .query("activeSessions")
  .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
  .collect();

await Promise.all(staleSessions.map((s) => ctx.db.delete(s._id)));
```

## How new content appears in stats

When you add a new markdown post or page and sync it to Convex:

1. **Post/page counts update instantly.** The `publishedPosts` and `publishedPages` values come from live queries to the `posts` and `pages` tables.

2. **Views appear after first visit.** A page only shows in "Views by Page" after someone visits it.

3. **Titles resolve automatically.** The `getStats` query matches paths to slugs, so new content gets its proper title displayed.

No manual configuration required. Sync content, and stats track it.

## Privacy

- No cookies
- No PII stored
- Session IDs are random UUIDs
- No IP addresses logged
- No fingerprinting
- Data stays in your Convex deployment

## Configuration constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| DEDUP_WINDOW_MS | 30 minutes | convex/stats.ts | Page view deduplication |
| SESSION_TIMEOUT_MS | 2 minutes | convex/stats.ts | Active session expiry |
| HEARTBEAT_DEDUP_MS | 10 seconds | convex/stats.ts | Backend idempotency window |
| HEARTBEAT_INTERVAL_MS | 30 seconds | src/hooks/usePageTracking.ts | Client heartbeat frequency |
| HEARTBEAT_DEBOUNCE_MS | 5 seconds | src/hooks/usePageTracking.ts | Frontend debounce window |

## Files involved

| File | Purpose |
|------|---------|
| `convex/stats.ts` | All stats mutations and queries |
| `convex/schema.ts` | Table definitions for pageViews and activeSessions |
| `convex/crons.ts` | Scheduled cleanup job |
| `src/hooks/usePageTracking.ts` | Client-side tracking hook |
| `src/pages/Stats.tsx` | Stats page UI |

## Write conflict prevention

The stats system uses several patterns to avoid write conflicts in the `activeSessions` table:

**Backend (convex/stats.ts):**
- 10-second dedup window: skips updates if session was recently updated with same path
- Indexed queries: uses `by_sessionId` index for efficient lookups
- Early returns: mutation is idempotent and safe to call multiple times

**Frontend (src/hooks/usePageTracking.ts):**
- 5-second debounce: prevents rapid duplicate calls from the same tab
- Pending state ref: blocks overlapping async calls
- Path tracking ref: skips redundant heartbeats for same path

See `prds/howtoavoidwriteconflicts.md` for the full implementation details.

## Related documentation

- [Convex event records pattern](https://docs.convex.dev/understanding/best-practices/)
- [Preventing write conflicts](https://docs.convex.dev/error#1)
- [Optimistic concurrency control](https://docs.convex.dev/database/advanced/occ)

