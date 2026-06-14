import React from "react";

export function formatResponseText(text: string) {
  if (!text) return null;

  // Split into lines
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-xs font-mono select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Headings (e.g. ### Title or ## Title)
        if (trimmed.startsWith("###")) {
          return (
            <h4 key={idx} className="text-xs font-extrabold text-cyan-400 mt-2 font-mono uppercase tracking-wider">
              {parseBoldText(trimmed.replace(/^###\s*/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("##")) {
          return (
            <h3 key={idx} className="text-xs font-extrabold text-purple-400 mt-3 font-mono uppercase tracking-wider">
              {parseBoldText(trimmed.replace(/^##\s*/, ""))}
            </h3>
          );
        }

        // Bullet list items
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const bulletText = trimmed.replace(/^(\*\s*|-\s*|•\s*)/, "");
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-purple-400 select-none mt-0.5 font-bold">&bull;</span>
              <span className="text-white/90 leading-relaxed text-xs font-mono">
                {parseBoldText(bulletText)}
              </span>
            </div>
          );
        }

        // Numbered list items
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-cyan-400 select-none font-bold text-xs font-mono">{numMatch[1]}.</span>
              <span className="text-white/90 leading-relaxed text-xs font-mono">
                {parseBoldText(numMatch[2])}
              </span>
            </div>
          );
        }

        // Normal paragraphs
        return (
          <p key={idx} className="text-white/80 leading-relaxed text-xs font-mono">
            {parseBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function parseBoldText(text: string) {
  // Simple parser for **bold** text
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="text-cyan-300 font-extrabold">{part}</strong>;
    }
    return part;
  });
}

interface MarkdownFormatterProps {
  text: string;
}

export default function MarkdownFormatter({ text }: MarkdownFormatterProps) {
  return formatResponseText(text);
}
