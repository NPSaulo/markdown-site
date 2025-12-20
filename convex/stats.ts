import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";

// Deduplication window: 30 minutes in milliseconds
const DEDUP_WINDOW_MS = 30 * 60 * 1000;

// Session timeout: 2 minutes in milliseconds
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;

// Heartbeat dedup window: 10 seconds (prevents write conflicts from rapid calls)
const HEARTBEAT_DEDUP_MS = 10 * 1000;

/**
 * Aggregate for page views by path.
 * Provides O(log n) counts instead of O(n) full table scans.
 * Namespace by path to get per-page view counts efficiently.
 */
const pageViewsByPath = new TableAggregate<{
  Namespace: string; // path
  Key: number; // timestamp
  DataModel: DataModel;
  TableName: "pageViews";
}>(components.pageViewsByPath, {
  namespace: (doc) => doc.path,
  sortKey: (doc) => doc.timestamp,
});

/**
 * Aggregate for total page views.
 * Key is null since we only need a global count.
 */
const totalPageViews = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "pageViews";
}>(components.totalPageViews, {
  sortKey: () => null,
});

/**
 * Aggregate for unique visitors.
 * Uses sessionId as key to count distinct sessions.
 * Each session only counted once (first occurrence).
 */
const uniqueVisitors = new TableAggregate<{
  Key: string; // sessionId
  DataModel: DataModel;
  TableName: "pageViews";
}>(components.uniqueVisitors, {
  sortKey: (doc) => doc.sessionId,
});

/**
 * Record a page view event.
 * Idempotent: same session viewing same path within 30min = 1 view.
 * Updates aggregate components for efficient O(log n) counts.
 */
export const recordPageView = mutation({
  args: {
    path: v.string(),
    pageType: v.string(),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const dedupCutoff = now - DEDUP_WINDOW_MS;

    // Check for recent view from same session on same path
    const recentView = await ctx.db
      .query("pageViews")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", args.sessionId).eq("path", args.path)
      )
      .order("desc")
      .first();

    // Early return if already viewed within dedup window
    if (recentView && recentView.timestamp > dedupCutoff) {
      return null;
    }

    // Check if this is a new unique visitor (first page view for this session)
    const existingSessionView = await ctx.db
      .query("pageViews")
      .withIndex("by_session_path", (q) => q.eq("sessionId", args.sessionId))
      .first();
    const isNewVisitor = !existingSessionView;

    // Insert new view event
    const id = await ctx.db.insert("pageViews", {
      path: args.path,
      pageType: args.pageType,
      sessionId: args.sessionId,
      timestamp: now,
    });
    const doc = await ctx.db.get(id);

    // Update aggregates with the new page view
    if (doc) {
      await pageViewsByPath.insertIfDoesNotExist(ctx, doc);
      await totalPageViews.insertIfDoesNotExist(ctx, doc);
      // Only insert into unique visitors aggregate if this is a new session
      if (isNewVisitor) {
        await uniqueVisitors.insertIfDoesNotExist(ctx, doc);
      }
    }

    return null;
  },
});

/**
 * Update active session heartbeat.
 * Creates or updates session with current path and timestamp.
 * Idempotent: skips update if recently updated with same path (prevents write conflicts).
 */
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    currentPath: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing session by sessionId using index
    const existingSession = await ctx.db
      .query("activeSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existingSession) {
      // Early return if same path and recently updated (idempotent - prevents write conflicts)
      if (
        existingSession.currentPath === args.currentPath &&
        now - existingSession.lastSeen < HEARTBEAT_DEDUP_MS
      ) {
        return null;
      }

      // Patch directly with new data
      await ctx.db.patch(existingSession._id, {
        currentPath: args.currentPath,
        lastSeen: now,
      });
      return null;
    }

    // Create new session only if none exists
    await ctx.db.insert("activeSessions", {
      sessionId: args.sessionId,
      currentPath: args.currentPath,
      lastSeen: now,
    });

    return null;
  },
});

/**
 * Get all stats for the stats page.
 * Real-time subscription via useQuery.
 * Uses aggregate components for O(log n) counts instead of O(n) table scans.
 */
export const getStats = query({
  args: {},
  returns: v.object({
    activeVisitors: v.number(),
    activeByPath: v.array(
      v.object({
        path: v.string(),
        count: v.number(),
      })
    ),
    totalPageViews: v.number(),
    uniqueVisitors: v.number(),
    publishedPosts: v.number(),
    publishedPages: v.number(),
    trackingSince: v.union(v.number(), v.null()),
    pageStats: v.array(
      v.object({
        path: v.string(),
        title: v.string(),
        pageType: v.string(),
        views: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const sessionCutoff = now - SESSION_TIMEOUT_MS;

    // Get active sessions (heartbeat within last 2 minutes)
    const activeSessions = await ctx.db
      .query("activeSessions")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeen", sessionCutoff))
      .collect();

    // Count active visitors by path
    const activeByPathMap: Record<string, number> = {};
    for (const session of activeSessions) {
      activeByPathMap[session.currentPath] =
        (activeByPathMap[session.currentPath] || 0) + 1;
    }
    const activeByPath = Object.entries(activeByPathMap)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);

    // Get all page views for direct counting (always accurate)
    // We use direct counting until aggregates are fully backfilled
    const allPageViews = await ctx.db.query("pageViews").collect();
    const totalPageViewsCount = allPageViews.length;
    
    // Count unique sessions from the views
    const uniqueSessions = new Set(allPageViews.map((v) => v.sessionId));
    const uniqueVisitorsCount = uniqueSessions.size;
    
    // Count views per path from the raw data
    const pathCountsFromDb: Record<string, number> = {};
    for (const view of allPageViews) {
      pathCountsFromDb[view.path] = (pathCountsFromDb[view.path] || 0) + 1;
    }
    const allPaths = Object.keys(pathCountsFromDb);

    // Get earliest page view for tracking since date (single doc fetch)
    const firstView = await ctx.db
      .query("pageViews")
      .withIndex("by_timestamp")
      .order("asc")
      .first();
    const trackingSince = firstView ? firstView.timestamp : null;

    // Get published posts and pages for titles
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    // Build page stats using direct counts (always accurate)
    const pageStatsPromises = allPaths.map(async (path) => {
      const views = pathCountsFromDb[path] || 0;
      
      // Match path to post or page for title
      const slug = path.startsWith("/") ? path.slice(1) : path;
      const post = posts.find((p) => p.slug === slug);
      const page = pages.find((p) => p.slug === slug);

      let title = path;
      let pageType = "other";

      if (path === "/" || path === "") {
        title = "Home";
        pageType = "home";
      } else if (path === "/stats") {
        title = "Stats";
        pageType = "stats";
      } else if (post) {
        title = post.title;
        pageType = "blog";
      } else if (page) {
        title = page.title;
        pageType = "page";
      }

      return {
        path,
        title,
        pageType,
        views,
      };
    });

    const pageStats = (await Promise.all(pageStatsPromises)).sort(
      (a, b) => b.views - a.views
    );

    return {
      activeVisitors: activeSessions.length,
      activeByPath,
      totalPageViews: totalPageViewsCount,
      uniqueVisitors: uniqueVisitorsCount,
      publishedPosts: posts.length,
      publishedPages: pages.length,
      trackingSince,
      pageStats,
    };
  },
});

/**
 * Internal mutation to clean up stale sessions.
 * Called by cron job every 5 minutes.
 */
export const cleanupStaleSessions = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - SESSION_TIMEOUT_MS;

    // Get all stale sessions
    const staleSessions = await ctx.db
      .query("activeSessions")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
      .collect();

    // Delete in parallel
    await Promise.all(staleSessions.map((session) => ctx.db.delete(session._id)));

    return staleSessions.length;
  },
});

// Batch size for chunked backfilling (keeps memory usage under 16MB limit)
const BACKFILL_BATCH_SIZE = 500;

/**
 * Internal mutation to backfill aggregates in chunks.
 * Processes BACKFILL_BATCH_SIZE records at a time to avoid memory limits.
 * Schedules itself to continue with the next batch until complete.
 */
export const backfillAggregatesChunk = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    totalProcessed: v.number(),
    seenSessionIds: v.array(v.string()),
  },
  returns: v.object({
    status: v.union(v.literal("in_progress"), v.literal("complete")),
    processed: v.number(),
    uniqueSessions: v.number(),
    cursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Paginate through pageViews in batches
    const result = await ctx.db
      .query("pageViews")
      .paginate({ numItems: BACKFILL_BATCH_SIZE, cursor: args.cursor });

    // Track unique sessions (restore from previous chunks)
    const seenSessions = new Set<string>(args.seenSessionIds);
    let uniqueCount = 0;

    // Process each view in this batch
    for (const doc of result.page) {
      // Insert into pageViewsByPath aggregate (one per view)
      await pageViewsByPath.insertIfDoesNotExist(ctx, doc);

      // Insert into totalPageViews aggregate (one per view)
      await totalPageViews.insertIfDoesNotExist(ctx, doc);

      // Insert into uniqueVisitors aggregate (one per session)
      if (!seenSessions.has(doc.sessionId)) {
        seenSessions.add(doc.sessionId);
        await uniqueVisitors.insertIfDoesNotExist(ctx, doc);
        uniqueCount++;
      }
    }

    const newTotalProcessed = args.totalProcessed + result.page.length;

    // If there are more records, schedule the next chunk
    if (!result.isDone) {
      // Convert Set to array for passing to next chunk (limited to prevent arg size issues)
      // Only keep the last 10000 session IDs to prevent argument size explosion
      const sessionArray = Array.from(seenSessions).slice(-10000);

      await ctx.scheduler.runAfter(
        0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (await import("./_generated/api")).internal.stats.backfillAggregatesChunk as any,
        {
          cursor: result.continueCursor,
          totalProcessed: newTotalProcessed,
          seenSessionIds: sessionArray,
        }
      );

      return {
        status: "in_progress" as const,
        processed: newTotalProcessed,
        uniqueSessions: seenSessions.size,
        cursor: result.continueCursor,
      };
    }

    // Backfilling complete
    return {
      status: "complete" as const,
      processed: newTotalProcessed,
      uniqueSessions: seenSessions.size,
      cursor: null,
    };
  },
});

/**
 * Start backfilling aggregates from existing pageViews data.
 * This kicks off the chunked backfill process.
 * Safe to call multiple times (uses insertIfDoesNotExist).
 */
export const backfillAggregates = internalMutation({
  args: {},
  returns: v.object({
    message: v.string(),
  }),
  handler: async (ctx) => {
    // Check if there are any pageViews to backfill
    const firstView = await ctx.db.query("pageViews").first();
    if (!firstView) {
      return { message: "No pageViews to backfill" };
    }

    // Start the chunked backfill process
    await ctx.scheduler.runAfter(
      0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("./_generated/api")).internal.stats.backfillAggregatesChunk as any,
      {
        cursor: null,
        totalProcessed: 0,
        seenSessionIds: [],
      }
    );

    return { message: "Backfill started. Check logs for progress." };
  },
});

