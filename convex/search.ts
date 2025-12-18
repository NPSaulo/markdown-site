import { query } from "./_generated/server";
import { v } from "convex/values";

// Search result type for both posts and pages
const searchResultValidator = v.object({
  _id: v.string(),
  type: v.union(v.literal("post"), v.literal("page")),
  slug: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  snippet: v.string(),
});

// Search across posts and pages
export const search = query({
  args: {
    query: v.string(),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    // Return empty results for empty queries
    if (!args.query.trim()) {
      return [];
    }

    const results: Array<{
      _id: string;
      type: "post" | "page";
      slug: string;
      title: string;
      description?: string;
      snippet: string;
    }> = [];

    // Search posts by title
    const postsByTitle = await ctx.db
      .query("posts")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("published", true)
      )
      .take(10);

    // Search posts by content
    const postsByContent = await ctx.db
      .query("posts")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("published", true)
      )
      .take(10);

    // Search pages by title
    const pagesByTitle = await ctx.db
      .query("pages")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("published", true)
      )
      .take(10);

    // Search pages by content
    const pagesByContent = await ctx.db
      .query("pages")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("published", true)
      )
      .take(10);

    // Deduplicate and process post results
    const seenPostIds = new Set<string>();
    for (const post of [...postsByTitle, ...postsByContent]) {
      if (seenPostIds.has(post._id)) continue;
      seenPostIds.add(post._id);

      // Create snippet from content
      const snippet = createSnippet(post.content, args.query, 120);

      results.push({
        _id: post._id,
        type: "post" as const,
        slug: post.slug,
        title: post.title,
        description: post.description,
        snippet,
      });
    }

    // Deduplicate and process page results
    const seenPageIds = new Set<string>();
    for (const page of [...pagesByTitle, ...pagesByContent]) {
      if (seenPageIds.has(page._id)) continue;
      seenPageIds.add(page._id);

      // Create snippet from content
      const snippet = createSnippet(page.content, args.query, 120);

      results.push({
        _id: page._id,
        type: "page" as const,
        slug: page.slug,
        title: page.title,
        snippet,
      });
    }

    // Sort results: title matches first, then by relevance
    const queryLower = args.query.toLowerCase();
    results.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(queryLower);
      const bInTitle = b.title.toLowerCase().includes(queryLower);
      if (aInTitle && !bInTitle) return -1;
      if (!aInTitle && bInTitle) return 1;
      return 0;
    });

    // Limit to top 15 results
    return results.slice(0, 15);
  },
});

// Helper to create a snippet around the search term
function createSnippet(
  content: string,
  searchTerm: string,
  maxLength: number
): string {
  // Remove markdown syntax for cleaner snippets
  const cleanContent = content
    .replace(/#{1,6}\s/g, "") // Headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Images
    .replace(/\n+/g, " ") // Newlines to spaces
    .replace(/\s+/g, " ") // Multiple spaces to single
    .trim();

  const lowerContent = cleanContent.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  const index = lowerContent.indexOf(lowerSearchTerm);

  if (index === -1) {
    // Term not found, return beginning of content
    return cleanContent.slice(0, maxLength) + (cleanContent.length > maxLength ? "..." : "");
  }

  // Calculate start position to center the search term
  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(cleanContent.length, start + maxLength);

  let snippet = cleanContent.slice(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = "..." + snippet;
  if (end < cleanContent.length) snippet = snippet + "...";

  return snippet;
}

