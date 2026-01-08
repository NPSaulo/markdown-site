import { useState } from "react";
import { PatchDiff } from "@pierre/diffs/react";
import { Copy, Check, Columns2, AlignJustify } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// Map app themes to @pierre/diffs themeType
const THEME_MAP: Record<string, "dark" | "light"> = {
  dark: "dark",
  light: "light",
  tan: "light",
  cloud: "light",
};

interface DiffCodeBlockProps {
  code: string;
  language: "diff" | "patch";
}

export default function DiffCodeBlock({ code, language }: DiffCodeBlockProps) {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<"split" | "unified">("unified");
  const [copied, setCopied] = useState(false);

  // Get theme type for @pierre/diffs
  const themeType = THEME_MAP[theme] || "dark";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="diff-block-wrapper" data-theme-type={themeType}>
      <div className="diff-block-header">
        <span className="diff-language">{language}</span>
        <div className="diff-block-controls">
          <button
            className="diff-view-toggle"
            onClick={() =>
              setViewMode(viewMode === "split" ? "unified" : "split")
            }
            title={
              viewMode === "split"
                ? "Switch to unified view"
                : "Switch to split view"
            }
          >
            {viewMode === "split" ? (
              <AlignJustify size={14} />
            ) : (
              <Columns2 size={14} />
            )}
          </button>
          <button
            className="diff-copy-button"
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy code"}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <PatchDiff
        patch={code}
        options={{
          themeType,
          diffStyle: viewMode,
        }}
      />
    </div>
  );
}
