# Workflow Module Design
## Task Lifecycle & Approval System

**Version:** 2.0
**Pattern:** State Machine + Saga + Event Sourcing

---

## 1. Task Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TASK LIFECYCLE STATE MACHINE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│                                         ┌─────────────┐                                            │
│                                         │    NEW      │                                            │
│                                         │             │                                            │
│                                         └──────┬──────┘                                            │
│                                                │                                                    │
│                                                │ user.startWork()                                  │
│                                                ▼                                                    │
│                                         ┌─────────────┐                                            │
│                             ┌──────────►│ IN_PROGRESS │◄──────────┐                               │
│                             │           │             │           │                                │
│                             │           └──────┬──────┘           │                                │
│                             │                  │                  │                                │
│         user.continueWork() │                  │ user.submitForReview()                           │
│                             │                  ▼                  │                                │
│                             │     ┌─────────────────────────┐    │                                │
│                             │     │  SUBMITTED_FOR_REVIEW   │    │                                │
│                             │     │                         │    │                                │
│                             │     │  • Task in review queue │    │                                │
│                             │     │  • Admin/Assistant sees │    │                                │
│                             │     │  • Attachments visible  │    │                                │
│                             │     └───────────┬─────────────┘    │                                │
│                             │                 │                  │                                │
│                             │    ┌────────────┼────────────┐     │                                │
│                             │    │            │            │     │                                │
│                             │    ▼            │            ▼     │                                │
│                       ┌──────────────┐       │      ┌──────────────┐                             │
│                       │   REJECTED   │       │      │   ACCEPTED   │                             │
│                       │              │       │      │              │                             │
│                       │ • Has reason │       │      │ • Approved   │                             │
│                       │ • Back to    │───────┘      │ • Waiting    │                             │
│                       │   user       │              │   for final  │                             │
│                       └──────────────┘              └───────┬──────┘                             │
│                                                             │                                     │
│                                                             │ admin.markCompleted()               │
│                                                             │ (ONLY ADMIN CAN DO THIS)            │
│                                                             ▼                                     │
│                                                     ┌─────────────┐                               │
│                                                     │  COMPLETED  │                               │
│                                                     │             │                               │
│                                                     │ • Final     │                               │
│                                                     │ • Archived  │                               │
│                                                     └─────────────┘                               │
│                                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                     VALID TRANSITIONS                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│   From State              → To State                  │ Trigger              │ Required Role       │
│   ──────────────────────────────────────────────────────────────────────────────────────────────── │
│   NEW                     → IN_PROGRESS               │ startWork            │ assignee/creator    │
│   IN_PROGRESS             → SUBMITTED_FOR_REVIEW      │ submitForReview      │ assignee            │
│   SUBMITTED_FOR_REVIEW    → ACCEPTED                  │ approve              │ admin/assistant     │
│   SUBMITTED_FOR_REVIEW    → REJECTED                  │ reject (with reason) │ admin/assistant     │
│   REJECTED                → IN_PROGRESS               │ continueWork         │ assignee            │
│   ACCEPTED                → COMPLETED                 │ markCompleted        │ admin ONLY          │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Model

### 2.1 Task Aggregate

```go
// services/workflow/internal/domain/task/aggregate.go
package task

import (
    "errors"
    "time"

    "github.com/google/uuid"
    "github.com/taskmaster/pkg/domain"
)

// Status represents task lifecycle states
type Status string

const (
    StatusNew                Status = "NEW"
    StatusInProgress         Status = "IN_PROGRESS"
    StatusSubmittedForReview Status = "SUBMITTED_FOR_REVIEW"
    StatusAccepted           Status = "ACCEPTED"
    StatusRejected           Status = "REJECTED"
    StatusCompleted          Status = "COMPLETED"
)

// Priority represents task priority levels
type Priority string

const (
    PriorityLow    Priority = "LOW"
    PriorityMedium Priority = "MEDIUM"
    PriorityHigh   Priority = "HIGH"
    PriorityUrgent Priority = "URGENT"
)

// Errors
var (
    ErrInvalidTransition     = errors.New("invalid status transition")
    ErrUnauthorizedAction    = errors.New("unauthorized action")
    ErrOnlyAdminCanComplete  = errors.New("only admin can mark task as completed")
    ErrRejectionReasonRequired = errors.New("rejection reason is required")
    ErrTaskAlreadyCompleted  = errors.New("task is already completed")
    ErrNotAssignee           = errors.New("user is not task assignee")
)

// Task is the aggregate root for task management
type Task struct {
    domain.AggregateRoot

    OrganizationID uuid.UUID
    Title          string
    Description    string
    Status         Status
    Priority       Priority
    CreatorID      uuid.UUID
    AssigneeID     *uuid.UUID
    ReviewerID     *uuid.UUID
    DueDate        *time.Time
    CompletedAt    *time.Time
    ParentTaskID   *uuid.UUID
    EntityType     string    // deal, order, customer
    EntityID       *uuid.UUID
    SubmissionData *SubmissionData
    RejectionReason string
    Tags           []string
    Attachments    []Attachment
}

// SubmissionData contains data submitted for review
type SubmissionData struct {
    Solution    string                 `json:"solution"`
    Comments    string                 `json:"comments"`
    Attachments []uuid.UUID            `json:"attachments"`
    Metadata    map[string]interface{} `json:"metadata"`
    SubmittedAt time.Time              `json:"submitted_at"`
}

// Attachment represents a file attached to task
type Attachment struct {
    FileID      uuid.UUID `json:"file_id"`
    Filename    string    `json:"filename"`
    MimeType    string    `json:"mime_type"`
    Category    string    `json:"category"`
    IsCode      bool      `json:"is_code"`
    Language    string    `json:"language,omitempty"`
    UploadedAt  time.Time `json:"uploaded_at"`
    UploadedBy  uuid.UUID `json:"uploaded_by"`
}

// NewTask creates a new task
func NewTask(
    orgID uuid.UUID,
    title string,
    description string,
    creatorID uuid.UUID,
    priority Priority,
) (*Task, error) {
    if title == "" {
        return nil, errors.New("title is required")
    }

    task := &Task{
        AggregateRoot: domain.AggregateRoot{
            ID:        uuid.New().String(),
            Version:   0,
            CreatedAt: time.Now(),
            UpdatedAt: time.Now(),
        },
        OrganizationID: orgID,
        Title:          title,
        Description:    description,
        Status:         StatusNew,
        Priority:       priority,
        CreatorID:      creatorID,
        Tags:           []string{},
        Attachments:    []Attachment{},
    }

    task.AddDomainEvent(&TaskCreatedEvent{
        TaskID:         task.ID,
        OrganizationID: orgID,
        Title:          title,
        CreatorID:      creatorID,
        Priority:       priority,
        OccurredAt:     time.Now(),
    })

    return task, nil
}

// StartWork transitions task from NEW to IN_PROGRESS
func (t *Task) StartWork(userID uuid.UUID) error {
    if t.Status != StatusNew {
        return ErrInvalidTransition
    }

    // Only creator or assignee can start work
    if t.CreatorID != userID && (t.AssigneeID == nil || *t.AssigneeID != userID) {
        return ErrUnauthorizedAction
    }

    oldStatus := t.Status
    t.Status = StatusInProgress
    t.UpdatedAt = time.Now()

    // Auto-assign if not assigned
    if t.AssigneeID == nil {
        t.AssigneeID = &userID
    }

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: userID,
        OccurredAt:  time.Now(),
    })

    return nil
}

// SubmitForReview transitions task from IN_PROGRESS to SUBMITTED_FOR_REVIEW
func (t *Task) SubmitForReview(userID uuid.UUID, submission SubmissionData) error {
    if t.Status != StatusInProgress {
        return ErrInvalidTransition
    }

    // Only assignee can submit
    if t.AssigneeID == nil || *t.AssigneeID != userID {
        return ErrNotAssignee
    }

    oldStatus := t.Status
    t.Status = StatusSubmittedForReview
    submission.SubmittedAt = time.Now()
    t.SubmissionData = &submission
    t.UpdatedAt = time.Now()

    t.AddDomainEvent(&TaskSubmittedForReviewEvent{
        TaskID:         t.ID,
        SubmittedBy:    userID,
        SubmissionData: submission,
        OccurredAt:     time.Now(),
    })

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: userID,
        OccurredAt:  time.Now(),
    })

    return nil
}

// Approve accepts the task (by admin or assistant)
func (t *Task) Approve(reviewerID uuid.UUID, role string) error {
    if t.Status != StatusSubmittedForReview {
        return ErrInvalidTransition
    }

    // Only admin or assistant can approve
    if role != "ADMIN" && role != "SUPER_ADMIN" && role != "ASSISTANT" {
        return ErrUnauthorizedAction
    }

    oldStatus := t.Status
    t.Status = StatusAccepted
    t.ReviewerID = &reviewerID
    t.UpdatedAt = time.Now()

    t.AddDomainEvent(&TaskApprovedEvent{
        TaskID:     t.ID,
        ApprovedBy: reviewerID,
        OccurredAt: time.Now(),
    })

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: reviewerID,
        OccurredAt:  time.Now(),
    })

    return nil
}

// Reject rejects the task with a reason (by admin or assistant)
func (t *Task) Reject(reviewerID uuid.UUID, role string, reason string) error {
    if t.Status != StatusSubmittedForReview {
        return ErrInvalidTransition
    }

    if role != "ADMIN" && role != "SUPER_ADMIN" && role != "ASSISTANT" {
        return ErrUnauthorizedAction
    }

    if reason == "" {
        return ErrRejectionReasonRequired
    }

    oldStatus := t.Status
    t.Status = StatusRejected
    t.RejectionReason = reason
    t.ReviewerID = &reviewerID
    t.UpdatedAt = time.Now()

    t.AddDomainEvent(&TaskRejectedEvent{
        TaskID:     t.ID,
        RejectedBy: reviewerID,
        Reason:     reason,
        OccurredAt: time.Now(),
    })

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: reviewerID,
        Reason:      reason,
        OccurredAt:  time.Now(),
    })

    return nil
}

// ContinueWork transitions rejected task back to IN_PROGRESS
func (t *Task) ContinueWork(userID uuid.UUID) error {
    if t.Status != StatusRejected {
        return ErrInvalidTransition
    }

    if t.AssigneeID == nil || *t.AssigneeID != userID {
        return ErrNotAssignee
    }

    oldStatus := t.Status
    t.Status = StatusInProgress
    t.RejectionReason = "" // Clear rejection reason
    t.SubmissionData = nil  // Clear previous submission
    t.UpdatedAt = time.Now()

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: userID,
        OccurredAt:  time.Now(),
    })

    return nil
}

// MarkCompleted marks accepted task as completed (ADMIN ONLY)
func (t *Task) MarkCompleted(adminID uuid.UUID, role string) error {
    if t.Status != StatusAccepted {
        return ErrInvalidTransition
    }

    // CRITICAL: Only admin can mark as completed
    if role != "ADMIN" && role != "SUPER_ADMIN" {
        return ErrOnlyAdminCanComplete
    }

    oldStatus := t.Status
    t.Status = StatusCompleted
    now := time.Now()
    t.CompletedAt = &now
    t.UpdatedAt = now

    t.AddDomainEvent(&TaskCompletedEvent{
        TaskID:      t.ID,
        CompletedBy: adminID,
        OccurredAt:  now,
    })

    t.AddDomainEvent(&TaskStatusChangedEvent{
        TaskID:      t.ID,
        FromStatus:  oldStatus,
        ToStatus:    t.Status,
        TriggeredBy: adminID,
        OccurredAt:  now,
    })

    return nil
}

// AddAttachment adds a file attachment to the task
func (t *Task) AddAttachment(attachment Attachment) error {
    if t.Status == StatusCompleted {
        return ErrTaskAlreadyCompleted
    }

    t.Attachments = append(t.Attachments, attachment)
    t.UpdatedAt = time.Now()

    t.AddDomainEvent(&TaskAttachmentAddedEvent{
        TaskID:     t.ID,
        FileID:     attachment.FileID,
        Filename:   attachment.Filename,
        IsCode:     attachment.IsCode,
        Language:   attachment.Language,
        UploadedBy: attachment.UploadedBy,
        OccurredAt: time.Now(),
    })

    return nil
}
```

### 2.2 Domain Events

```go
// services/workflow/internal/domain/task/events.go
package task

import (
    "time"

    "github.com/google/uuid"
)

// TaskCreatedEvent is raised when a new task is created
type TaskCreatedEvent struct {
    TaskID         string
    OrganizationID uuid.UUID
    Title          string
    CreatorID      uuid.UUID
    Priority       Priority
    OccurredAt     time.Time
}

func (e *TaskCreatedEvent) EventType() string   { return "task.created" }
func (e *TaskCreatedEvent) AggregateID() string { return e.TaskID }
func (e *TaskCreatedEvent) OccurredAt() time.Time { return e.OccurredAt }

// TaskStatusChangedEvent is raised when task status changes
type TaskStatusChangedEvent struct {
    TaskID      string
    FromStatus  Status
    ToStatus    Status
    TriggeredBy uuid.UUID
    Reason      string
    OccurredAt  time.Time
}

func (e *TaskStatusChangedEvent) EventType() string   { return "task.status_changed" }
func (e *TaskStatusChangedEvent) AggregateID() string { return e.TaskID }

// TaskSubmittedForReviewEvent is raised when task is submitted for review
type TaskSubmittedForReviewEvent struct {
    TaskID         string
    SubmittedBy    uuid.UUID
    SubmissionData SubmissionData
    OccurredAt     time.Time
}

func (e *TaskSubmittedForReviewEvent) EventType() string { return "task.submitted_for_review" }
func (e *TaskSubmittedForReviewEvent) AggregateID() string { return e.TaskID }

// TaskApprovedEvent is raised when task is approved
type TaskApprovedEvent struct {
    TaskID     string
    ApprovedBy uuid.UUID
    OccurredAt time.Time
}

func (e *TaskApprovedEvent) EventType() string   { return "task.approved" }
func (e *TaskApprovedEvent) AggregateID() string { return e.TaskID }

// TaskRejectedEvent is raised when task is rejected
type TaskRejectedEvent struct {
    TaskID     string
    RejectedBy uuid.UUID
    Reason     string
    OccurredAt time.Time
}

func (e *TaskRejectedEvent) EventType() string   { return "task.rejected" }
func (e *TaskRejectedEvent) AggregateID() string { return e.TaskID }

// TaskCompletedEvent is raised when task is marked completed
type TaskCompletedEvent struct {
    TaskID      string
    CompletedBy uuid.UUID
    OccurredAt  time.Time
}

func (e *TaskCompletedEvent) EventType() string   { return "task.completed" }
func (e *TaskCompletedEvent) AggregateID() string { return e.TaskID }

// TaskAttachmentAddedEvent is raised when attachment is added
type TaskAttachmentAddedEvent struct {
    TaskID     string
    FileID     uuid.UUID
    Filename   string
    IsCode     bool
    Language   string
    UploadedBy uuid.UUID
    OccurredAt time.Time
}

func (e *TaskAttachmentAddedEvent) EventType() string   { return "task.attachment_added" }
func (e *TaskAttachmentAddedEvent) AggregateID() string { return e.TaskID }
```

### 2.3 Repository Interface

```go
// services/workflow/internal/domain/task/repository.go
package task

import (
    "context"

    "github.com/google/uuid"
)

// Repository defines task persistence operations
type Repository interface {
    // FindByID retrieves a task by its ID
    FindByID(ctx context.Context, id string) (*Task, error)

    // FindByOrganization retrieves tasks for an organization with filters
    FindByOrganization(ctx context.Context, orgID uuid.UUID, filters TaskFilters) ([]*Task, int64, error)

    // FindForReview retrieves tasks pending review
    FindForReview(ctx context.Context, orgID uuid.UUID) ([]*Task, error)

    // Save persists a task (create or update)
    Save(ctx context.Context, task *Task) error

    // Delete removes a task
    Delete(ctx context.Context, id string) error
}

// TaskFilters contains filtering options for task queries
type TaskFilters struct {
    Status     []Status
    Priority   []Priority
    AssigneeID *uuid.UUID
    CreatorID  *uuid.UUID
    DueBefore  *time.Time
    DueAfter   *time.Time
    Tags       []string
    Search     string
    Page       int
    PageSize   int
    SortBy     string
    SortOrder  string
}
```

---

## 3. Review Queue System

### 3.1 Review Queue Service

```go
// services/workflow/internal/domain/review/queue.go
package review

import (
    "context"
    "time"

    "github.com/google/uuid"
    "github.com/taskmaster/services/workflow/internal/domain/task"
)

// QueueItem represents a task in the review queue
type QueueItem struct {
    ID             uuid.UUID
    OrganizationID uuid.UUID
    TaskID         string
    Task           *task.Task
    Priority       int // Calculated priority score
    AssignedTo     *uuid.UUID
    ClaimedAt      *time.Time
    CreatedAt      time.Time
}

// QueueService manages the review queue
type QueueService interface {
    // AddToQueue adds a task to the review queue
    AddToQueue(ctx context.Context, task *task.Task) error

    // GetPendingItems retrieves items waiting for review
    GetPendingItems(ctx context.Context, orgID uuid.UUID, limit int) ([]*QueueItem, error)

    // ClaimItem assigns a queue item to a reviewer
    ClaimItem(ctx context.Context, itemID uuid.UUID, reviewerID uuid.UUID) error

    // ReleaseItem releases a claimed item back to the queue
    ReleaseItem(ctx context.Context, itemID uuid.UUID) error

    // RemoveFromQueue removes a task from the queue (after review)
    RemoveFromQueue(ctx context.Context, taskID string) error
}

// PriorityCalculator calculates queue priority for a task
type PriorityCalculator struct{}

func (p *PriorityCalculator) Calculate(t *task.Task) int {
    score := 0

    // Base priority score
    switch t.Priority {
    case task.PriorityUrgent:
        score += 1000
    case task.PriorityHigh:
        score += 500
    case task.PriorityMedium:
        score += 100
    case task.PriorityLow:
        score += 10
    }

    // Age bonus (older tasks get higher priority)
    age := time.Since(t.CreatedAt)
    ageDays := int(age.Hours() / 24)
    score += ageDays * 5

    // Due date urgency
    if t.DueDate != nil {
        daysUntilDue := int(time.Until(*t.DueDate).Hours() / 24)
        if daysUntilDue < 0 {
            score += 2000 // Overdue
        } else if daysUntilDue < 1 {
            score += 500 // Due today
        } else if daysUntilDue < 3 {
            score += 200 // Due soon
        }
    }

    return score
}
```

---

## 4. Temporal Workflow

### 4.1 Task Approval Workflow

```go
// services/workflow/internal/application/workflows/task_workflow.go
package workflows

import (
    "time"

    "go.temporal.io/sdk/workflow"
    "github.com/taskmaster/services/workflow/internal/domain/task"
)

// TaskApprovalWorkflowInput contains workflow input
type TaskApprovalWorkflowInput struct {
    TaskID         string
    OrganizationID string
    SubmitterID    string
}

// TaskApprovalWorkflow orchestrates the task approval process
func TaskApprovalWorkflow(ctx workflow.Context, input TaskApprovalWorkflowInput) error {
    logger := workflow.GetLogger(ctx)
    logger.Info("Starting task approval workflow", "taskID", input.TaskID)

    // Activity options
    ao := workflow.ActivityOptions{
        StartToCloseTimeout: time.Minute * 5,
        RetryPolicy: &temporal.RetryPolicy{
            MaximumAttempts: 3,
        },
    }
    ctx = workflow.WithActivityOptions(ctx, ao)

    // Step 1: Add task to review queue
    var queueItemID string
    err := workflow.ExecuteActivity(ctx, AddToReviewQueueActivity, input.TaskID).Get(ctx, &queueItemID)
    if err != nil {
        return err
    }

    // Step 2: Notify admins/assistants about new review item
    err = workflow.ExecuteActivity(ctx, NotifyReviewersActivity, NotifyReviewersInput{
        OrganizationID: input.OrganizationID,
        TaskID:         input.TaskID,
    }).Get(ctx, nil)
    if err != nil {
        logger.Warn("Failed to notify reviewers", "error", err)
        // Don't fail workflow on notification failure
    }

    // Step 3: Wait for review decision (with timeout)
    var reviewDecision ReviewDecision
    reviewSelector := workflow.NewSelector(ctx)

    // Signal channel for review decision
    reviewChan := workflow.GetSignalChannel(ctx, "review_decision")
    reviewSelector.AddReceive(reviewChan, func(c workflow.ReceiveChannel, more bool) {
        c.Receive(ctx, &reviewDecision)
    })

    // Timeout after 7 days
    reviewSelector.AddFuture(workflow.NewTimer(ctx, time.Hour*24*7), func(f workflow.Future) {
        reviewDecision = ReviewDecision{
            Decision: "TIMEOUT",
            Reason:   "Review timeout - automatically escalated",
        }
    })

    reviewSelector.Select(ctx)

    // Step 4: Process review decision
    switch reviewDecision.Decision {
    case "APPROVE":
        err = workflow.ExecuteActivity(ctx, ApproveTaskActivity, ApproveTaskInput{
            TaskID:     input.TaskID,
            ReviewerID: reviewDecision.ReviewerID,
        }).Get(ctx, nil)
        if err != nil {
            return err
        }

        // Notify task submitter
        err = workflow.ExecuteActivity(ctx, NotifyTaskApprovedActivity, input.TaskID).Get(ctx, nil)

    case "REJECT":
        err = workflow.ExecuteActivity(ctx, RejectTaskActivity, RejectTaskInput{
            TaskID:     input.TaskID,
            ReviewerID: reviewDecision.ReviewerID,
            Reason:     reviewDecision.Reason,
        }).Get(ctx, nil)
        if err != nil {
            return err
        }

        // Notify task submitter with rejection reason
        err = workflow.ExecuteActivity(ctx, NotifyTaskRejectedActivity, NotifyTaskRejectedInput{
            TaskID: input.TaskID,
            Reason: reviewDecision.Reason,
        }).Get(ctx, nil)

    case "TIMEOUT":
        // Escalate to super admin
        err = workflow.ExecuteActivity(ctx, EscalateTaskActivity, input.TaskID).Get(ctx, nil)
    }

    // Step 5: Remove from review queue
    err = workflow.ExecuteActivity(ctx, RemoveFromReviewQueueActivity, input.TaskID).Get(ctx, nil)
    if err != nil {
        logger.Warn("Failed to remove from queue", "error", err)
    }

    logger.Info("Task approval workflow completed", "taskID", input.TaskID, "decision", reviewDecision.Decision)
    return nil
}

// ReviewDecision represents a review decision signal
type ReviewDecision struct {
    Decision   string // APPROVE, REJECT, TIMEOUT
    ReviewerID string
    Reason     string
}
```

---

## 5. API Endpoints

### 5.1 Task REST API

```yaml
# api/openapi/workflow.yaml
openapi: 3.0.3
info:
  title: Workflow API
  version: 2.0.0

paths:
  /api/v1/tasks:
    get:
      summary: List tasks
      parameters:
        - name: status
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [NEW, IN_PROGRESS, SUBMITTED_FOR_REVIEW, ACCEPTED, REJECTED, COMPLETED]
        - name: priority
          in: query
          schema:
            type: string
            enum: [LOW, MEDIUM, HIGH, URGENT]
        - name: assignee_id
          in: query
          schema:
            type: string
            format: uuid
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: page_size
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: List of tasks
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskListResponse'

    post:
      summary: Create a new task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskRequest'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskResponse'

  /api/v1/tasks/{id}:
    get:
      summary: Get task by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Task details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskResponse'

  /api/v1/tasks/{id}/start:
    post:
      summary: Start working on a task
      description: Transitions task from NEW to IN_PROGRESS
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Task started
        '400':
          description: Invalid transition

  /api/v1/tasks/{id}/submit:
    post:
      summary: Submit task for review
      description: Transitions task from IN_PROGRESS to SUBMITTED_FOR_REVIEW
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmitForReviewRequest'
      responses:
        '200':
          description: Task submitted for review
        '400':
          description: Invalid transition

  /api/v1/tasks/{id}/approve:
    post:
      summary: Approve task (admin/assistant only)
      description: Transitions task from SUBMITTED_FOR_REVIEW to ACCEPTED
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Task approved
        '403':
          description: Not authorized (not admin/assistant)

  /api/v1/tasks/{id}/reject:
    post:
      summary: Reject task (admin/assistant only)
      description: Transitions task from SUBMITTED_FOR_REVIEW to REJECTED
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RejectTaskRequest'
      responses:
        '200':
          description: Task rejected
        '400':
          description: Reason is required
        '403':
          description: Not authorized

  /api/v1/tasks/{id}/continue:
    post:
      summary: Continue working on rejected task
      description: Transitions task from REJECTED to IN_PROGRESS
      responses:
        '200':
          description: Task resumed
        '400':
          description: Invalid transition

  /api/v1/tasks/{id}/complete:
    post:
      summary: Mark task as completed (ADMIN ONLY)
      description: Transitions task from ACCEPTED to COMPLETED. Only administrators can perform this action.
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Task completed
        '403':
          description: Only admin can complete tasks

  /api/v1/tasks/{id}/attachments:
    post:
      summary: Add attachment to task
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '201':
          description: Attachment added

    get:
      summary: List task attachments
      responses:
        '200':
          description: List of attachments

  /api/v1/review-queue:
    get:
      summary: Get review queue (admin/assistant only)
      description: Returns tasks pending review, sorted by priority
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Review queue items
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReviewQueueResponse'

  /api/v1/review-queue/{id}/claim:
    post:
      summary: Claim a review queue item
      description: Assigns the queue item to the current reviewer
      responses:
        '200':
          description: Item claimed

  /api/v1/tasks/{id}/history:
    get:
      summary: Get task transition history
      responses:
        '200':
          description: List of status transitions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TaskHistoryResponse'

components:
  schemas:
    CreateTaskRequest:
      type: object
      required:
        - title
      properties:
        title:
          type: string
          maxLength: 500
        description:
          type: string
        priority:
          type: string
          enum: [LOW, MEDIUM, HIGH, URGENT]
          default: MEDIUM
        assignee_id:
          type: string
          format: uuid
        due_date:
          type: string
          format: date-time
        tags:
          type: array
          items:
            type: string
        entity_type:
          type: string
        entity_id:
          type: string
          format: uuid

    SubmitForReviewRequest:
      type: object
      required:
        - solution
      properties:
        solution:
          type: string
          description: Solution description or code
        comments:
          type: string
        metadata:
          type: object

    RejectTaskRequest:
      type: object
      required:
        - reason
      properties:
        reason:
          type: string
          minLength: 10
          description: Rejection reason (required)

    TaskResponse:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [NEW, IN_PROGRESS, SUBMITTED_FOR_REVIEW, ACCEPTED, REJECTED, COMPLETED]
        priority:
          type: string
        creator:
          $ref: '#/components/schemas/UserSummary'
        assignee:
          $ref: '#/components/schemas/UserSummary'
        reviewer:
          $ref: '#/components/schemas/UserSummary'
        due_date:
          type: string
          format: date-time
        completed_at:
          type: string
          format: date-time
        submission_data:
          $ref: '#/components/schemas/SubmissionData'
        rejection_reason:
          type: string
        attachments:
          type: array
          items:
            $ref: '#/components/schemas/Attachment'
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    SubmissionData:
      type: object
      properties:
        solution:
          type: string
        comments:
          type: string
        attachments:
          type: array
          items:
            type: string
            format: uuid
        submitted_at:
          type: string
          format: date-time

    Attachment:
      type: object
      properties:
        file_id:
          type: string
          format: uuid
        filename:
          type: string
        mime_type:
          type: string
        category:
          type: string
          enum: [CODE, DOCUMENT, SPREADSHEET, IMAGE, DATA, OTHER]
        is_code:
          type: boolean
        language:
          type: string
        uploaded_at:
          type: string
          format: date-time

    ReviewQueueResponse:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/ReviewQueueItem'
        total:
          type: integer

    ReviewQueueItem:
      type: object
      properties:
        id:
          type: string
          format: uuid
        task:
          $ref: '#/components/schemas/TaskResponse'
        priority_score:
          type: integer
        assigned_to:
          $ref: '#/components/schemas/UserSummary'
        claimed_at:
          type: string
          format: date-time
        created_at:
          type: string
          format: date-time

    TaskHistoryResponse:
      type: object
      properties:
        transitions:
          type: array
          items:
            $ref: '#/components/schemas/TaskTransition'

    TaskTransition:
      type: object
      properties:
        id:
          type: string
        from_status:
          type: string
        to_status:
          type: string
        triggered_by:
          $ref: '#/components/schemas/UserSummary'
        reason:
          type: string
        created_at:
          type: string
          format: date-time

    UserSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        first_name:
          type: string
        last_name:
          type: string
        avatar_url:
          type: string
```

---

## 6. Notifications

### 6.1 Notification Events

| Event | Recipients | Channels |
|-------|------------|----------|
| Task submitted for review | All admins/assistants | WebSocket, Email, Push |
| Task approved | Task creator, assignee | WebSocket, Email |
| Task rejected | Task assignee | WebSocket, Email |
| Task completed | Task creator | WebSocket |
| Review queue item claimed | Other reviewers | WebSocket |
| Task overdue | Assignee, admin | Email, Push |

### 6.2 Notification Service

```go
// services/notifications/internal/domain/notification.go
package notification

import (
    "context"

    "github.com/google/uuid"
)

type Channel string

const (
    ChannelWebSocket Channel = "websocket"
    ChannelEmail     Channel = "email"
    ChannelPush      Channel = "push"
    ChannelTelegram  Channel = "telegram"
)

type Notification struct {
    ID         uuid.UUID
    UserID     uuid.UUID
    Type       string
    Title      string
    Body       string
    Data       map[string]interface{}
    Channels   []Channel
    Read       bool
    ReadAt     *time.Time
    CreatedAt  time.Time
}

type NotificationService interface {
    // Send sends notification to a user
    Send(ctx context.Context, notification *Notification) error

    // SendToRole sends notification to all users with specific role
    SendToRole(ctx context.Context, orgID uuid.UUID, role string, notification *Notification) error

    // MarkAsRead marks notification as read
    MarkAsRead(ctx context.Context, notificationID uuid.UUID) error

    // GetUnread retrieves unread notifications for a user
    GetUnread(ctx context.Context, userID uuid.UUID) ([]*Notification, error)
}
```

---

## 7. Admin Review Interface

### 7.1 Review Dashboard Features

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN REVIEW DASHBOARD                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  REVIEW QUEUE                                                    [Refresh] [Filter] │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │  Priority │ Task                         │ Assignee    │ Submitted  │ Action     │   │
│  │  ──────────────────────────────────────────────────────────────────────────────   │   │
│  │  🔴 HIGH  │ Fix login bug               │ John Doe    │ 2 hours    │ [Review]   │   │
│  │  🟡 MED   │ Implement dashboard         │ Jane Smith  │ 5 hours    │ [Review]   │   │
│  │  🟢 LOW   │ Update documentation        │ Bob Wilson  │ 1 day      │ [Review]   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  TASK DETAILS: Fix login bug                                         [Claim]    │   │
│  ├─────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                 │   │
│  │  Description:                                                                   │   │
│  │  Users are unable to login when using special characters in password           │   │
│  │                                                                                 │   │
│  │  ─────────────────────────────────────────────────────────────────────────────  │   │
│  │                                                                                 │   │
│  │  SUBMISSION:                                                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Solution:                                                              │   │   │
│  │  │  Fixed the password validation regex to properly escape special chars   │   │   │
│  │  │                                                                        │   │   │
│  │  │  Comments:                                                             │   │   │
│  │  │  Also added unit tests to prevent regression                           │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  ATTACHMENTS:                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  📄 auth.service.ts (TypeScript)              [View Code] [Download]    │   │   │
│  │  │  📄 auth.spec.ts (TypeScript)                 [View Code] [Download]    │   │   │
│  │  │  📊 test-results.xlsx (Excel)                 [Preview]   [Download]    │   │   │
│  │  │  🖼️ screenshot.png (Image)                    [Preview]   [Download]    │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  CODE PREVIEW: auth.service.ts                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  1 │ // Fixed password validation                                       │   │   │
│  │  │  2 │ const validatePassword = (password: string): boolean => {          │   │   │
│  │  │  3 │   const regex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/;    │   │   │
│  │  │  4 │   return regex.test(password) && password.length >= 8;            │   │   │
│  │  │  5 │ };                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                 │   │
│  │  HISTORY:                                                                       │   │
│  │  • 2024-01-15 10:00 - Created by John Doe                                      │   │
│  │  • 2024-01-15 14:30 - Started work                                             │   │
│  │  • 2024-01-15 18:45 - Submitted for review                                     │   │
│  │                                                                                 │   │
│  │  ─────────────────────────────────────────────────────────────────────────────  │   │
│  │                                                                                 │   │
│  │  DECISION:                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │  [✅ APPROVE]    [❌ REJECT]                                            │   │   │
│  │  │                                                                        │   │   │
│  │  │  Rejection Reason (required if rejecting):                             │   │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │   │   │
│  │  │  │                                                                 │   │   │   │
│  │  │  │                                                                 │   │   │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 2.0
**Next:** File Upload System with Code Detection
