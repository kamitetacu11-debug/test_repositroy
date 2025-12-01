# File System & Code Detection Module
## Intelligent File Management with Language Detection

**Version:** 2.0
**Features:** Multi-format upload, automatic language detection, code highlighting, binary storage

---

## 1. Supported File Types

### 1.1 File Categories

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SUPPORTED FILE TYPES                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  CODE FILES                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Language        │ Extensions              │ MIME Types                         │   │
│  │  ────────────────────────────────────────────────────────────────────────────   │   │
│  │  JavaScript      │ .js, .mjs, .cjs         │ application/javascript, text/js   │   │
│  │  TypeScript      │ .ts, .tsx, .mts, .cts   │ application/typescript             │   │
│  │  Python          │ .py, .pyw, .pyi         │ text/x-python                      │   │
│  │  Go              │ .go                     │ text/x-go                          │   │
│  │  Rust            │ .rs                     │ text/x-rust                        │   │
│  │  PHP             │ .php, .phtml            │ application/x-php                  │   │
│  │  Java            │ .java                   │ text/x-java                        │   │
│  │  C#              │ .cs, .csx               │ text/x-csharp                      │   │
│  │  C/C++           │ .c, .cpp, .h, .hpp      │ text/x-c, text/x-c++               │   │
│  │  Swift           │ .swift                  │ text/x-swift                       │   │
│  │  Kotlin          │ .kt, .kts               │ text/x-kotlin                      │   │
│  │  Ruby            │ .rb, .erb               │ application/x-ruby                 │   │
│  │  Bash/Shell      │ .sh, .bash, .zsh        │ application/x-sh                   │   │
│  │  SQL             │ .sql                    │ application/sql                    │   │
│  │  HTML            │ .html, .htm             │ text/html                          │   │
│  │  CSS             │ .css, .scss, .sass, .less │ text/css                         │   │
│  │  YAML            │ .yml, .yaml             │ application/x-yaml                 │   │
│  │  JSON            │ .json                   │ application/json                   │   │
│  │  XML             │ .xml                    │ application/xml                    │   │
│  │  Markdown        │ .md, .markdown          │ text/markdown                      │   │
│  │  Dockerfile      │ Dockerfile              │ text/x-dockerfile                  │   │
│  │  Terraform       │ .tf, .tfvars            │ text/x-terraform                   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  SPREADSHEETS                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Format          │ Extensions              │ MIME Types                         │   │
│  │  ────────────────────────────────────────────────────────────────────────────   │   │
│  │  Excel XLSX      │ .xlsx                   │ application/vnd.openxmlformats...  │   │
│  │  Excel XLS       │ .xls                    │ application/vnd.ms-excel           │   │
│  │  CSV             │ .csv                    │ text/csv                           │   │
│  │  ODS             │ .ods                    │ application/vnd.oasis...           │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  DOCUMENTS                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Format          │ Extensions              │ MIME Types                         │   │
│  │  ────────────────────────────────────────────────────────────────────────────   │   │
│  │  PDF             │ .pdf                    │ application/pdf                    │   │
│  │  Word DOCX       │ .docx                   │ application/vnd.openxmlformats...  │   │
│  │  Word DOC        │ .doc                    │ application/msword                 │   │
│  │  Plain Text      │ .txt                    │ text/plain                         │   │
│  │  RTF             │ .rtf                    │ application/rtf                    │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  IMAGES                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Format          │ Extensions              │ MIME Types                         │   │
│  │  ────────────────────────────────────────────────────────────────────────────   │   │
│  │  JPEG            │ .jpg, .jpeg             │ image/jpeg                         │   │
│  │  PNG             │ .png                    │ image/png                          │   │
│  │  GIF             │ .gif                    │ image/gif                          │   │
│  │  WebP            │ .webp                   │ image/webp                         │   │
│  │  SVG             │ .svg                    │ image/svg+xml                      │   │
│  │  BMP             │ .bmp                    │ image/bmp                          │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 File Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              FILE PROCESSING PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────┐                                                                          │
│   │  User   │                                                                          │
│   │ Upload  │                                                                          │
│   └────┬────┘                                                                          │
│        │                                                                               │
│        ▼                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │  1. VALIDATION LAYER                                                            │ │
│   │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │ │
│   │  │ Size Check      │ │ MIME Validation │ │ Extension Check │ │ Virus Scan    │ │ │
│   │  │ (max 100MB)     │ │ (magic bytes)   │ │ (whitelist)     │ │ (ClamAV)      │ │ │
│   │  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │ │
│   └──────────────────────────────────┬──────────────────────────────────────────────┘ │
│                                      │                                                 │
│                                      ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │  2. DETECTION LAYER                                                             │ │
│   │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│   │  │  File Type Detector                                                     │   │ │
│   │  │  ├── By Extension → Primary detection                                   │   │ │
│   │  │  ├── By MIME Type → Secondary validation                                │   │ │
│   │  │  ├── By Magic Bytes → Binary verification                               │   │ │
│   │  │  └── By Content Analysis → Language detection                           │   │ │
│   │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│   └──────────────────────────────────┬──────────────────────────────────────────────┘ │
│                                      │                                                 │
│                    ┌─────────────────┼─────────────────┐                              │
│                    │                 │                 │                              │
│                    ▼                 ▼                 ▼                              │
│             ┌──────────┐      ┌──────────┐      ┌──────────┐                         │
│             │   CODE   │      │  BINARY  │      │   DATA   │                         │
│             └────┬─────┘      └────┬─────┘      └────┬─────┘                         │
│                  │                 │                 │                               │
│                  ▼                 ▼                 ▼                               │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │  3. PROCESSING LAYER                                                            │ │
│   │                                                                                 │ │
│   │  CODE PATH:                    BINARY PATH:           DATA PATH:               │ │
│   │  ┌──────────────────┐         ┌────────────────┐     ┌────────────────────┐   │ │
│   │  │ Language Detect  │         │ Generate       │     │ Parse Structure    │   │ │
│   │  │ ├── Tokenize     │         │ ├── Thumbnail  │     │ ├── Excel → JSON   │   │ │
│   │  │ ├── Pattern Match│         │ ├── Preview    │     │ ├── SQL → AST      │   │ │
│   │  │ └── ML Classify  │         │ └── Metadata   │     │ └── CSV → Table    │   │ │
│   │  └────────┬─────────┘         └───────┬────────┘     └─────────┬──────────┘   │ │
│   │           │                           │                        │              │ │
│   │           ▼                           ▼                        ▼              │ │
│   │  ┌──────────────────┐         ┌────────────────┐     ┌────────────────────┐   │ │
│   │  │ Syntax Highlight │         │ Store in MinIO │     │ Extract Text       │   │ │
│   │  │ Extract Metrics  │         │                │     │ for Search         │   │ │
│   │  │ Store Text       │         │                │     │                    │   │ │
│   │  └──────────────────┘         └────────────────┘     └────────────────────┘   │ │
│   └──────────────────────────────────────┬──────────────────────────────────────────┘ │
│                                          │                                             │
│                                          ▼                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │  4. STORAGE LAYER                                                               │ │
│   │  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐ │ │
│   │  │ PostgreSQL           │  │ MinIO (S3)           │  │ Elasticsearch          │ │ │
│   │  │ ├── File metadata    │  │ ├── Binary content   │  │ ├── Full-text index    │ │ │
│   │  │ ├── Version history  │  │ ├── Thumbnails       │  │ ├── Code search        │ │ │
│   │  │ └── Analysis results │  │ └── Originals        │  │ └── Content vectors    │ │ │
│   │  └──────────────────────┘  └──────────────────────┘  └────────────────────────┘ │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Language Detection Module

### 3.1 Detection Algorithm

```go
// services/files/internal/domain/code_analysis/detector.go
package code_analysis

import (
    "regexp"
    "strings"
)

// Language represents a programming language
type Language string

const (
    LangUnknown    Language = "unknown"
    LangJavaScript Language = "JavaScript"
    LangTypeScript Language = "TypeScript"
    LangPython     Language = "Python"
    LangGo         Language = "Go"
    LangRust       Language = "Rust"
    LangPHP        Language = "PHP"
    LangJava       Language = "Java"
    LangCSharp     Language = "C#"
    LangC          Language = "C"
    LangCPP        Language = "C++"
    LangSwift      Language = "Swift"
    LangKotlin     Language = "Kotlin"
    LangRuby       Language = "Ruby"
    LangBash       Language = "Bash"
    LangSQL        Language = "SQL"
    LangHTML       Language = "HTML"
    LangCSS        Language = "CSS"
    LangYAML       Language = "YAML"
    LangJSON       Language = "JSON"
    LangMarkdown   Language = "Markdown"
    LangPlainText  Language = "Plain Text"
)

// ContentType represents the type of content
type ContentType string

const (
    ContentCode     ContentType = "code"
    ContentSQL      ContentType = "sql"
    ContentConfig   ContentType = "config"
    ContentMarkdown ContentType = "markdown"
    ContentPlain    ContentType = "plain_text"
)

// DetectionResult contains the analysis result
type DetectionResult struct {
    Language    Language    `json:"language"`
    IsCode      bool        `json:"isCode"`
    Confidence  float64     `json:"confidence"`
    ContentType ContentType `json:"contentType"`
    Metrics     CodeMetrics `json:"metrics,omitempty"`
}

// CodeMetrics contains code analysis metrics
type CodeMetrics struct {
    Lines          int `json:"lines"`
    CodeLines      int `json:"codeLines"`
    CommentLines   int `json:"commentLines"`
    BlankLines     int `json:"blankLines"`
    Functions      int `json:"functions"`
    Classes        int `json:"classes"`
    Imports        int `json:"imports"`
    Complexity     int `json:"complexity,omitempty"`
}

// LanguageDetector detects programming languages from content
type LanguageDetector struct {
    signatures map[Language][]LanguageSignature
}

// LanguageSignature contains patterns for language detection
type LanguageSignature struct {
    Pattern     *regexp.Regexp
    Weight      float64
    Description string
}

// NewLanguageDetector creates a new detector with all language signatures
func NewLanguageDetector() *LanguageDetector {
    d := &LanguageDetector{
        signatures: make(map[Language][]LanguageSignature),
    }
    d.initSignatures()
    return d
}

func (d *LanguageDetector) initSignatures() {
    // JavaScript/TypeScript signatures
    d.signatures[LangJavaScript] = []LanguageSignature{
        {regexp.MustCompile(`\bconst\s+\w+\s*=`), 0.3, "const declaration"},
        {regexp.MustCompile(`\blet\s+\w+\s*=`), 0.3, "let declaration"},
        {regexp.MustCompile(`\bfunction\s+\w+\s*\(`), 0.4, "function declaration"},
        {regexp.MustCompile(`=>\s*{`), 0.4, "arrow function"},
        {regexp.MustCompile(`\brequire\s*\(['"]\w+['"]\)`), 0.5, "require statement"},
        {regexp.MustCompile(`\bmodule\.exports\s*=`), 0.6, "module.exports"},
        {regexp.MustCompile(`\bconsole\.(log|error|warn)\(`), 0.3, "console methods"},
        {regexp.MustCompile(`\bnew\s+Promise\(`), 0.4, "Promise"},
        {regexp.MustCompile(`\basync\s+function`), 0.4, "async function"},
        {regexp.MustCompile(`\bawait\s+`), 0.3, "await keyword"},
    }

    d.signatures[LangTypeScript] = []LanguageSignature{
        {regexp.MustCompile(`:\s*(string|number|boolean|any|void|never)\b`), 0.6, "type annotation"},
        {regexp.MustCompile(`\binterface\s+\w+\s*{`), 0.7, "interface declaration"},
        {regexp.MustCompile(`\btype\s+\w+\s*=`), 0.6, "type alias"},
        {regexp.MustCompile(`<\w+(\s*,\s*\w+)*>`), 0.4, "generic type"},
        {regexp.MustCompile(`\bas\s+(string|number|boolean|any|\w+)`), 0.5, "type assertion"},
        {regexp.MustCompile(`\bimport\s+.*\s+from\s+['"]\w+`), 0.4, "ES import"},
        {regexp.MustCompile(`\bexport\s+(default\s+)?(class|function|const|interface|type)`), 0.5, "export"},
        {regexp.MustCompile(`@\w+\(`), 0.4, "decorator"},
        {regexp.MustCompile(`\bprivate\s+\w+:`), 0.6, "private property"},
        {regexp.MustCompile(`\bpublic\s+\w+:`), 0.6, "public property"},
    }

    // Python signatures
    d.signatures[LangPython] = []LanguageSignature{
        {regexp.MustCompile(`^def\s+\w+\s*\(`), 0.5, "function def"},
        {regexp.MustCompile(`^class\s+\w+.*:`), 0.5, "class definition"},
        {regexp.MustCompile(`\bimport\s+\w+`), 0.3, "import"},
        {regexp.MustCompile(`\bfrom\s+\w+\s+import\s+`), 0.4, "from import"},
        {regexp.MustCompile(`\bif\s+__name__\s*==\s*['"]__main__['"]\s*:`), 0.8, "main guard"},
        {regexp.MustCompile(`\bself\.\w+`), 0.5, "self reference"},
        {regexp.MustCompile(`:\s*$`), 0.2, "colon block"},
        {regexp.MustCompile(`\bprint\s*\(`), 0.3, "print function"},
        {regexp.MustCompile(`\bdef\s+__\w+__\s*\(`), 0.6, "dunder method"},
        {regexp.MustCompile(`@\w+\s*\n\s*def`), 0.5, "decorator"},
        {regexp.MustCompile(`\bNone\b`), 0.3, "None keyword"},
        {regexp.MustCompile(`\bTrue\b|\bFalse\b`), 0.2, "bool literal"},
    }

    // Go signatures
    d.signatures[LangGo] = []LanguageSignature{
        {regexp.MustCompile(`^package\s+\w+`), 0.8, "package declaration"},
        {regexp.MustCompile(`\bfunc\s+\w+\s*\(`), 0.5, "function"},
        {regexp.MustCompile(`\bfunc\s+\(\w+\s+\*?\w+\)\s+\w+`), 0.7, "method"},
        {regexp.MustCompile(`\btype\s+\w+\s+struct\s*{`), 0.7, "struct"},
        {regexp.MustCompile(`\btype\s+\w+\s+interface\s*{`), 0.7, "interface"},
        {regexp.MustCompile(`\b:=\s*`), 0.5, "short declaration"},
        {regexp.MustCompile(`\bgo\s+func`), 0.6, "goroutine"},
        {regexp.MustCompile(`\bchan\s+\w+`), 0.6, "channel"},
        {regexp.MustCompile(`\bdefer\s+`), 0.5, "defer"},
        {regexp.MustCompile(`\bfmt\.(Print|Sprintf|Errorf)`), 0.5, "fmt package"},
        {regexp.MustCompile(`\berr\s*!=\s*nil`), 0.6, "error check"},
        {regexp.MustCompile(`\bimport\s*\(`), 0.4, "import block"},
    }

    // Rust signatures
    d.signatures[LangRust] = []LanguageSignature{
        {regexp.MustCompile(`\bfn\s+\w+\s*(<.*>)?\s*\(`), 0.6, "function"},
        {regexp.MustCompile(`\blet\s+mut\s+`), 0.7, "mutable binding"},
        {regexp.MustCompile(`\bimpl\s+\w+`), 0.7, "impl block"},
        {regexp.MustCompile(`\bstruct\s+\w+`), 0.5, "struct"},
        {regexp.MustCompile(`\benum\s+\w+`), 0.5, "enum"},
        {regexp.MustCompile(`\b(pub\s+)?mod\s+\w+`), 0.6, "module"},
        {regexp.MustCompile(`\buse\s+\w+::`), 0.5, "use statement"},
        {regexp.MustCompile(`\b(Option|Result|Vec|String)<`), 0.6, "common types"},
        {regexp.MustCompile(`\.unwrap\(\)`), 0.5, "unwrap"},
        {regexp.MustCompile(`\bmatch\s+\w+\s*{`), 0.5, "match expression"},
        {regexp.MustCompile(`#\[derive\(`), 0.7, "derive macro"},
        {regexp.MustCompile(`->\s*(impl\s+)?\w+`), 0.4, "return type"},
    }

    // Java signatures
    d.signatures[LangJava] = []LanguageSignature{
        {regexp.MustCompile(`\bpublic\s+class\s+\w+`), 0.7, "public class"},
        {regexp.MustCompile(`\bprivate\s+(static\s+)?\w+\s+\w+`), 0.5, "private field"},
        {regexp.MustCompile(`\bpublic\s+static\s+void\s+main`), 0.9, "main method"},
        {regexp.MustCompile(`\bSystem\.out\.print`), 0.6, "System.out"},
        {regexp.MustCompile(`\bimport\s+java\.\w+`), 0.7, "java import"},
        {regexp.MustCompile(`@Override`), 0.6, "Override annotation"},
        {regexp.MustCompile(`\bextends\s+\w+`), 0.4, "extends"},
        {regexp.MustCompile(`\bimplements\s+\w+`), 0.5, "implements"},
        {regexp.MustCompile(`\bnew\s+\w+(<.*>)?\(`), 0.3, "instantiation"},
        {regexp.MustCompile(`\bfinal\s+\w+`), 0.3, "final keyword"},
    }

    // C# signatures
    d.signatures[LangCSharp] = []LanguageSignature{
        {regexp.MustCompile(`\bnamespace\s+\w+(\.\w+)*`), 0.7, "namespace"},
        {regexp.MustCompile(`\busing\s+System`), 0.6, "using System"},
        {regexp.MustCompile(`\bpublic\s+(partial\s+)?class\s+\w+`), 0.5, "class"},
        {regexp.MustCompile(`\bvar\s+\w+\s*=`), 0.3, "var declaration"},
        {regexp.MustCompile(`\basync\s+Task`), 0.6, "async Task"},
        {regexp.MustCompile(`\bawait\s+`), 0.3, "await"},
        {regexp.MustCompile(`=>\s*`), 0.2, "lambda"},
        {regexp.MustCompile(`\bstring\s+\w+\s*=`), 0.3, "string var"},
        {regexp.MustCompile(`\bConsole\.(Write|ReadLine)`), 0.5, "Console"},
        {regexp.MustCompile(`\[Attribute\]|\[\w+\]`), 0.3, "attribute"},
        {regexp.MustCompile(`\bget;\s*set;`), 0.6, "property"},
    }

    // PHP signatures
    d.signatures[LangPHP] = []LanguageSignature{
        {regexp.MustCompile(`<\?php`), 0.9, "PHP tag"},
        {regexp.MustCompile(`\$\w+\s*=`), 0.5, "variable"},
        {regexp.MustCompile(`\bfunction\s+\w+\s*\(`), 0.4, "function"},
        {regexp.MustCompile(`\bclass\s+\w+`), 0.4, "class"},
        {regexp.MustCompile(`\becho\s+`), 0.4, "echo"},
        {regexp.MustCompile(`\barray\s*\(`), 0.4, "array"},
        {regexp.MustCompile(`->\w+\(`), 0.4, "method call"},
        {regexp.MustCompile(`\buse\s+\w+\\`), 0.5, "namespace use"},
        {regexp.MustCompile(`\bnamespace\s+\w+`), 0.5, "namespace"},
        {regexp.MustCompile(`\bpublic\s+function`), 0.5, "public method"},
    }

    // SQL signatures
    d.signatures[LangSQL] = []LanguageSignature{
        {regexp.MustCompile(`(?i)\bSELECT\s+.+\s+FROM\s+`), 0.7, "SELECT"},
        {regexp.MustCompile(`(?i)\bINSERT\s+INTO\s+`), 0.7, "INSERT"},
        {regexp.MustCompile(`(?i)\bUPDATE\s+\w+\s+SET\s+`), 0.7, "UPDATE"},
        {regexp.MustCompile(`(?i)\bDELETE\s+FROM\s+`), 0.7, "DELETE"},
        {regexp.MustCompile(`(?i)\bCREATE\s+TABLE\s+`), 0.8, "CREATE TABLE"},
        {regexp.MustCompile(`(?i)\bALTER\s+TABLE\s+`), 0.7, "ALTER TABLE"},
        {regexp.MustCompile(`(?i)\bJOIN\s+\w+\s+ON\s+`), 0.6, "JOIN"},
        {regexp.MustCompile(`(?i)\bWHERE\s+`), 0.4, "WHERE"},
        {regexp.MustCompile(`(?i)\bGROUP\s+BY\s+`), 0.5, "GROUP BY"},
        {regexp.MustCompile(`(?i)\bORDER\s+BY\s+`), 0.5, "ORDER BY"},
        {regexp.MustCompile(`(?i)\bINDEX\s+ON\s+`), 0.6, "INDEX"},
    }

    // HTML signatures
    d.signatures[LangHTML] = []LanguageSignature{
        {regexp.MustCompile(`<!DOCTYPE\s+html>`), 0.9, "DOCTYPE"},
        {regexp.MustCompile(`<html[^>]*>`), 0.7, "html tag"},
        {regexp.MustCompile(`<head[^>]*>`), 0.5, "head tag"},
        {regexp.MustCompile(`<body[^>]*>`), 0.5, "body tag"},
        {regexp.MustCompile(`<div[^>]*>`), 0.4, "div tag"},
        {regexp.MustCompile(`<span[^>]*>`), 0.3, "span tag"},
        {regexp.MustCompile(`<script[^>]*>`), 0.4, "script tag"},
        {regexp.MustCompile(`<link[^>]*href`), 0.4, "link tag"},
        {regexp.MustCompile(`class=["'][^"']+["']`), 0.3, "class attr"},
    }

    // CSS signatures
    d.signatures[LangCSS] = []LanguageSignature{
        {regexp.MustCompile(`\.\w+\s*{`), 0.5, "class selector"},
        {regexp.MustCompile(`#\w+\s*{`), 0.5, "id selector"},
        {regexp.MustCompile(`@media\s+`), 0.6, "media query"},
        {regexp.MustCompile(`@import\s+`), 0.5, "import"},
        {regexp.MustCompile(`\b(margin|padding|color|background|font-size|display):`), 0.4, "property"},
        {regexp.MustCompile(`:\s*(flex|grid|block|inline|none);`), 0.4, "display value"},
        {regexp.MustCompile(`@keyframes\s+`), 0.6, "keyframes"},
        {regexp.MustCompile(`:hover\s*{`), 0.5, "pseudo-class"},
    }

    // YAML signatures
    d.signatures[LangYAML] = []LanguageSignature{
        {regexp.MustCompile(`^\w+:\s*$`), 0.4, "key only"},
        {regexp.MustCompile(`^\w+:\s+.+$`), 0.3, "key-value"},
        {regexp.MustCompile(`^\s+-\s+`), 0.4, "list item"},
        {regexp.MustCompile(`^\s+\w+:\s+`), 0.3, "nested key"},
        {regexp.MustCompile(`---\s*$`), 0.5, "document start"},
        {regexp.MustCompile(`\|\s*$`), 0.4, "literal block"},
        {regexp.MustCompile(`>\s*$`), 0.4, "folded block"},
    }

    // JSON signatures
    d.signatures[LangJSON] = []LanguageSignature{
        {regexp.MustCompile(`^\s*{\s*$`), 0.3, "object start"},
        {regexp.MustCompile(`^\s*\[\s*$`), 0.3, "array start"},
        {regexp.MustCompile(`"[^"]+"\s*:\s*`), 0.5, "key-value"},
        {regexp.MustCompile(`"[^"]+"\s*:\s*\[`), 0.4, "array value"},
        {regexp.MustCompile(`"[^"]+"\s*:\s*{`), 0.4, "object value"},
        {regexp.MustCompile(`(true|false|null)\s*[,}\]]`), 0.3, "literals"},
    }

    // Bash signatures
    d.signatures[LangBash] = []LanguageSignature{
        {regexp.MustCompile(`^#!/bin/(ba)?sh`), 0.9, "shebang"},
        {regexp.MustCompile(`\$\w+`), 0.3, "variable"},
        {regexp.MustCompile(`\$\{[^}]+\}`), 0.4, "variable expansion"},
        {regexp.MustCompile(`\bif\s+\[\s+`), 0.5, "if condition"},
        {regexp.MustCompile(`\bfor\s+\w+\s+in\s+`), 0.5, "for loop"},
        {regexp.MustCompile(`\bwhile\s+`), 0.4, "while loop"},
        {regexp.MustCompile(`\becho\s+`), 0.3, "echo"},
        {regexp.MustCompile(`\bfi\b`), 0.5, "fi keyword"},
        {regexp.MustCompile(`\bdone\b`), 0.4, "done keyword"},
        {regexp.MustCompile(`\|\s*\w+`), 0.3, "pipe"},
    }

    // Markdown signatures
    d.signatures[LangMarkdown] = []LanguageSignature{
        {regexp.MustCompile(`^#{1,6}\s+`), 0.5, "heading"},
        {regexp.MustCompile(`\[.+\]\(.+\)`), 0.5, "link"},
        {regexp.MustCompile(`!\[.*\]\(.+\)`), 0.5, "image"},
        {regexp.MustCompile("```\\w*"), 0.6, "code block"},
        {regexp.MustCompile(`^\s*[-*]\s+`), 0.3, "list item"},
        {regexp.MustCompile(`^\s*\d+\.\s+`), 0.3, "numbered list"},
        {regexp.MustCompile(`\*\*[^*]+\*\*`), 0.4, "bold"},
        {regexp.MustCompile(`_[^_]+_`), 0.3, "italic"},
        {regexp.MustCompile(`^>\s+`), 0.4, "blockquote"},
    }
}

// Detect analyzes content and returns detection result
func (d *LanguageDetector) Detect(content string, filename string) DetectionResult {
    result := DetectionResult{
        Language:    LangUnknown,
        IsCode:      false,
        Confidence:  0,
        ContentType: ContentPlain,
    }

    // First, try to detect by file extension
    if filename != "" {
        if lang := d.detectByExtension(filename); lang != LangUnknown {
            result.Language = lang
            result.Confidence = 0.7 // Extension-based detection has moderate confidence
        }
    }

    // Then analyze content to improve confidence
    scores := make(map[Language]float64)
    lines := strings.Split(content, "\n")

    for lang, signatures := range d.signatures {
        var totalScore float64
        var matchCount int

        for _, line := range lines {
            for _, sig := range signatures {
                if sig.Pattern.MatchString(line) {
                    totalScore += sig.Weight
                    matchCount++
                }
            }
        }

        // Normalize score by line count
        if len(lines) > 0 {
            scores[lang] = totalScore / float64(len(lines)) * float64(matchCount)
        }
    }

    // Find best match
    var bestLang Language
    var bestScore float64
    for lang, score := range scores {
        if score > bestScore {
            bestScore = score
            bestLang = lang
        }
    }

    // Combine extension and content analysis
    if bestScore > 0.5 {
        if result.Language == LangUnknown || bestLang == result.Language {
            result.Language = bestLang
            result.Confidence = min(0.95, bestScore)
        } else {
            // Content analysis differs from extension
            // Trust content analysis if score is high enough
            if bestScore > 1.0 {
                result.Language = bestLang
                result.Confidence = min(0.85, bestScore * 0.8)
            }
        }
    }

    // Determine content type and isCode
    result.ContentType = d.getContentType(result.Language)
    result.IsCode = d.isCodeLanguage(result.Language)

    // Calculate metrics if it's code
    if result.IsCode {
        result.Metrics = d.calculateMetrics(content, result.Language)
    }

    return result
}

func (d *LanguageDetector) detectByExtension(filename string) Language {
    ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), "."))

    extMap := map[string]Language{
        "js":       LangJavaScript,
        "mjs":      LangJavaScript,
        "cjs":      LangJavaScript,
        "ts":       LangTypeScript,
        "tsx":      LangTypeScript,
        "mts":      LangTypeScript,
        "py":       LangPython,
        "pyw":      LangPython,
        "go":       LangGo,
        "rs":       LangRust,
        "php":      LangPHP,
        "java":     LangJava,
        "cs":       LangCSharp,
        "c":        LangC,
        "h":        LangC,
        "cpp":      LangCPP,
        "hpp":      LangCPP,
        "swift":    LangSwift,
        "kt":       LangKotlin,
        "kts":      LangKotlin,
        "rb":       LangRuby,
        "sh":       LangBash,
        "bash":     LangBash,
        "sql":      LangSQL,
        "html":     LangHTML,
        "htm":      LangHTML,
        "css":      LangCSS,
        "scss":     LangCSS,
        "yaml":     LangYAML,
        "yml":      LangYAML,
        "json":     LangJSON,
        "md":       LangMarkdown,
        "markdown": LangMarkdown,
    }

    if lang, ok := extMap[ext]; ok {
        return lang
    }
    return LangUnknown
}

func (d *LanguageDetector) getContentType(lang Language) ContentType {
    switch lang {
    case LangSQL:
        return ContentSQL
    case LangYAML, LangJSON:
        return ContentConfig
    case LangMarkdown:
        return ContentMarkdown
    case LangPlainText, LangUnknown:
        return ContentPlain
    default:
        return ContentCode
    }
}

func (d *LanguageDetector) isCodeLanguage(lang Language) bool {
    nonCodeLangs := map[Language]bool{
        LangPlainText: true,
        LangMarkdown:  true,
        LangUnknown:   true,
    }
    return !nonCodeLangs[lang]
}

func (d *LanguageDetector) calculateMetrics(content string, lang Language) CodeMetrics {
    lines := strings.Split(content, "\n")
    metrics := CodeMetrics{
        Lines: len(lines),
    }

    commentPatterns := map[Language]*regexp.Regexp{
        LangJavaScript: regexp.MustCompile(`^\s*(//|/\*|\*)`),
        LangTypeScript: regexp.MustCompile(`^\s*(//|/\*|\*)`),
        LangPython:     regexp.MustCompile(`^\s*#`),
        LangGo:         regexp.MustCompile(`^\s*(//|/\*|\*)`),
        LangRust:       regexp.MustCompile(`^\s*(//|/\*|\*)`),
        LangSQL:        regexp.MustCompile(`^\s*--`),
        LangBash:       regexp.MustCompile(`^\s*#`),
    }

    functionPatterns := map[Language]*regexp.Regexp{
        LangJavaScript: regexp.MustCompile(`\b(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|=>\s*{)`),
        LangTypeScript: regexp.MustCompile(`\b(function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(|=>\s*{)`),
        LangPython:     regexp.MustCompile(`^\s*def\s+\w+`),
        LangGo:         regexp.MustCompile(`\bfunc\s+`),
        LangRust:       regexp.MustCompile(`\bfn\s+\w+`),
        LangJava:       regexp.MustCompile(`\b(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(`),
    }

    classPatterns := map[Language]*regexp.Regexp{
        LangJavaScript: regexp.MustCompile(`\bclass\s+\w+`),
        LangTypeScript: regexp.MustCompile(`\b(class|interface)\s+\w+`),
        LangPython:     regexp.MustCompile(`^\s*class\s+\w+`),
        LangGo:         regexp.MustCompile(`\btype\s+\w+\s+struct`),
        LangRust:       regexp.MustCompile(`\bstruct\s+\w+`),
        LangJava:       regexp.MustCompile(`\bclass\s+\w+`),
    }

    importPatterns := map[Language]*regexp.Regexp{
        LangJavaScript: regexp.MustCompile(`\b(import|require)\s*\(`),
        LangTypeScript: regexp.MustCompile(`\bimport\s+`),
        LangPython:     regexp.MustCompile(`^\s*(import|from\s+\w+\s+import)`),
        LangGo:         regexp.MustCompile(`\bimport\s+`),
        LangRust:       regexp.MustCompile(`\buse\s+`),
        LangJava:       regexp.MustCompile(`\bimport\s+`),
    }

    commentPattern := commentPatterns[lang]
    funcPattern := functionPatterns[lang]
    classPattern := classPatterns[lang]
    importPattern := importPatterns[lang]

    for _, line := range lines {
        trimmed := strings.TrimSpace(line)

        if trimmed == "" {
            metrics.BlankLines++
        } else if commentPattern != nil && commentPattern.MatchString(line) {
            metrics.CommentLines++
        } else {
            metrics.CodeLines++

            if funcPattern != nil && funcPattern.MatchString(line) {
                metrics.Functions++
            }
            if classPattern != nil && classPattern.MatchString(line) {
                metrics.Classes++
            }
            if importPattern != nil && importPattern.MatchString(line) {
                metrics.Imports++
            }
        }
    }

    return metrics
}

func min(a, b float64) float64 {
    if a < b {
        return a
    }
    return b
}
```

---

## 4. File Upload Service

### 4.1 Upload Handler

```go
// services/files/internal/interfaces/http/upload_handler.go
package http

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "path/filepath"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/taskmaster/services/files/internal/application"
    "github.com/taskmaster/services/files/internal/domain/code_analysis"
)

const (
    MaxFileSize      = 100 * 1024 * 1024 // 100MB
    MaxFilesPerUpload = 10
)

type UploadHandler struct {
    fileService     *application.FileService
    languageDetector *code_analysis.LanguageDetector
    storageService  StorageService
}

type UploadResponse struct {
    ID              string                     `json:"id"`
    Filename        string                     `json:"filename"`
    OriginalName    string                     `json:"originalName"`
    MimeType        string                     `json:"mimeType"`
    Category        string                     `json:"category"`
    Size            int64                      `json:"size"`
    IsCode          bool                       `json:"isCode"`
    Language        string                     `json:"language,omitempty"`
    Confidence      float64                    `json:"confidence,omitempty"`
    ContentType     string                     `json:"contentType,omitempty"`
    Metrics         *code_analysis.CodeMetrics `json:"metrics,omitempty"`
    DownloadURL     string                     `json:"downloadUrl"`
    PreviewURL      string                     `json:"previewUrl,omitempty"`
}

// Upload handles file upload
func (h *UploadHandler) Upload(c *gin.Context) {
    ctx := c.Request.Context()

    // Get entity info from request
    entityType := c.PostForm("entity_type")
    entityID := c.PostForm("entity_id")

    if entityType == "" || entityID == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "entity_type and entity_id are required",
        })
        return
    }

    // Get user from context
    userID := c.GetString("user_id")
    orgID := c.GetString("organization_id")

    // Parse multipart form
    form, err := c.MultipartForm()
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form data"})
        return
    }

    files := form.File["files"]
    if len(files) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
        return
    }

    if len(files) > MaxFilesPerUpload {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": fmt.Sprintf("Maximum %d files per upload", MaxFilesPerUpload),
        })
        return
    }

    var responses []UploadResponse

    for _, fileHeader := range files {
        response, err := h.processFile(ctx, fileHeader, orgID, userID, entityType, entityID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": fmt.Sprintf("Failed to process file %s: %v", fileHeader.Filename, err),
            })
            return
        }
        responses = append(responses, *response)
    }

    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "files":   responses,
    })
}

func (h *UploadHandler) processFile(
    ctx context.Context,
    fileHeader *multipart.FileHeader,
    orgID, userID, entityType, entityID string,
) (*UploadResponse, error) {
    // Validate file size
    if fileHeader.Size > MaxFileSize {
        return nil, fmt.Errorf("file too large: max %d bytes", MaxFileSize)
    }

    // Open file
    file, err := fileHeader.Open()
    if err != nil {
        return nil, fmt.Errorf("failed to open file: %w", err)
    }
    defer file.Close()

    // Read content
    content, err := io.ReadAll(file)
    if err != nil {
        return nil, fmt.Errorf("failed to read file: %w", err)
    }

    // Detect MIME type
    mimeType := http.DetectContentType(content)

    // Override with more specific MIME type based on extension
    ext := filepath.Ext(fileHeader.Filename)
    if specificMime := getMimeTypeByExtension(ext); specificMime != "" {
        mimeType = specificMime
    }

    // Determine category
    category := categorizeFile(mimeType, ext)

    // Generate unique filename
    fileID := uuid.New()
    filename := fmt.Sprintf("%s/%s%s", entityID, fileID.String(), ext)

    // Calculate checksum
    hash := sha256.Sum256(content)
    checksum := hex.EncodeToString(hash[:])

    // Detect language for code files
    var detection code_analysis.DetectionResult
    if isTextFile(mimeType) {
        detection = h.languageDetector.Detect(string(content), fileHeader.Filename)
    }

    // Store file in MinIO
    storagePath, err := h.storageService.Store(ctx, filename, content, mimeType)
    if err != nil {
        return nil, fmt.Errorf("failed to store file: %w", err)
    }

    // Create file record
    fileRecord := &application.CreateFileInput{
        OrganizationID: orgID,
        EntityType:     entityType,
        EntityID:       entityID,
        Filename:       filename,
        OriginalName:   fileHeader.Filename,
        MimeType:       mimeType,
        Category:       category,
        Size:           fileHeader.Size,
        StoragePath:    storagePath,
        Checksum:       checksum,
        IsCode:         detection.IsCode,
        Language:       string(detection.Language),
        UploadedBy:     userID,
    }

    savedFile, err := h.fileService.CreateFile(ctx, fileRecord)
    if err != nil {
        return nil, fmt.Errorf("failed to save file record: %w", err)
    }

    // If code file, save analysis results
    if detection.IsCode {
        analysis := &application.CreateCodeAnalysisInput{
            FileVersionID: savedFile.CurrentVersionID,
            Language:      string(detection.Language),
            IsCode:        detection.IsCode,
            Confidence:    detection.Confidence,
            ContentType:   string(detection.ContentType),
            Metrics:       detection.Metrics,
            Content:       string(content), // Store for search/analysis
        }
        _, err = h.fileService.CreateCodeAnalysis(ctx, analysis)
        if err != nil {
            // Log but don't fail upload
            fmt.Printf("Failed to save code analysis: %v\n", err)
        }
    }

    // Generate URLs
    downloadURL := fmt.Sprintf("/api/v1/files/%s/download", savedFile.ID)
    var previewURL string
    if category == "IMAGE" || detection.IsCode {
        previewURL = fmt.Sprintf("/api/v1/files/%s/preview", savedFile.ID)
    }

    return &UploadResponse{
        ID:          savedFile.ID,
        Filename:    filename,
        OriginalName: fileHeader.Filename,
        MimeType:    mimeType,
        Category:    category,
        Size:        fileHeader.Size,
        IsCode:      detection.IsCode,
        Language:    string(detection.Language),
        Confidence:  detection.Confidence,
        ContentType: string(detection.ContentType),
        Metrics:     &detection.Metrics,
        DownloadURL: downloadURL,
        PreviewURL:  previewURL,
    }, nil
}

func categorizeFile(mimeType, ext string) string {
    // Code files
    codeExts := map[string]bool{
        ".js": true, ".ts": true, ".tsx": true, ".py": true, ".go": true,
        ".rs": true, ".php": true, ".java": true, ".cs": true, ".c": true,
        ".cpp": true, ".h": true, ".hpp": true, ".swift": true, ".kt": true,
        ".rb": true, ".sh": true, ".sql": true, ".html": true, ".css": true,
        ".scss": true, ".yaml": true, ".yml": true, ".json": true, ".xml": true,
        ".md": true,
    }
    if codeExts[ext] {
        return "CODE"
    }

    // Spreadsheets
    if ext == ".xlsx" || ext == ".xls" || ext == ".csv" || ext == ".ods" {
        return "SPREADSHEET"
    }

    // Documents
    if ext == ".pdf" || ext == ".doc" || ext == ".docx" || ext == ".txt" || ext == ".rtf" {
        return "DOCUMENT"
    }

    // Images
    if strings.HasPrefix(mimeType, "image/") {
        return "IMAGE"
    }

    // Data files
    if ext == ".sql" || ext == ".xml" || ext == ".json" {
        return "DATA"
    }

    return "OTHER"
}

func isTextFile(mimeType string) bool {
    return strings.HasPrefix(mimeType, "text/") ||
        mimeType == "application/json" ||
        mimeType == "application/javascript" ||
        mimeType == "application/xml" ||
        mimeType == "application/sql"
}

func getMimeTypeByExtension(ext string) string {
    mimeMap := map[string]string{
        ".ts":   "application/typescript",
        ".tsx":  "application/typescript",
        ".py":   "text/x-python",
        ".go":   "text/x-go",
        ".rs":   "text/x-rust",
        ".php":  "application/x-php",
        ".java": "text/x-java",
        ".cs":   "text/x-csharp",
        ".sql":  "application/sql",
        ".yaml": "application/x-yaml",
        ".yml":  "application/x-yaml",
        ".md":   "text/markdown",
    }
    return mimeMap[ext]
}
```

---

## 5. Code Viewer Component (Frontend)

### 5.1 React Code Viewer

```tsx
// apps/web/src/components/code-viewer/CodeViewer.tsx
'use client';

import React, { useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CodeMetrics {
  lines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  functions: number;
  classes: number;
  imports: number;
}

interface CodeViewerProps {
  content: string;
  language: string;
  filename: string;
  isCode: boolean;
  confidence: number;
  metrics?: CodeMetrics;
  downloadUrl?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  onCopy?: () => void;
}

// Language mapping for syntax highlighter
const languageMap: Record<string, string> = {
  'JavaScript': 'javascript',
  'TypeScript': 'typescript',
  'Python': 'python',
  'Go': 'go',
  'Rust': 'rust',
  'PHP': 'php',
  'Java': 'java',
  'C#': 'csharp',
  'C': 'c',
  'C++': 'cpp',
  'Swift': 'swift',
  'Kotlin': 'kotlin',
  'Ruby': 'ruby',
  'Bash': 'bash',
  'SQL': 'sql',
  'HTML': 'html',
  'CSS': 'css',
  'YAML': 'yaml',
  'JSON': 'json',
  'Markdown': 'markdown',
};

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
}: CodeViewerProps) {
  const { theme } = useTheme();
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;
  const syntaxLanguage = languageMap[language] || 'text';

  const confidenceColor = useMemo(() => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [confidence]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Code copied to clipboard');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{filename}</span>
          {isCode && (
            <>
              <Badge variant="secondary">{language}</Badge>
              <Badge
                variant="outline"
                className={`text-white ${confidenceColor}`}
              >
                {Math.round(confidence * 100)}%
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          {downloadUrl && (
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

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

      <CardContent className="p-0">
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
            }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 Excel Viewer Component

```tsx
// apps/web/src/components/file-viewer/ExcelViewer.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  totalRows: number;
}

interface ExcelViewerProps {
  sheets: ExcelSheet[];
  filename: string;
  downloadUrl?: string;
  pageSize?: number;
}

export function ExcelViewer({
  sheets,
  filename,
  downloadUrl,
  pageSize = 50,
}: ExcelViewerProps) {
  const [currentSheet, setCurrentSheet] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const sheet = sheets[currentSheet];
  const totalPages = Math.ceil(sheet.rows.length / pageSize);

  const displayedRows = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return sheet.rows.slice(start, end);
  }, [sheet.rows, currentPage, pageSize]);

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(0, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="text-base font-mono">{filename}</CardTitle>
          {sheets.length > 1 && (
            <Select
              value={currentSheet.toString()}
              onValueChange={(v) => {
                setCurrentSheet(parseInt(v));
                setCurrentPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((s, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {downloadUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} download>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                {sheet.headers.map((header, i) => (
                  <TableHead key={i}>{header || `Column ${i + 1}`}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="text-center text-muted-foreground">
                    {currentPage * pageSize + rowIndex + 1}
                  </TableCell>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>
                      {cell !== null ? String(cell) : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t">
          <span className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} -{' '}
            {Math.min((currentPage + 1) * pageSize, sheet.rows.length)} of{' '}
            {sheet.rows.length} rows
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 6. API Specification

```yaml
# File Management API
openapi: 3.0.3
info:
  title: File Management API
  version: 2.0.0

paths:
  /api/v1/files:
    post:
      summary: Upload files
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - files
                - entity_type
                - entity_id
              properties:
                files:
                  type: array
                  items:
                    type: string
                    format: binary
                  maxItems: 10
                entity_type:
                  type: string
                  enum: [task, deal, order, customer]
                entity_id:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Files uploaded successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  files:
                    type: array
                    items:
                      $ref: '#/components/schemas/UploadedFile'

  /api/v1/files/{id}:
    get:
      summary: Get file metadata
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: File metadata
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FileMetadata'

  /api/v1/files/{id}/download:
    get:
      summary: Download file
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: File content
          content:
            application/octet-stream:
              schema:
                type: string
                format: binary

  /api/v1/files/{id}/preview:
    get:
      summary: Get file preview
      description: Returns preview content (code with highlighting, image thumbnail, etc.)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Preview content
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FilePreview'

  /api/v1/files/{id}/analysis:
    get:
      summary: Get code analysis results
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Code analysis
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CodeAnalysis'

components:
  schemas:
    UploadedFile:
      type: object
      properties:
        id:
          type: string
          format: uuid
        filename:
          type: string
        originalName:
          type: string
        mimeType:
          type: string
        category:
          type: string
          enum: [CODE, DOCUMENT, SPREADSHEET, IMAGE, DATA, OTHER]
        size:
          type: integer
        isCode:
          type: boolean
        language:
          type: string
        confidence:
          type: number
          format: float
        contentType:
          type: string
          enum: [code, sql, config, markdown, plain_text]
        metrics:
          $ref: '#/components/schemas/CodeMetrics'
        downloadUrl:
          type: string
        previewUrl:
          type: string

    CodeMetrics:
      type: object
      properties:
        lines:
          type: integer
        codeLines:
          type: integer
        commentLines:
          type: integer
        blankLines:
          type: integer
        functions:
          type: integer
        classes:
          type: integer
        imports:
          type: integer

    CodeAnalysis:
      type: object
      properties:
        language:
          type: string
        isCode:
          type: boolean
        confidence:
          type: number
        contentType:
          type: string
        metrics:
          $ref: '#/components/schemas/CodeMetrics'
```

---

**Document Version:** 2.0
**Next:** AI Module Design
