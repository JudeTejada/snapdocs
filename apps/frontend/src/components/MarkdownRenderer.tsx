"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { CodeDiffViewer } from "./CodeDiffViewer";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={cn("text-foreground max-w-none w-full", className)}>
      <ReactMarkdown
        components={{
          // Code blocks with syntax highlighting
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");
            const isMultiline = codeString.includes("\n") || language;

            if (isMultiline) {
              if (language === "diff") {
                return <CodeDiffViewer diff={codeString} />;
              }

              return (
                <div className="relative my-6 rounded-lg overflow-hidden border border-border bg-[#282c34] shadow-sm">
                   {language && (
                    <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-white/10">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {language}
                      </span>
                    </div>
                  )}
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={language || "text"}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1.5rem",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      background: "transparent",
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "inherit",
                      },
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            // Inline code
            return (
              <code
                className="relative rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground border border-border/50"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Headings
          h1: ({ children }) => (
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-10 first:mt-0 mb-6 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="scroll-m-20 border-b border-border pb-2 text-3xl font-semibold tracking-tight first:mt-0 mt-12 mb-4 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-10 mb-3 text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mt-8 mb-2 text-foreground">
              {children}
            </h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-6 text-base text-foreground/90">
              {children}
            </p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="my-6 ml-6 list-disc [&>li]:mt-2 text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 ml-6 list-decimal [&>li]:mt-2 text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-primary pl-6 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
          // Horizontal rule
          hr: () => <hr className="my-8 border-border" />,
          // Tables
          table: ({ children }) => (
            <div className="my-6 w-full overflow-y-auto rounded-lg border border-border shadow-sm">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b border-border">
              {children}
            </thead>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-foreground">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
