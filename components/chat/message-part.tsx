"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ChevronDown, Wrench, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type Part = {
  type: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
  [k: string]: unknown;
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-fynn">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ToolCall({ part }: { part: Part }) {
  const [open, setOpen] = useState(false);
  const name = part.toolName ?? part.type.replace(/^tool-/, "");
  const running = part.state === "input-streaming" || part.state === "input-available";
  const output = part.output as {
    url?: string;
    filename?: string;
    error?: string;
    results?: { imageUrl?: string; path?: string }[];
  } | undefined;
  const galleryImages = Array.isArray(output?.results)
    ? output.results.filter((result) => typeof result.imageUrl === "string").slice(0, 6)
    : [];

  return (
    <div className="my-2 rounded-lg border bg-muted/40 text-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-primary" />
        )}
        <span className="font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {running ? "bezig…" : part.state === "output-error" ? "fout" : "klaar"}
        </span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-3 py-2">
          {part.input != null && (
            <pre className="mb-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          )}
          {part.output != null && (
            <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(part.output, null, 2).slice(0, 4000)}
            </pre>
          )}
        </div>
      )}
      {!open && output?.url && (
        <div className="px-3 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={output.url} alt={output.filename ?? "generated"} className="max-w-md rounded-lg border" />
        </div>
      )}
      {galleryImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2 border-t px-3 py-3 sm:grid-cols-3">
          {galleryImages.map((result, i) => (
            <a
              key={`${result.imageUrl}-${i}`}
              href={result.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="overflow-hidden rounded-md border bg-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageUrl}
                alt={result.path ?? ""}
                className="h-28 w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageParts({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return <Markdown key={i} text={p.text ?? ""} />;
        if (p.type === "reasoning") {
          return (
            <details key={i} className="my-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <summary className="flex cursor-pointer items-center gap-2">
                <Brain className="h-3.5 w-3.5" /> Redenering
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-xs">{p.text}</p>
            </details>
          );
        }
        if (p.type === "step-start") return null;
        if (p.type.startsWith("tool-") || p.type === "dynamic-tool") return <ToolCall key={i} part={p} />;
        if (p.type === "file") return null;
        return null;
      })}
    </>
  );
}
