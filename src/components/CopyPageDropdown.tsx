import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, MessageSquare, Sparkles, Search, Check, AlertCircle, FileText, Download } from "lucide-react";

// Maximum URL length for query parameters (conservative limit)
const MAX_URL_LENGTH = 6000;

// AI service configurations
interface AIService {
  id: string;
  name: string;
  icon: typeof Copy;
  baseUrl: string;
  description: string;
  supportsUrlPrefill: boolean;
  // Custom URL builder for services with special formats
  buildUrl?: (prompt: string) => string;
}

// All services send the full markdown content directly
const AI_SERVICES: AIService[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: MessageSquare,
    baseUrl: "https://chatgpt.com/",
    description: "Analyze with ChatGPT",
    supportsUrlPrefill: true,
    // ChatGPT accepts ?q= with full text content
    buildUrl: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "claude",
    name: "Claude",
    icon: Sparkles,
    baseUrl: "https://claude.ai/new",
    description: "Analyze with Claude",
    supportsUrlPrefill: true,
    buildUrl: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    icon: Search,
    baseUrl: "https://www.perplexity.ai/search",
    description: "Research with Perplexity",
    supportsUrlPrefill: true,
    buildUrl: (prompt) => `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`,
  },
];

// Extended props interface with optional metadata
interface CopyPageDropdownProps {
  title: string;
  content: string;
  url: string;
  slug: string;
  description?: string;
  date?: string;
  tags?: string[];
  readTime?: string;
}

// Enhanced markdown format for better LLM parsing
function formatAsMarkdown(props: CopyPageDropdownProps): string {
  const { title, content, url, description, date, tags, readTime } = props;
  
  // Build metadata section
  const metadataLines: string[] = [];
  metadataLines.push(`Source: ${url}`);
  if (date) metadataLines.push(`Date: ${date}`);
  if (readTime) metadataLines.push(`Reading time: ${readTime}`);
  if (tags && tags.length > 0) metadataLines.push(`Tags: ${tags.join(", ")}`);
  
  // Build the full markdown document
  let markdown = `# ${title}\n\n`;
  
  // Add description if available
  if (description) {
    markdown += `> ${description}\n\n`;
  }
  
  // Add metadata block
  markdown += `---\n${metadataLines.join("\n")}\n---\n\n`;
  
  // Add main content
  markdown += content;
  
  return markdown;
}

// Generate a valid skill name (lowercase, hyphens, max 64 chars)
function generateSkillName(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

// Format content as an Anthropic Agent Skill file (SKILL.md format)
// Follows: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
function formatAsSkill(props: CopyPageDropdownProps): string {
  const { title, content, slug, description, tags } = props;
  
  // Generate compliant skill name
  const skillName = generateSkillName(slug);
  
  // Build description with "when to use" triggers (max 1024 chars)
  const tagList = tags && tags.length > 0 ? tags.join(", ") : "";
  let skillDescription = description || `Guide about ${title.toLowerCase()}.`;
  
  // Add usage triggers to description
  if (tagList) {
    skillDescription += ` Use when working with ${tagList.toLowerCase()} or when asked about ${title.toLowerCase()}.`;
  } else {
    skillDescription += ` Use when asked about ${title.toLowerCase()}.`;
  }
  
  // Truncate description if needed (max 1024 chars)
  if (skillDescription.length > 1024) {
    skillDescription = skillDescription.slice(0, 1021) + "...";
  }
  
  // Build YAML frontmatter (required by Agent Skills spec)
  let skill = `---\n`;
  skill += `name: ${skillName}\n`;
  skill += `description: ${skillDescription}\n`;
  skill += `---\n\n`;
  
  // Add title
  skill += `# ${title}\n\n`;
  
  // Add instructions section
  skill += `## Instructions\n\n`;
  skill += content;
  
  // Add examples section placeholder if content doesn't include examples
  if (!content.toLowerCase().includes("## example")) {
    skill += `\n\n## Examples\n\n`;
    skill += `Use this skill when the user asks about topics covered in this guide.\n`;
  }
  
  return skill;
}

// Check if URL length exceeds safe limits
function isUrlTooLong(url: string): boolean {
  return url.length > MAX_URL_LENGTH;
}

// Feedback state type
type FeedbackState = "idle" | "copied" | "error" | "url-too-long";

export default function CopyPageDropdown(props: CopyPageDropdownProps) {
  const { title } = props;
  
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Clear feedback after delay
  const clearFeedback = useCallback(() => {
    setTimeout(() => {
      setFeedback("idle");
      setFeedbackMessage("");
    }, 2000);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    function handleKeyDown(event: KeyboardEvent) {
      const menu = menuRef.current;
      if (!menu) return;

      const items = menu.querySelectorAll<HTMLButtonElement>(".copy-page-item");
      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement
      );

      switch (event.key) {
        case "Escape":
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
          } else {
            items[0].focus();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1].focus();
          } else {
            items[items.length - 1].focus();
          }
          break;
        case "Home":
          event.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case "Tab":
          // Close dropdown on tab out
          if (!event.shiftKey && currentIndex === items.length - 1) {
            setIsOpen(false);
          }
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus first item when dropdown opens
  useEffect(() => {
    if (isOpen && firstItemRef.current) {
      // Small delay to ensure menu is rendered
      setTimeout(() => firstItemRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Safe clipboard write with error handling
  const writeToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers or permission issues
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return true;
      } catch {
        console.error("Failed to copy to clipboard:", error);
        return false;
      }
    }
  };

  // Handle copy page action with error handling
  const handleCopyPage = async () => {
    const markdown = formatAsMarkdown(props);
    const success = await writeToClipboard(markdown);
    
    if (success) {
      setFeedback("copied");
      setFeedbackMessage("Copied!");
    } else {
      setFeedback("error");
      setFeedbackMessage("Failed to copy");
    }
    
    clearFeedback();
    setTimeout(() => setIsOpen(false), 1500);
  };

  // Generic handler for opening AI services
  // All services receive the full markdown content directly
  // IMPORTANT: window.open must happen BEFORE any await to avoid popup blockers
  const handleOpenInAI = async (service: AIService) => {
    const markdown = formatAsMarkdown(props);
    const prompt = `Please analyze this article:\n\n${markdown}`;
    
    // Build the target URL using the service's buildUrl function
    if (!service.buildUrl) {
      // Fallback: open base URL FIRST (sync), then copy to clipboard
      window.open(service.baseUrl, "_blank");
      const success = await writeToClipboard(markdown);
      if (success) {
        setFeedback("url-too-long");
        setFeedbackMessage("Copied! Paste in " + service.name);
      } else {
        setFeedback("error");
        setFeedbackMessage("Failed to copy content");
      }
      clearFeedback();
      return;
    }
    
    const targetUrl = service.buildUrl(prompt);
    
    // Check URL length - if too long, open base URL then copy to clipboard
    if (isUrlTooLong(targetUrl)) {
      // Open window FIRST (must be sync to avoid popup blocker)
      window.open(service.baseUrl, "_blank");
      const success = await writeToClipboard(markdown);
      if (success) {
        setFeedback("url-too-long");
        setFeedbackMessage("Copied! Paste in " + service.name);
      } else {
        setFeedback("error");
        setFeedbackMessage("Failed to copy content");
      }
      clearFeedback();
    } else {
      // URL is within limits, open directly with prefilled content
      window.open(targetUrl, "_blank");
      setIsOpen(false);
    }
  };

  // Handle download skill file (Anthropic Agent Skills format)
  const handleDownloadSkill = () => {
    const skillContent = formatAsSkill(props);
    const blob = new Blob([skillContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download as SKILL.md
    const link = document.createElement("a");
    link.href = url;
    link.download = "SKILL.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    URL.revokeObjectURL(url);
    
    setFeedback("copied");
    setFeedbackMessage("Downloaded!");
    clearFeedback();
    setTimeout(() => setIsOpen(false), 1500);
  };

  // Get feedback icon
  const getFeedbackIcon = () => {
    switch (feedback) {
      case "copied":
        return <Check size={16} className="copy-page-icon feedback-success" />;
      case "error":
        return <AlertCircle size={16} className="copy-page-icon feedback-error" />;
      case "url-too-long":
        return <Check size={16} className="copy-page-icon feedback-warning" />;
      default:
        return <Copy size={16} className="copy-page-icon" />;
    }
  };

  return (
    <div className="copy-page-dropdown" ref={dropdownRef}>
      {/* Trigger button with ARIA attributes */}
      <button
        ref={triggerRef}
        className="copy-page-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="copy-page-menu"
        aria-label={`Copy or share: ${title}`}
      >
        <Copy size={14} aria-hidden="true" />
        <span>Copy page</span>
        <svg
          className={`dropdown-chevron ${isOpen ? "open" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2.5 4L5 6.5L7.5 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown menu with ARIA role */}
      {isOpen && (
        <div
          ref={menuRef}
          id="copy-page-menu"
          className="copy-page-menu"
          role="menu"
          aria-label="Copy and share options"
        >
          {/* Copy page option */}
          <button
            ref={firstItemRef}
            className="copy-page-item"
            onClick={handleCopyPage}
            role="menuitem"
            tabIndex={0}
          >
            {getFeedbackIcon()}
            <div className="copy-page-item-content">
              <span className="copy-page-item-title">
                {feedback !== "idle" ? feedbackMessage : "Copy page"}
              </span>
              <span className="copy-page-item-desc">
                Copy as Markdown for LLMs
              </span>
            </div>
          </button>

          {/* AI service options */}
          {AI_SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                className="copy-page-item"
                onClick={() => handleOpenInAI(service)}
                role="menuitem"
                tabIndex={0}
              >
                <Icon size={16} className="copy-page-icon" aria-hidden="true" />
                <div className="copy-page-item-content">
                  <span className="copy-page-item-title">
                    Open in {service.name}
                    <span className="external-arrow" aria-hidden="true">↗</span>
                  </span>
                  <span className="copy-page-item-desc">
                    {service.description}
                  </span>
                </div>
              </button>
            );
          })}

          {/* View as Markdown option */}
          <button
            className="copy-page-item"
            onClick={() => {
              window.open(`/raw/${props.slug}.md`, "_blank");
              setIsOpen(false);
            }}
            role="menuitem"
            tabIndex={0}
          >
            <FileText size={16} className="copy-page-icon" aria-hidden="true" />
            <div className="copy-page-item-content">
              <span className="copy-page-item-title">
                View as Markdown
                <span className="external-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="copy-page-item-desc">
                Open raw .md file
              </span>
            </div>
          </button>

          {/* Download as SKILL.md option (Anthropic Agent Skills format) */}
          <button
            className="copy-page-item"
            onClick={handleDownloadSkill}
            role="menuitem"
            tabIndex={0}
          >
            <Download size={16} className="copy-page-icon" aria-hidden="true" />
            <div className="copy-page-item-content">
              <span className="copy-page-item-title">
                Download as SKILL.md
              </span>
              <span className="copy-page-item-desc">
                Anthropic Agent Skills format
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
