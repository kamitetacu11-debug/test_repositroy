/**
 * CodeViewer Component
 *
 * A React component for displaying code with syntax highlighting,
 * language detection confidence, and code metrics.
 *
 * Features:
 * - Syntax highlighting for 20+ languages
 * - Language detection with confidence score
 * - Code metrics display (lines, functions, classes)
 * - Copy to clipboard
 * - Download functionality
 * - Dark/Light theme support
 */

'use client';

import React, { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

// UI Components (shadcn/ui)
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-input bg-background',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  onClick?: () => void;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  onClick,
  className = '',
}) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input bg-background hover:bg-accent',
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3',
    icon: 'h-10 w-10',
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

// Icons
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

// Types
export interface CodeMetrics {
  lines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functions: number;
  classes: number;
  imports: number;
}

export interface CodeViewerProps {
  /** The code content to display */
  content: string;
  /** Detected programming language */
  language: string;
  /** Original filename */
  filename: string;
  /** Whether the content is detected as code */
  isCode: boolean;
  /** Confidence score of language detection (0-1) */
  confidence: number;
  /** Code metrics (lines, functions, etc.) */
  metrics?: CodeMetrics;
  /** URL for downloading the file */
  downloadUrl?: string;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Maximum height of the code container */
  maxHeight?: string;
  /** Callback when code is copied */
  onCopy?: () => void;
}

// Language mapping for syntax highlighter
const languageMap: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Go: 'go',
  Rust: 'rust',
  PHP: 'php',
  Java: 'java',
  'C#': 'csharp',
  C: 'c',
  'C++': 'cpp',
  Swift: 'swift',
  Kotlin: 'kotlin',
  Ruby: 'ruby',
  Bash: 'bash',
  SQL: 'sql',
  HTML: 'html',
  CSS: 'css',
  YAML: 'yaml',
  JSON: 'json',
  Markdown: 'markdown',
  XML: 'xml',
  Dockerfile: 'docker',
  'Plain Text': 'text',
};

/**
 * CodeViewer Component
 *
 * Displays code with syntax highlighting and metadata
 *
 * @example
 * ```tsx
 * <CodeViewer
 *   content={codeString}
 *   language="TypeScript"
 *   filename="example.ts"
 *   isCode={true}
 *   confidence={0.95}
 *   metrics={{ lines: 100, codeLines: 80, ... }}
 * />
 * ```
 */
export function CodeViewer({
  content,
  language,
  filename,
  isCode,
  confidence,
  metrics,
  downloadUrl,
  showLineNumbers = true,
  maxHeight = '500px',
  onCopy,
}: CodeViewerProps) {
  const { theme } = useTheme();
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;
  const syntaxLanguage = languageMap[language] || 'text';

  // Calculate confidence color based on score
  const confidenceColor = useMemo(() => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [confidence]);

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Code copied to clipboard');
      onCopy?.();
    } catch {
      toast.error('Failed to copy code');
    }
  };

  // Download code as file
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{filename}</span>
          {isCode && (
            <>
              <Badge variant="secondary">{language}</Badge>
              <Badge variant="outline" className={`text-white ${confidenceColor}`}>
                {Math.round(confidence * 100)}%
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy code">
            <CopyIcon />
          </Button>
          {downloadUrl && (
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download file">
              <DownloadIcon />
            </Button>
          )}
        </div>
      </div>

      {/* Metrics bar */}
      {metrics && (
        <div className="flex flex-wrap gap-4 px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-b">
          <span>Lines: {metrics.lines}</span>
          <span>Code: {metrics.codeLines}</span>
          <span>Comments: {metrics.commentLines}</span>
          <span>Blank: {metrics.blankLines}</span>
          {metrics.functions > 0 && <span>Functions: {metrics.functions}</span>}
          {metrics.classes > 0 && <span>Classes: {metrics.classes}</span>}
          {metrics.imports > 0 && <span>Imports: {metrics.imports}</span>}
        </div>
      )}

      {/* Code content */}
      <div className="p-0">
        <div style={{ maxHeight, overflow: 'auto' }}>
          <SyntaxHighlighter
            language={syntaxLanguage}
            style={syntaxTheme}
            showLineNumbers={showLineNumbers}
            wrapLines
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '13px',
              lineHeight: '1.5',
            }}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: '#6b7280',
              userSelect: 'none',
            }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}

/**
 * Language Detection Result Type
 *
 * Matches the backend DetectionResult structure
 */
export interface LanguageDetectionResult {
  language: string;
  isCode: boolean;
  confidence: number;
  contentType: 'code' | 'sql' | 'config' | 'markdown' | 'plain_text';
  metrics?: CodeMetrics;
}

/**
 * useLanguageDetection Hook
 *
 * Hook for detecting programming language from content
 *
 * @example
 * ```tsx
 * const { detect, isDetecting, result } = useLanguageDetection();
 *
 * const handleAnalyze = async (code: string) => {
 *   const detection = await detect(code, 'example.ts');
 *   console.log(detection.language, detection.confidence);
 * };
 * ```
 */
export function useLanguageDetection() {
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [result, setResult] = React.useState<LanguageDetectionResult | null>(null);

  const detect = async (content: string, filename?: string): Promise<LanguageDetectionResult> => {
    setIsDetecting(true);
    try {
      // In production, this would call the backend API
      const response = await fetch('/api/v1/ai/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename }),
      });

      if (!response.ok) {
        throw new Error('Detection failed');
      }

      const data = await response.json();
      setResult(data);
      return data;
    } finally {
      setIsDetecting(false);
    }
  };

  return { detect, isDetecting, result };
}

export default CodeViewer;
