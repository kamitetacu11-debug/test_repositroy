# AI Module Design
## Intelligent Analysis, Predictions & Automation

**Version:** 2.0
**Technologies:** OpenAI GPT-4, LangChain, Vector DB (pgvector), ML Models

---

## 1. AI Capabilities Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AI MODULE CAPABILITIES                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  1. TASK ANALYSIS                                                               │   │
│  │  ├── Task type classification (bug, feature, docs, refactor)                   │   │
│  │  ├── Priority recommendation                                                    │   │
│  │  ├── Effort estimation                                                          │   │
│  │  ├── Related tasks detection (semantic similarity)                              │   │
│  │  └── Auto-tagging and categorization                                            │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  2. CODE REVIEW                                                                  │   │
│  │  ├── Code quality analysis                                                       │   │
│  │  ├── Bug detection                                                               │   │
│  │  ├── Security vulnerability scan                                                 │   │
│  │  ├── Best practices suggestions                                                  │   │
│  │  └── Improvement recommendations                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  3. DOCUMENT ANALYSIS                                                            │   │
│  │  ├── Excel data parsing and insights                                             │   │
│  │  ├── SQL query analysis and optimization                                         │   │
│  │  ├── Requirements extraction                                                     │   │
│  │  └── Summary generation                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  4. BUSINESS PREDICTIONS                                                         │   │
│  │  ├── Sales forecasting                                                           │   │
│  │  ├── Inventory demand prediction                                                 │   │
│  │  ├── Customer churn prediction                                                   │   │
│  │  ├── Procurement recommendations                                                 │   │
│  │  └── Bottleneck detection                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  5. GENERATION                                                                   │   │
│  │  ├── Document generation (reports, summaries)                                    │   │
│  │  ├── Workflow automation rules                                                   │   │
│  │  ├── Auto-fill suggestions                                                       │   │
│  │  └── Response templates                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  6. ADMIN DECISION SUPPORT                                                       │   │
│  │  ├── Task review recommendations                                                 │   │
│  │  ├── Risk assessment                                                             │   │
│  │  ├── Approval suggestions                                                        │   │
│  │  └── Quality scoring                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 AI Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AI PIPELINE ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              ┌─────────────────┐                                        │
│                              │   API Request   │                                        │
│                              └────────┬────────┘                                        │
│                                       │                                                 │
│                                       ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           AI GATEWAY SERVICE                                     │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │   │
│  │  │ Rate Limiter    │ │ Request Router  │ │ Token Counter   │ │ Cost Tracker  │ │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │   │
│  └──────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                     │                                                   │
│                    ┌────────────────┼────────────────┐                                 │
│                    │                │                │                                 │
│                    ▼                ▼                ▼                                 │
│  ┌─────────────────────┐ ┌──────────────────┐ ┌────────────────────┐                  │
│  │   LLM PIPELINE      │ │  ML PIPELINE     │ │  VECTOR PIPELINE   │                  │
│  │                     │ │                  │ │                    │                  │
│  │ ┌─────────────────┐ │ │ ┌──────────────┐ │ │ ┌────────────────┐ │                  │
│  │ │ OpenAI GPT-4    │ │ │ │ Forecasting  │ │ │ │ Embedding Gen  │ │                  │
│  │ │ Claude          │ │ │ │ Classification│ │ │ │ pgvector       │ │                  │
│  │ │ Local Models    │ │ │ │ Clustering   │ │ │ │ Similarity     │ │                  │
│  │ └─────────────────┘ │ │ └──────────────┘ │ │ └────────────────┘ │                  │
│  │                     │ │                  │ │                    │                  │
│  │ ┌─────────────────┐ │ │ ┌──────────────┐ │ │ ┌────────────────┐ │                  │
│  │ │ LangChain       │ │ │ │ Scikit-learn │ │ │ │ RAG Pipeline   │ │                  │
│  │ │ Orchestration   │ │ │ │ Prophet      │ │ │ │                │ │                  │
│  │ └─────────────────┘ │ │ └──────────────┘ │ │ └────────────────┘ │                  │
│  └──────────┬──────────┘ └────────┬─────────┘ └─────────┬──────────┘                  │
│             │                     │                     │                              │
│             └─────────────────────┼─────────────────────┘                              │
│                                   │                                                    │
│                                   ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           RESPONSE AGGREGATOR                                    │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │   │
│  │  │ Result Merger   │ │ Confidence Calc │ │ Response Format │ │ Caching       │ │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────────┘ │   │
│  └──────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                     │                                                   │
│                                     ▼                                                   │
│                              ┌─────────────────┐                                        │
│                              │  API Response   │                                        │
│                              └─────────────────┘                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Model

### 3.1 AI Service Interfaces

```go
// services/ai/internal/domain/ai_service.go
package domain

import (
    "context"
)

// TaskAnalysisRequest contains task analysis input
type TaskAnalysisRequest struct {
    Title       string   `json:"title"`
    Description string   `json:"description"`
    Attachments []string `json:"attachments,omitempty"` // File content or URLs
    Context     string   `json:"context,omitempty"`     // Additional context
}

// TaskAnalysisResult contains analysis output
type TaskAnalysisResult struct {
    TaskType          string             `json:"taskType"`          // bug, feature, docs, refactor, support
    Priority          string             `json:"priority"`          // low, medium, high, urgent
    EstimatedEffort   string             `json:"estimatedEffort"`   // small, medium, large, xlarge
    EstimatedHours    float64            `json:"estimatedHours"`
    Tags              []string           `json:"tags"`
    Summary           string             `json:"summary"`
    Recommendations   []string           `json:"recommendations"`
    RelatedTasks      []RelatedTask      `json:"relatedTasks,omitempty"`
    RiskAssessment    RiskAssessment     `json:"riskAssessment"`
    Confidence        float64            `json:"confidence"`
}

// RelatedTask represents a semantically similar task
type RelatedTask struct {
    TaskID     string  `json:"taskId"`
    Title      string  `json:"title"`
    Similarity float64 `json:"similarity"`
}

// RiskAssessment contains risk analysis
type RiskAssessment struct {
    Level       string   `json:"level"`       // low, medium, high
    Factors     []string `json:"factors"`
    Mitigations []string `json:"mitigations"`
}

// CodeReviewRequest contains code review input
type CodeReviewRequest struct {
    Code     string `json:"code"`
    Language string `json:"language"`
    Context  string `json:"context,omitempty"`
    TaskID   string `json:"taskId,omitempty"`
}

// CodeReviewResult contains code review output
type CodeReviewResult struct {
    QualityScore     float64        `json:"qualityScore"`     // 0-100
    Issues           []CodeIssue    `json:"issues"`
    Suggestions      []string       `json:"suggestions"`
    SecurityIssues   []SecurityIssue `json:"securityIssues"`
    BestPractices    []string       `json:"bestPractices"`
    Summary          string         `json:"summary"`
    ApprovalRecommendation string   `json:"approvalRecommendation"` // approve, needs_changes, reject
}

// CodeIssue represents a code issue found
type CodeIssue struct {
    Line        int    `json:"line"`
    Column      int    `json:"column,omitempty"`
    Severity    string `json:"severity"` // info, warning, error, critical
    Type        string `json:"type"`     // bug, style, performance, logic
    Message     string `json:"message"`
    Suggestion  string `json:"suggestion,omitempty"`
}

// SecurityIssue represents a security vulnerability
type SecurityIssue struct {
    Type        string `json:"type"`        // xss, injection, auth, etc.
    Severity    string `json:"severity"`    // low, medium, high, critical
    Description string `json:"description"`
    Location    string `json:"location"`
    Remediation string `json:"remediation"`
    CWE         string `json:"cwe,omitempty"` // CWE identifier
}

// ExcelAnalysisRequest contains Excel analysis input
type ExcelAnalysisRequest struct {
    Data    interface{} `json:"data"`    // Parsed Excel data
    Query   string      `json:"query"`   // User's question
    Context string      `json:"context,omitempty"`
}

// ExcelAnalysisResult contains Excel analysis output
type ExcelAnalysisResult struct {
    Insights     []Insight    `json:"insights"`
    Anomalies    []Anomaly    `json:"anomalies"`
    Summary      string       `json:"summary"`
    Charts       []ChartSuggestion `json:"charts"`
    SQLQuery     string       `json:"sqlQuery,omitempty"` // If data can be queried
}

// Insight represents a data insight
type Insight struct {
    Type        string  `json:"type"`        // trend, pattern, correlation, outlier
    Title       string  `json:"title"`
    Description string  `json:"description"`
    Confidence  float64 `json:"confidence"`
    Data        interface{} `json:"data,omitempty"`
}

// Anomaly represents a detected anomaly
type Anomaly struct {
    Location    string  `json:"location"`
    Value       interface{} `json:"value"`
    Expected    interface{} `json:"expected"`
    Severity    string  `json:"severity"`
    Description string  `json:"description"`
}

// ChartSuggestion suggests a visualization
type ChartSuggestion struct {
    Type        string      `json:"type"`        // bar, line, pie, scatter
    Title       string      `json:"title"`
    XAxis       string      `json:"xAxis"`
    YAxis       string      `json:"yAxis"`
    Data        interface{} `json:"data"`
}

// PredictionRequest contains prediction input
type PredictionRequest struct {
    Type       string                 `json:"type"`       // sales, inventory, churn
    Parameters map[string]interface{} `json:"parameters"`
    Horizon    string                 `json:"horizon"`    // 7d, 30d, 90d
}

// PredictionResult contains prediction output
type PredictionResult struct {
    Predictions  []PredictionPoint   `json:"predictions"`
    Confidence   float64             `json:"confidence"`
    Factors      []InfluenceFactor   `json:"factors"`
    Recommendations []string         `json:"recommendations"`
}

// PredictionPoint represents a single prediction
type PredictionPoint struct {
    Date       string  `json:"date"`
    Value      float64 `json:"value"`
    LowerBound float64 `json:"lowerBound"`
    UpperBound float64 `json:"upperBound"`
}

// InfluenceFactor represents a factor affecting prediction
type InfluenceFactor struct {
    Name   string  `json:"name"`
    Impact float64 `json:"impact"` // -1 to 1
    Description string `json:"description"`
}

// AIService defines the main AI service interface
type AIService interface {
    // Task Analysis
    AnalyzeTask(ctx context.Context, req TaskAnalysisRequest) (*TaskAnalysisResult, error)
    FindRelatedTasks(ctx context.Context, taskID string, limit int) ([]RelatedTask, error)
    ClassifyTask(ctx context.Context, title, description string) (string, float64, error)

    // Code Review
    ReviewCode(ctx context.Context, req CodeReviewRequest) (*CodeReviewResult, error)
    ExplainCode(ctx context.Context, code, language string) (string, error)
    SuggestFixes(ctx context.Context, code, language string, issues []CodeIssue) (string, error)

    // Document Analysis
    AnalyzeExcel(ctx context.Context, req ExcelAnalysisRequest) (*ExcelAnalysisResult, error)
    AnalyzeSQL(ctx context.Context, sql string) (*SQLAnalysisResult, error)
    ExtractRequirements(ctx context.Context, document string) ([]Requirement, error)

    // Predictions
    PredictSales(ctx context.Context, req PredictionRequest) (*PredictionResult, error)
    PredictInventory(ctx context.Context, productID string, horizon string) (*PredictionResult, error)
    DetectAnomalies(ctx context.Context, data interface{}) ([]Anomaly, error)

    // Generation
    GenerateReport(ctx context.Context, template string, data interface{}) (string, error)
    GenerateSummary(ctx context.Context, content string) (string, error)
    SuggestAutoFill(ctx context.Context, context string, field string) (string, error)

    // Admin Support
    RecommendApproval(ctx context.Context, taskID string) (*ApprovalRecommendation, error)
    AssessRisk(ctx context.Context, entityType, entityID string) (*RiskAssessment, error)
}
```

### 3.2 LLM Pipeline Implementation

```go
// services/ai/internal/infrastructure/llm/openai_service.go
package llm

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/sashabaranov/go-openai"
    "github.com/taskmaster/services/ai/internal/domain"
)

type OpenAIService struct {
    client *openai.Client
    model  string
}

func NewOpenAIService(apiKey string, model string) *OpenAIService {
    client := openai.NewClient(apiKey)
    if model == "" {
        model = openai.GPT4TurboPreview
    }
    return &OpenAIService{
        client: client,
        model:  model,
    }
}

// AnalyzeTask analyzes a task using GPT
func (s *OpenAIService) AnalyzeTask(ctx context.Context, req domain.TaskAnalysisRequest) (*domain.TaskAnalysisResult, error) {
    systemPrompt := `You are an expert project manager and software architect.
Analyze the following task and provide structured analysis.

Your response MUST be valid JSON with the following structure:
{
    "taskType": "bug|feature|docs|refactor|support|infrastructure",
    "priority": "low|medium|high|urgent",
    "estimatedEffort": "small|medium|large|xlarge",
    "estimatedHours": <number>,
    "tags": ["tag1", "tag2"],
    "summary": "<brief summary>",
    "recommendations": ["rec1", "rec2"],
    "riskAssessment": {
        "level": "low|medium|high",
        "factors": ["factor1"],
        "mitigations": ["mitigation1"]
    },
    "confidence": <0.0-1.0>
}

Consider:
- Task complexity and scope
- Potential risks and dependencies
- Technical requirements
- Time and resource needs
`

    userPrompt := fmt.Sprintf(`
Task Title: %s

Task Description:
%s

Additional Context:
%s
`, req.Title, req.Description, req.Context)

    // Add attachments content if present
    if len(req.Attachments) > 0 {
        userPrompt += "\n\nAttachments:\n"
        for i, attachment := range req.Attachments {
            userPrompt += fmt.Sprintf("\n--- Attachment %d ---\n%s\n", i+1, attachment)
        }
    }

    resp, err := s.client.CreateChatCompletion(
        ctx,
        openai.ChatCompletionRequest{
            Model: s.model,
            Messages: []openai.ChatCompletionMessage{
                {
                    Role:    openai.ChatMessageRoleSystem,
                    Content: systemPrompt,
                },
                {
                    Role:    openai.ChatMessageRoleUser,
                    Content: userPrompt,
                },
            },
            Temperature: 0.3, // Lower temperature for more consistent output
            ResponseFormat: &openai.ChatCompletionResponseFormat{
                Type: openai.ChatCompletionResponseFormatTypeJSONObject,
            },
        },
    )

    if err != nil {
        return nil, fmt.Errorf("openai API error: %w", err)
    }

    if len(resp.Choices) == 0 {
        return nil, fmt.Errorf("no response from OpenAI")
    }

    var result domain.TaskAnalysisResult
    if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }

    return &result, nil
}

// ReviewCode performs code review using GPT
func (s *OpenAIService) ReviewCode(ctx context.Context, req domain.CodeReviewRequest) (*domain.CodeReviewResult, error) {
    systemPrompt := fmt.Sprintf(`You are an expert code reviewer specializing in %s.
Analyze the provided code for:
1. Code quality and readability
2. Potential bugs and logic errors
3. Security vulnerabilities (OWASP Top 10)
4. Performance issues
5. Best practices violations

Your response MUST be valid JSON with this structure:
{
    "qualityScore": <0-100>,
    "issues": [
        {
            "line": <number>,
            "severity": "info|warning|error|critical",
            "type": "bug|style|performance|logic|security",
            "message": "<description>",
            "suggestion": "<how to fix>"
        }
    ],
    "suggestions": ["suggestion1", "suggestion2"],
    "securityIssues": [
        {
            "type": "xss|injection|auth|crypto|etc",
            "severity": "low|medium|high|critical",
            "description": "<description>",
            "location": "<where in code>",
            "remediation": "<how to fix>",
            "cwe": "CWE-XXX"
        }
    ],
    "bestPractices": ["practice1", "practice2"],
    "summary": "<overall assessment>",
    "approvalRecommendation": "approve|needs_changes|reject"
}
`, req.Language)

    userPrompt := fmt.Sprintf(`
Review this %s code:

\`\`\`%s
%s
\`\`\`

Context: %s
`, req.Language, req.Language, req.Code, req.Context)

    resp, err := s.client.CreateChatCompletion(
        ctx,
        openai.ChatCompletionRequest{
            Model: s.model,
            Messages: []openai.ChatCompletionMessage{
                {
                    Role:    openai.ChatMessageRoleSystem,
                    Content: systemPrompt,
                },
                {
                    Role:    openai.ChatMessageRoleUser,
                    Content: userPrompt,
                },
            },
            Temperature: 0.2,
            ResponseFormat: &openai.ChatCompletionResponseFormat{
                Type: openai.ChatCompletionResponseFormatTypeJSONObject,
            },
        },
    )

    if err != nil {
        return nil, fmt.Errorf("openai API error: %w", err)
    }

    var result domain.CodeReviewResult
    if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }

    return &result, nil
}

// ExplainCode generates explanation for code
func (s *OpenAIService) ExplainCode(ctx context.Context, code, language string) (string, error) {
    systemPrompt := `You are a helpful coding assistant. Explain the provided code clearly and concisely.
Include:
- What the code does
- Key algorithms or patterns used
- Important variables and functions
- Flow of execution
Keep the explanation accessible to intermediate developers.`

    userPrompt := fmt.Sprintf(`Explain this %s code:

\`\`\`%s
%s
\`\`\``, language, language, code)

    resp, err := s.client.CreateChatCompletion(
        ctx,
        openai.ChatCompletionRequest{
            Model: s.model,
            Messages: []openai.ChatCompletionMessage{
                {Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
                {Role: openai.ChatMessageRoleUser, Content: userPrompt},
            },
            Temperature: 0.5,
        },
    )

    if err != nil {
        return "", err
    }

    return resp.Choices[0].Message.Content, nil
}

// AnalyzeExcel analyzes Excel data
func (s *OpenAIService) AnalyzeExcel(ctx context.Context, req domain.ExcelAnalysisRequest) (*domain.ExcelAnalysisResult, error) {
    dataJSON, err := json.MarshalIndent(req.Data, "", "  ")
    if err != nil {
        return nil, fmt.Errorf("failed to serialize data: %w", err)
    }

    systemPrompt := `You are a data analyst expert. Analyze the provided spreadsheet data and answer the user's question.

Your response MUST be valid JSON:
{
    "insights": [
        {
            "type": "trend|pattern|correlation|outlier",
            "title": "<brief title>",
            "description": "<detailed description>",
            "confidence": <0.0-1.0>
        }
    ],
    "anomalies": [
        {
            "location": "<cell or row reference>",
            "value": <actual value>,
            "expected": <expected value>,
            "severity": "low|medium|high",
            "description": "<explanation>"
        }
    ],
    "summary": "<overall summary answering user question>",
    "charts": [
        {
            "type": "bar|line|pie|scatter",
            "title": "<chart title>",
            "xAxis": "<column name>",
            "yAxis": "<column name>"
        }
    ],
    "sqlQuery": "<SQL query if applicable>"
}`

    userPrompt := fmt.Sprintf(`
Data:
%s

User Question: %s

Context: %s
`, string(dataJSON), req.Query, req.Context)

    resp, err := s.client.CreateChatCompletion(
        ctx,
        openai.ChatCompletionRequest{
            Model: s.model,
            Messages: []openai.ChatCompletionMessage{
                {Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
                {Role: openai.ChatMessageRoleUser, Content: userPrompt},
            },
            Temperature: 0.3,
            ResponseFormat: &openai.ChatCompletionResponseFormat{
                Type: openai.ChatCompletionResponseFormatTypeJSONObject,
            },
        },
    )

    if err != nil {
        return nil, err
    }

    var result domain.ExcelAnalysisResult
    if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }

    return &result, nil
}

// RecommendApproval generates approval recommendation for admin
func (s *OpenAIService) RecommendApproval(ctx context.Context, task *domain.TaskForReview) (*domain.ApprovalRecommendation, error) {
    systemPrompt := `You are an expert project manager helping administrators review task submissions.

Analyze the task submission and provide a recommendation.

Your response MUST be valid JSON:
{
    "recommendation": "approve|needs_changes|reject",
    "confidence": <0.0-1.0>,
    "reasoning": "<detailed reasoning>",
    "checklist": [
        {
            "item": "<checklist item>",
            "passed": <true|false>,
            "notes": "<optional notes>"
        }
    ],
    "concerns": ["<concern1>", "<concern2>"],
    "suggestions": ["<suggestion for submitter>"]
}`

    userPrompt := fmt.Sprintf(`
Task Title: %s
Task Description: %s
Task Type: %s
Priority: %s

Submission:
Solution: %s
Comments: %s

Attached Files:
%s

Please analyze and recommend whether to approve, request changes, or reject this submission.
`, task.Title, task.Description, task.Type, task.Priority,
        task.Submission.Solution, task.Submission.Comments,
        formatAttachments(task.Attachments))

    resp, err := s.client.CreateChatCompletion(
        ctx,
        openai.ChatCompletionRequest{
            Model: s.model,
            Messages: []openai.ChatCompletionMessage{
                {Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
                {Role: openai.ChatMessageRoleUser, Content: userPrompt},
            },
            Temperature: 0.3,
            ResponseFormat: &openai.ChatCompletionResponseFormat{
                Type: openai.ChatCompletionResponseFormatTypeJSONObject,
            },
        },
    )

    if err != nil {
        return nil, err
    }

    var result domain.ApprovalRecommendation
    if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
        return nil, fmt.Errorf("failed to parse response: %w", err)
    }

    return &result, nil
}
```

### 3.3 Vector Search for Similar Tasks

```go
// services/ai/internal/infrastructure/vector/pgvector_store.go
package vector

import (
    "context"
    "database/sql"
    "fmt"

    "github.com/pgvector/pgvector-go"
    "github.com/sashabaranov/go-openai"
)

type PGVectorStore struct {
    db     *sql.DB
    openai *openai.Client
}

func NewPGVectorStore(db *sql.DB, openaiClient *openai.Client) *PGVectorStore {
    return &PGVectorStore{
        db:     db,
        openai: openaiClient,
    }
}

// GenerateEmbedding creates embedding for text
func (s *PGVectorStore) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
    resp, err := s.openai.CreateEmbeddings(
        ctx,
        openai.EmbeddingRequest{
            Model: openai.AdaEmbeddingV2,
            Input: []string{text},
        },
    )
    if err != nil {
        return nil, fmt.Errorf("failed to generate embedding: %w", err)
    }

    if len(resp.Data) == 0 {
        return nil, fmt.Errorf("no embedding returned")
    }

    return resp.Data[0].Embedding, nil
}

// StoreTaskEmbedding stores task embedding in database
func (s *PGVectorStore) StoreTaskEmbedding(ctx context.Context, taskID, title, description string) error {
    // Combine title and description for embedding
    text := fmt.Sprintf("%s\n\n%s", title, description)

    embedding, err := s.GenerateEmbedding(ctx, text)
    if err != nil {
        return err
    }

    vector := pgvector.NewVector(embedding)

    _, err = s.db.ExecContext(ctx, `
        INSERT INTO task_embeddings (task_id, embedding, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (task_id)
        DO UPDATE SET embedding = $2, updated_at = NOW()
    `, taskID, vector)

    return err
}

// FindSimilarTasks finds tasks similar to the given text
func (s *PGVectorStore) FindSimilarTasks(ctx context.Context, text string, limit int, excludeTaskID string) ([]SimilarTask, error) {
    embedding, err := s.GenerateEmbedding(ctx, text)
    if err != nil {
        return nil, err
    }

    vector := pgvector.NewVector(embedding)

    rows, err := s.db.QueryContext(ctx, `
        SELECT
            te.task_id,
            t.title,
            1 - (te.embedding <=> $1) as similarity
        FROM task_embeddings te
        JOIN tasks t ON t.id = te.task_id
        WHERE te.task_id != $2
        ORDER BY te.embedding <=> $1
        LIMIT $3
    `, vector, excludeTaskID, limit)

    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var results []SimilarTask
    for rows.Next() {
        var task SimilarTask
        if err := rows.Scan(&task.TaskID, &task.Title, &task.Similarity); err != nil {
            return nil, err
        }
        results = append(results, task)
    }

    return results, nil
}

// FindSimilarByTaskID finds tasks similar to an existing task
func (s *PGVectorStore) FindSimilarByTaskID(ctx context.Context, taskID string, limit int) ([]SimilarTask, error) {
    rows, err := s.db.QueryContext(ctx, `
        WITH target AS (
            SELECT embedding FROM task_embeddings WHERE task_id = $1
        )
        SELECT
            te.task_id,
            t.title,
            1 - (te.embedding <=> target.embedding) as similarity
        FROM task_embeddings te
        CROSS JOIN target
        JOIN tasks t ON t.id = te.task_id
        WHERE te.task_id != $1
        ORDER BY te.embedding <=> target.embedding
        LIMIT $2
    `, taskID, limit)

    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var results []SimilarTask
    for rows.Next() {
        var task SimilarTask
        if err := rows.Scan(&task.TaskID, &task.Title, &task.Similarity); err != nil {
            return nil, err
        }
        results = append(results, task)
    }

    return results, nil
}

type SimilarTask struct {
    TaskID     string  `json:"taskId"`
    Title      string  `json:"title"`
    Similarity float64 `json:"similarity"`
}
```

---

## 4. Prediction Service

### 4.1 Sales Forecasting

```go
// services/ai/internal/application/prediction/sales_forecast.go
package prediction

import (
    "context"
    "time"

    "github.com/taskmaster/services/ai/internal/domain"
)

type SalesForecastService struct {
    salesRepo    SalesRepository
    llmService   domain.LLMService
}

type SalesRepository interface {
    GetHistoricalSales(ctx context.Context, orgID string, from, to time.Time) ([]SalesDataPoint, error)
    GetProductSales(ctx context.Context, productID string, from, to time.Time) ([]SalesDataPoint, error)
}

type SalesDataPoint struct {
    Date     time.Time
    Amount   float64
    Quantity int
    Product  string
}

// PredictSales forecasts future sales
func (s *SalesForecastService) PredictSales(ctx context.Context, req domain.PredictionRequest) (*domain.PredictionResult, error) {
    // Get historical data
    orgID := req.Parameters["organization_id"].(string)

    // Default to 90 days of history
    historyDays := 90
    if days, ok := req.Parameters["history_days"].(int); ok {
        historyDays = days
    }

    to := time.Now()
    from := to.AddDate(0, 0, -historyDays)

    history, err := s.salesRepo.GetHistoricalSales(ctx, orgID, from, to)
    if err != nil {
        return nil, err
    }

    // Use LLM for analysis and prediction
    analysis, err := s.llmService.AnalyzeSalesData(ctx, history, req.Horizon)
    if err != nil {
        return nil, err
    }

    // Generate predictions based on analysis
    predictions := s.generatePredictions(history, analysis, req.Horizon)

    return &domain.PredictionResult{
        Predictions:     predictions,
        Confidence:      analysis.Confidence,
        Factors:         analysis.Factors,
        Recommendations: analysis.Recommendations,
    }, nil
}

func (s *SalesForecastService) generatePredictions(
    history []SalesDataPoint,
    analysis *SalesAnalysis,
    horizon string,
) []domain.PredictionPoint {
    // Calculate days to predict
    days := parsHorizonToDays(horizon)

    // Simple moving average + trend for demo
    // In production, use Prophet, ARIMA, or ML models
    var predictions []domain.PredictionPoint

    avgDaily := calculateDailyAverage(history)
    trend := calculateTrend(history)

    for i := 1; i <= days; i++ {
        date := time.Now().AddDate(0, 0, i)
        baseValue := avgDaily + (trend * float64(i))

        // Apply seasonal adjustment from LLM analysis
        seasonalFactor := 1.0
        if analysis.SeasonalPattern != nil {
            seasonalFactor = analysis.SeasonalPattern[date.Weekday()]
        }

        predicted := baseValue * seasonalFactor

        // Calculate confidence interval
        stdDev := calculateStdDev(history)
        margin := stdDev * 1.96 // 95% confidence

        predictions = append(predictions, domain.PredictionPoint{
            Date:       date.Format("2006-01-02"),
            Value:      predicted,
            LowerBound: predicted - margin,
            UpperBound: predicted + margin,
        })
    }

    return predictions
}
```

---

## 5. API Endpoints

```yaml
# AI API Specification
openapi: 3.0.3
info:
  title: AI Services API
  version: 2.0.0

paths:
  /api/v1/ai/analyze-task:
    post:
      summary: Analyze task with AI
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TaskAnalysisRequest'
      responses:
        '200':
          description: Analysis result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskAnalysisResult'

  /api/v1/ai/review-code:
    post:
      summary: AI code review
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CodeReviewRequest'
      responses:
        '200':
          description: Code review result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CodeReviewResult'

  /api/v1/ai/explain-code:
    post:
      summary: Explain code
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - code
                - language
              properties:
                code:
                  type: string
                language:
                  type: string
      responses:
        '200':
          description: Code explanation
          content:
            application/json:
              schema:
                type: object
                properties:
                  explanation:
                    type: string

  /api/v1/ai/analyze-excel:
    post:
      summary: Analyze Excel data
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExcelAnalysisRequest'
      responses:
        '200':
          description: Excel analysis
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExcelAnalysisResult'

  /api/v1/ai/similar-tasks/{taskId}:
    get:
      summary: Find similar tasks
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 5
      responses:
        '200':
          description: Similar tasks
          content:
            application/json:
              schema:
                type: object
                properties:
                  tasks:
                    type: array
                    items:
                      $ref: '#/components/schemas/RelatedTask'

  /api/v1/ai/predict/sales:
    post:
      summary: Predict sales
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PredictionRequest'
      responses:
        '200':
          description: Sales prediction
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PredictionResult'

  /api/v1/ai/predict/inventory/{productId}:
    get:
      summary: Predict inventory demand
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
        - name: horizon
          in: query
          schema:
            type: string
            default: '30d'
      responses:
        '200':
          description: Inventory prediction
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PredictionResult'

  /api/v1/ai/recommend-approval/{taskId}:
    get:
      summary: Get AI recommendation for task approval (admin only)
      security:
        - bearerAuth: []
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Approval recommendation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApprovalRecommendation'
        '403':
          description: Admin role required

components:
  schemas:
    TaskAnalysisRequest:
      type: object
      required:
        - title
      properties:
        title:
          type: string
        description:
          type: string
        attachments:
          type: array
          items:
            type: string
        context:
          type: string

    TaskAnalysisResult:
      type: object
      properties:
        taskType:
          type: string
          enum: [bug, feature, docs, refactor, support, infrastructure]
        priority:
          type: string
          enum: [low, medium, high, urgent]
        estimatedEffort:
          type: string
          enum: [small, medium, large, xlarge]
        estimatedHours:
          type: number
        tags:
          type: array
          items:
            type: string
        summary:
          type: string
        recommendations:
          type: array
          items:
            type: string
        relatedTasks:
          type: array
          items:
            $ref: '#/components/schemas/RelatedTask'
        riskAssessment:
          $ref: '#/components/schemas/RiskAssessment'
        confidence:
          type: number

    CodeReviewResult:
      type: object
      properties:
        qualityScore:
          type: number
          minimum: 0
          maximum: 100
        issues:
          type: array
          items:
            $ref: '#/components/schemas/CodeIssue'
        suggestions:
          type: array
          items:
            type: string
        securityIssues:
          type: array
          items:
            $ref: '#/components/schemas/SecurityIssue'
        summary:
          type: string
        approvalRecommendation:
          type: string
          enum: [approve, needs_changes, reject]

    ApprovalRecommendation:
      type: object
      properties:
        recommendation:
          type: string
          enum: [approve, needs_changes, reject]
        confidence:
          type: number
        reasoning:
          type: string
        checklist:
          type: array
          items:
            type: object
            properties:
              item:
                type: string
              passed:
                type: boolean
              notes:
                type: string
        concerns:
          type: array
          items:
            type: string
        suggestions:
          type: array
          items:
            type: string
```

---

## 6. Admin AI Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              AI-ASSISTED REVIEW DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  Task: Fix authentication bypass vulnerability                                          │
│  ────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  🤖 AI RECOMMENDATION                                               Confidence: 89% │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                 │   │
│  │  Recommendation: ✅ APPROVE                                                     │   │
│  │                                                                                 │   │
│  │  Reasoning:                                                                     │   │
│  │  The submitted code properly addresses the authentication bypass by:            │   │
│  │  • Adding token validation middleware                                           │   │
│  │  • Implementing proper session management                                       │   │
│  │  • Adding rate limiting to prevent brute force                                 │   │
│  │                                                                                 │   │
│  │  Quality Score: 87/100                                                          │   │
│  │                                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Checklist                                                              │   │   │
│  │  │  ✅ Security fix implemented correctly                                   │   │   │
│  │  │  ✅ No new vulnerabilities introduced                                    │   │   │
│  │  │  ✅ Code follows project conventions                                     │   │   │
│  │  │  ⚠️ Unit tests could be more comprehensive                               │   │   │
│  │  │  ✅ No breaking changes to API                                           │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  Minor Concerns:                                                                │   │
│  │  • Consider adding integration tests for the auth flow                         │   │
│  │  • Token expiry could be configurable via environment                          │   │
│  │                                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  📄 CODE REVIEW                                                                 │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │  auth.middleware.ts                                                             │   │
│  │  ─────────────────────────────────────────────────────────────────────────────  │   │
│  │  12 │ export const validateToken = async (req, res, next) => {                  │   │
│  │  13 │   const token = req.headers.authorization?.split(' ')[1];                │   │
│  │  14 │   if (!token) {                                                           │   │
│  │  15 │     return res.status(401).json({ error: 'Token required' });            │   │
│  │  16 │   }                                                                       │   │
│  │  17 │   try {                                                                   │   │
│  │  18 │     const decoded = jwt.verify(token, config.JWT_SECRET);  ✅ Good       │   │
│  │  19 │     req.user = decoded;                                                   │   │
│  │  20 │     next();                                                               │   │
│  │  21 │   } catch (error) {                                                       │   │
│  │  22 │     return res.status(401).json({ error: 'Invalid token' });             │   │
│  │  23 │   }                                                                       │   │
│  │  24 │ };                                                                        │   │
│  │                                                                                 │   │
│  │  Issues Found: 0 critical, 0 high, 1 medium, 2 info                            │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  🔗 SIMILAR RESOLVED TASKS                                                      │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │  • "Fix JWT expiration handling" - 92% similar - Completed 2 weeks ago         │   │
│  │  • "Add CSRF protection to auth" - 78% similar - Completed 1 month ago         │   │
│  │  • "Implement token refresh" - 71% similar - Completed 3 weeks ago              │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ─────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                         │
│  ADMIN DECISION:                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  [✅ APPROVE & COMPLETE]  [↩️ APPROVE]  [✏️ REQUEST CHANGES]  [❌ REJECT]       │   │
│  │                                                                                 │   │
│  │  Comments (optional):                                                           │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Good work on the security fix. Consider adding the integration tests   │   │   │
│  │  │  as a follow-up task.                                                    │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 2.0
**Next:** API Layer & Code Generation
