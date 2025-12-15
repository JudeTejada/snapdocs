"use client";

import { useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { FileDiff, Copy, Check } from "lucide-react";

interface CodeDiffViewerProps {
  diff: string;
  className?: string;
  language?: string;
}

interface DiffLine {
  type: "normal" | "add" | "remove";
  content: string;
  lineNumber: number;
}

export function CodeDiffViewer({ diff, className, language = "typescript" }: CodeDiffViewerProps) {
  const [leftLines, setLeftLines] = useState<DiffLine[]>([]);
  const [rightLines, setRightLines] = useState<DiffLine[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const lines = diff.split("\n");
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    let leftCount = 1;
    let rightCount = 1;

    let extractedFilename = "";

    lines.forEach((line) => {
      if (line.startsWith("diff --git")) {
        const parts = line.split(" ");
        if (parts.length >= 4) {
          extractedFilename = parts[3].substring(2);
        }
      } else if (line.startsWith("+++ ") && !extractedFilename) {
         extractedFilename = line.substring(6);
      }

      if (line.startsWith("@@") || line.startsWith("diff ") || line.startsWith("index ")) {
        return;
      }

      if (line.startsWith("-")) {
        left.push({
          type: "remove",
          content: line.substring(1),
          lineNumber: leftCount++,
        });
        right.push({ type: "remove", content: "", lineNumber: -1 });
      } else if (line.startsWith("+")) {
         const lastRight = right[right.length - 1];
         if (lastRight && lastRight.type === "remove" && lastRight.content === "") {
             right[right.length - 1] = {
                 type: "add",
                 content: line.substring(1),
                 lineNumber: rightCount++
             };
         } else {
             left.push({ type: "add", content: "", lineNumber: -1 });
             right.push({
                 type: "add",
                 content: line.substring(1),
                 lineNumber: rightCount++
             });
         }
      } else {
        const content = line.startsWith(" ") ? line.substring(1) : line;
        left.push({ type: "normal", content, lineNumber: leftCount++ });
        right.push({ type: "normal", content, lineNumber: rightCount++ });
      }
    });
    
    setLeftLines(left);
    setRightLines(right);
    if (extractedFilename) setFilename(extractedFilename);
  }, [diff]);

  const onCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("my-8 rounded-xl border border-border bg-[#0d1117] overflow-hidden shadow-2xl", className)}>
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-border/10">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
          </div>
          {filename && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/80 font-mono">
              <FileDiff className="w-3.5 h-3.5" />
              {filename}
            </div>
          )}
        </div>
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Copy raw diff"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/10">
        
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1c2128]/50 border-b border-border/5">
                <span className="text-[10px] font-bold tracking-wider text-red-400 uppercase">Before</span>
            </div>
            <div className="relative overflow-x-auto">
                <table className="w-full border-collapse">
                    <tbody>
                        {leftLines.map((line, i) => (
                            <tr key={i} className={cn("text-[13px] font-mono leading-6", line.type === "remove" ? "bg-red-900/20" : "")}>
                                <td className="w-10 pl-3 pr-2 text-right select-none text-gray-600 border-r border-border/10 bg-[#161b22]/50">
                                    {line.lineNumber > 0 ? line.lineNumber : ""}
                                </td>
                                <td className="pl-4 pr-2 whitespace-pre">
                                    {line.content || line.lineNumber === -1 ? (
                                        <SyntaxHighlighter
                                            language={language}
                                            style={oneDark as any}
                                            customStyle={{ margin: 0, padding: 0, background: "transparent" }}
                                            codeTagProps={{ style: { fontFamily: "inherit" } }}
                                        >
                                            {line.content}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <span>&nbsp;</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between px-4 py-2 bg-[#1c2128]/50 border-b border-border/5">
                <span className="text-[10px] font-bold tracking-wider text-green-400 uppercase">After</span>
            </div>
            <div className="relative overflow-x-auto">
                <table className="w-full border-collapse">
                    <tbody>
                        {rightLines.map((line, i) => (
                            <tr key={i} className={cn("text-[13px] font-mono leading-6", line.type === "add" ? "bg-green-900/20" : "")}>
                                <td className="w-10 pl-3 pr-2 text-right select-none text-gray-600 border-r border-border/10 bg-[#161b22]/50">
                                    {line.lineNumber > 0 ? line.lineNumber : ""}
                                </td>
                                <td className="pl-4 pr-2 whitespace-pre">
                                    {line.content || line.lineNumber === -1 ? (
                                        <SyntaxHighlighter
                                            language={language}
                                            style={oneDark as any}
                                            customStyle={{ margin: 0, padding: 0, background: "transparent" }}
                                            codeTagProps={{ style: { fontFamily: "inherit" } }}
                                        >
                                            {line.content}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <span>&nbsp;</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}