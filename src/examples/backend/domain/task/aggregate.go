// Package task provides the Task aggregate root for workflow management
package task

import (
	"errors"
	"time"

	"github.com/google/uuid"
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

// Domain errors
var (
	ErrInvalidTransition       = errors.New("invalid status transition")
	ErrUnauthorizedAction      = errors.New("unauthorized action")
	ErrOnlyAdminCanComplete    = errors.New("only admin can mark task as completed")
	ErrRejectionReasonRequired = errors.New("rejection reason is required")
	ErrTaskAlreadyCompleted    = errors.New("task is already completed")
	ErrNotAssignee             = errors.New("user is not task assignee")
)

// Task is the aggregate root for task management
type Task struct {
	id              uuid.UUID
	organizationID  uuid.UUID
	title           string
	description     string
	status          Status
	priority        Priority
	creatorID       uuid.UUID
	assigneeID      *uuid.UUID
	reviewerID      *uuid.UUID
	dueDate         *time.Time
	completedAt     *time.Time
	submissionData  *SubmissionData
	rejectionReason string
	tags            []string
	attachments     []Attachment
	version         int64
	createdAt       time.Time
	updatedAt       time.Time
	events          []DomainEvent
}

// SubmissionData contains data submitted for review
type SubmissionData struct {
	Solution    string
	Comments    string
	Attachments []uuid.UUID
	SubmittedAt time.Time
}

// Attachment represents a file attached to task
type Attachment struct {
	FileID     uuid.UUID
	Filename   string
	MimeType   string
	IsCode     bool
	Language   string
	UploadedAt time.Time
	UploadedBy uuid.UUID
}

// DomainEvent represents something that happened in the domain
type DomainEvent interface {
	EventType() string
	AggregateID() uuid.UUID
	OccurredAt() time.Time
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

	now := time.Now()
	task := &Task{
		id:             uuid.New(),
		organizationID: orgID,
		title:          title,
		description:    description,
		status:         StatusNew,
		priority:       priority,
		creatorID:      creatorID,
		tags:           []string{},
		attachments:    []Attachment{},
		version:        0,
		createdAt:      now,
		updatedAt:      now,
		events:         []DomainEvent{},
	}

	task.addEvent(&TaskCreatedEvent{
		taskID:         task.id,
		organizationID: orgID,
		title:          title,
		creatorID:      creatorID,
		priority:       priority,
		occurredAt:     now,
	})

	return task, nil
}

// ID returns the task ID
func (t *Task) ID() uuid.UUID { return t.id }

// Status returns the current status
func (t *Task) Status() Status { return t.status }

// Title returns the task title
func (t *Task) Title() string { return t.title }

// StartWork transitions task from NEW to IN_PROGRESS
func (t *Task) StartWork(userID uuid.UUID) error {
	if t.status != StatusNew {
		return ErrInvalidTransition
	}

	// Only creator or assignee can start work
	if t.creatorID != userID && (t.assigneeID == nil || *t.assigneeID != userID) {
		return ErrUnauthorizedAction
	}

	oldStatus := t.status
	t.status = StatusInProgress
	t.updatedAt = time.Now()

	// Auto-assign if not assigned
	if t.assigneeID == nil {
		t.assigneeID = &userID
	}

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: userID,
		occurredAt:  time.Now(),
	})

	return nil
}

// SubmitForReview transitions task from IN_PROGRESS to SUBMITTED_FOR_REVIEW
func (t *Task) SubmitForReview(userID uuid.UUID, solution, comments string, attachmentIDs []uuid.UUID) error {
	if t.status != StatusInProgress {
		return ErrInvalidTransition
	}

	// Only assignee can submit
	if t.assigneeID == nil || *t.assigneeID != userID {
		return ErrNotAssignee
	}

	oldStatus := t.status
	t.status = StatusSubmittedForReview
	t.submissionData = &SubmissionData{
		Solution:    solution,
		Comments:    comments,
		Attachments: attachmentIDs,
		SubmittedAt: time.Now(),
	}
	t.updatedAt = time.Now()

	t.addEvent(&TaskSubmittedForReviewEvent{
		taskID:      t.id,
		submittedBy: userID,
		solution:    solution,
		occurredAt:  time.Now(),
	})

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: userID,
		occurredAt:  time.Now(),
	})

	return nil
}

// Approve accepts the task (by admin or assistant)
func (t *Task) Approve(reviewerID uuid.UUID, role string) error {
	if t.status != StatusSubmittedForReview {
		return ErrInvalidTransition
	}

	// Only admin or assistant can approve
	if role != "ADMIN" && role != "SUPER_ADMIN" && role != "ASSISTANT" {
		return ErrUnauthorizedAction
	}

	oldStatus := t.status
	t.status = StatusAccepted
	t.reviewerID = &reviewerID
	t.updatedAt = time.Now()

	t.addEvent(&TaskApprovedEvent{
		taskID:     t.id,
		approvedBy: reviewerID,
		occurredAt: time.Now(),
	})

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: reviewerID,
		occurredAt:  time.Now(),
	})

	return nil
}

// Reject rejects the task with a reason (by admin or assistant)
func (t *Task) Reject(reviewerID uuid.UUID, role string, reason string) error {
	if t.status != StatusSubmittedForReview {
		return ErrInvalidTransition
	}

	if role != "ADMIN" && role != "SUPER_ADMIN" && role != "ASSISTANT" {
		return ErrUnauthorizedAction
	}

	if reason == "" {
		return ErrRejectionReasonRequired
	}

	oldStatus := t.status
	t.status = StatusRejected
	t.rejectionReason = reason
	t.reviewerID = &reviewerID
	t.updatedAt = time.Now()

	t.addEvent(&TaskRejectedEvent{
		taskID:     t.id,
		rejectedBy: reviewerID,
		reason:     reason,
		occurredAt: time.Now(),
	})

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: reviewerID,
		reason:      reason,
		occurredAt:  time.Now(),
	})

	return nil
}

// ContinueWork transitions rejected task back to IN_PROGRESS
func (t *Task) ContinueWork(userID uuid.UUID) error {
	if t.status != StatusRejected {
		return ErrInvalidTransition
	}

	if t.assigneeID == nil || *t.assigneeID != userID {
		return ErrNotAssignee
	}

	oldStatus := t.status
	t.status = StatusInProgress
	t.rejectionReason = ""
	t.submissionData = nil
	t.updatedAt = time.Now()

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: userID,
		occurredAt:  time.Now(),
	})

	return nil
}

// MarkCompleted marks accepted task as completed (ADMIN ONLY)
func (t *Task) MarkCompleted(adminID uuid.UUID, role string) error {
	if t.status != StatusAccepted {
		return ErrInvalidTransition
	}

	// CRITICAL: Only admin can mark as completed
	if role != "ADMIN" && role != "SUPER_ADMIN" {
		return ErrOnlyAdminCanComplete
	}

	oldStatus := t.status
	t.status = StatusCompleted
	now := time.Now()
	t.completedAt = &now
	t.updatedAt = now

	t.addEvent(&TaskCompletedEvent{
		taskID:      t.id,
		completedBy: adminID,
		occurredAt:  now,
	})

	t.addEvent(&TaskStatusChangedEvent{
		taskID:      t.id,
		fromStatus:  oldStatus,
		toStatus:    t.status,
		triggeredBy: adminID,
		occurredAt:  now,
	})

	return nil
}

// AddAttachment adds a file attachment to the task
func (t *Task) AddAttachment(attachment Attachment) error {
	if t.status == StatusCompleted {
		return ErrTaskAlreadyCompleted
	}

	t.attachments = append(t.attachments, attachment)
	t.updatedAt = time.Now()

	t.addEvent(&TaskAttachmentAddedEvent{
		taskID:     t.id,
		fileID:     attachment.FileID,
		filename:   attachment.Filename,
		isCode:     attachment.IsCode,
		language:   attachment.Language,
		uploadedBy: attachment.UploadedBy,
		occurredAt: time.Now(),
	})

	return nil
}

// GetDomainEvents returns all pending domain events
func (t *Task) GetDomainEvents() []DomainEvent {
	return t.events
}

// ClearDomainEvents clears all pending domain events
func (t *Task) ClearDomainEvents() {
	t.events = nil
}

func (t *Task) addEvent(event DomainEvent) {
	t.events = append(t.events, event)
}

// Events

// TaskCreatedEvent is raised when a new task is created
type TaskCreatedEvent struct {
	taskID         uuid.UUID
	organizationID uuid.UUID
	title          string
	creatorID      uuid.UUID
	priority       Priority
	occurredAt     time.Time
}

func (e *TaskCreatedEvent) EventType() string      { return "task.created" }
func (e *TaskCreatedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskCreatedEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskStatusChangedEvent is raised when task status changes
type TaskStatusChangedEvent struct {
	taskID      uuid.UUID
	fromStatus  Status
	toStatus    Status
	triggeredBy uuid.UUID
	reason      string
	occurredAt  time.Time
}

func (e *TaskStatusChangedEvent) EventType() string      { return "task.status_changed" }
func (e *TaskStatusChangedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskStatusChangedEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskSubmittedForReviewEvent is raised when task is submitted for review
type TaskSubmittedForReviewEvent struct {
	taskID      uuid.UUID
	submittedBy uuid.UUID
	solution    string
	occurredAt  time.Time
}

func (e *TaskSubmittedForReviewEvent) EventType() string      { return "task.submitted_for_review" }
func (e *TaskSubmittedForReviewEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskSubmittedForReviewEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskApprovedEvent is raised when task is approved
type TaskApprovedEvent struct {
	taskID     uuid.UUID
	approvedBy uuid.UUID
	occurredAt time.Time
}

func (e *TaskApprovedEvent) EventType() string      { return "task.approved" }
func (e *TaskApprovedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskApprovedEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskRejectedEvent is raised when task is rejected
type TaskRejectedEvent struct {
	taskID     uuid.UUID
	rejectedBy uuid.UUID
	reason     string
	occurredAt time.Time
}

func (e *TaskRejectedEvent) EventType() string      { return "task.rejected" }
func (e *TaskRejectedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskRejectedEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskCompletedEvent is raised when task is marked completed
type TaskCompletedEvent struct {
	taskID      uuid.UUID
	completedBy uuid.UUID
	occurredAt  time.Time
}

func (e *TaskCompletedEvent) EventType() string      { return "task.completed" }
func (e *TaskCompletedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskCompletedEvent) OccurredAt() time.Time  { return e.occurredAt }

// TaskAttachmentAddedEvent is raised when attachment is added
type TaskAttachmentAddedEvent struct {
	taskID     uuid.UUID
	fileID     uuid.UUID
	filename   string
	isCode     bool
	language   string
	uploadedBy uuid.UUID
	occurredAt time.Time
}

func (e *TaskAttachmentAddedEvent) EventType() string      { return "task.attachment_added" }
func (e *TaskAttachmentAddedEvent) AggregateID() uuid.UUID { return e.taskID }
func (e *TaskAttachmentAddedEvent) OccurredAt() time.Time  { return e.occurredAt }
