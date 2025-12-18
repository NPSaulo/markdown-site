import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MagnifyingGlass } from "@phosphor-icons/react";
import ThemeToggle from "./ThemeToggle";
import SearchModal from "./SearchModal";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Fetch published pages for navigation
  const pages = useQuery(api.pages.getAllPages);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Open search modal
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Close search modal
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Handle Command+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      // Also close on Escape
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  return (
    <div className="layout">
      {/* Top navigation bar with page links, search, and theme toggle */}
      <div className="top-nav">
        {/* Page navigation links (optional pages like About, Projects, Contact) */}
        {pages && pages.length > 0 && (
          <nav className="page-nav">
            {pages.map((page) => (
              <Link
                key={page.slug}
                to={`/${page.slug}`}
                className="page-nav-link"
              >
                {page.title}
              </Link>
            ))}
          </nav>
        )}
        {/* Search button with icon */}
        <button
          onClick={openSearch}
          className="search-button"
          aria-label="Search (⌘K)"
          title="Search (⌘K)"
        >
          <MagnifyingGlass size={18} weight="bold" />
        </button>
        {/* Theme toggle */}
        <div className="theme-toggle-container">
          <ThemeToggle />
        </div>
      </div>

      <main className="main-content">{children}</main>

      {/* Search modal */}
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </div>
  );
}
