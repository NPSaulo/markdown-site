import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top of page on route changes
 * Skips scroll if navigating to a hash anchor
 * Uses useLayoutEffect to run before browser paint
 */
export default function ScrollToTopOnNav() {
  const { pathname, hash } = useLocation();

  // useLayoutEffect runs synchronously before browser paint
  useLayoutEffect(() => {
    // Skip if navigating to a hash anchor
    if (hash) return;
    
    // Scroll to top immediately (before paint)
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
