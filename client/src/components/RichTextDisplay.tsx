import DOMPurify from "dompurify";
import { useMemo } from "react";

interface RichTextDisplayProps {
  html: string;
  className?: string;
  testId?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isLikelyHtml(input: string): boolean {
  return /<[a-zA-Z!\/]/.test(input);
}

function plainTextToHtml(input: string): string {
  return escapeHtml(input).replace(/\r?\n/g, "<br>");
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "span", "div",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "style", "class"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
};

export default function RichTextDisplay({ html, className, testId }: RichTextDisplayProps) {
  const safeHtml = useMemo(() => {
    if (!html) return "";
    const source = isLikelyHtml(html) ? html : plainTextToHtml(html);
    const cleaned = DOMPurify.sanitize(source, SANITIZE_CONFIG);
    if (typeof document !== "undefined") {
      const tmp = document.createElement("div");
      tmp.innerHTML = cleaned;
      tmp.querySelectorAll("a[href^='http']").forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
      return tmp.innerHTML;
    }
    return cleaned;
  }, [html]);

  if (!html) return null;

  return (
    <div
      className={className}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
