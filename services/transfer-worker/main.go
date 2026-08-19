package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type TransferTask struct {
	ID               string    `json:"id"`
	FileName         string    `json:"file_name"`
	FileSize         int64     `json:"file_size"`
	SourceAccountID  string    `json:"source_account_id"`
	SourceDriveName  string    `json:"source_drive_name"`
	TargetAccountID  string    `json:"target_account_id"`
	TargetDriveName  string    `json:"target_drive_name"`
	Status           string    `json:"status"` // "queued", "processing", "completed", "failed"
	ProgressPercent  float64   `json:"progress_percent"`
	ChunksTransferred int      `json:"chunks_transferred"`
	TotalChunks      int       `json:"total_chunks"`
	SpeedMBps        float64   `json:"speed_mbps"`
	CreatedAt        time.Time `json:"created_at"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
}

type TransferRequest struct {
	FileName        string `json:"file_name"`
	FileSize        int64  `json:"file_size"`
	SourceAccountID string `json:"source_account_id"`
	SourceDriveName string `json:"source_drive_name"`
	TargetAccountID string `json:"target_account_id"`
	TargetDriveName string `json:"target_drive_name"`
}

type WorkerQueue struct {
	tasks map[string]*TransferTask
	queue chan *TransferTask
	mu    sync.RWMutex
}

var queue *WorkerQueue

func NewWorkerQueue(bufferSize int) *WorkerQueue {
	return &WorkerQueue{
		tasks: make(map[string]*TransferTask),
		queue: make(chan *TransferTask, bufferSize),
	}
}

func (wq *WorkerQueue) StartWorkers(workerCount int) {
	for i := 1; i <= workerCount; i++ {
		go wq.worker(i)
	}
}

func (wq *WorkerQueue) worker(workerID int) {
	log.Printf("[Go Worker %d] Started and listening for cross-drive transfer tasks...", workerID)
	for task := range wq.queue {
		wq.mu.Lock()
		task.Status = "processing"
		wq.mu.Unlock()

		totalChunks := task.TotalChunks
		if totalChunks <= 0 {
			totalChunks = 10
		}

		startTime := time.Now()
		for chunk := 1; chunk <= totalChunks; chunk++ {
			time.Sleep(150 * time.Millisecond) // Simulate concurrent chunk streaming
			wq.mu.Lock()
			task.ChunksTransferred = chunk
			task.ProgressPercent = (float64(chunk) / float64(totalChunks)) * 100.0
			elapsedSec := time.Since(startTime).Seconds()
			if elapsedSec > 0 {
				bytesTransferred := (float64(task.FileSize) / float64(totalChunks)) * float64(chunk)
				task.SpeedMBps = (bytesTransferred / (1024 * 1024)) / elapsedSec
			}
			wq.mu.Unlock()
		}

		now := time.Now()
		wq.mu.Lock()
		task.Status = "completed"
		task.ProgressPercent = 100.0
		task.CompletedAt = &now
		wq.mu.Unlock()

		log.Printf("[Go Worker %d] Successfully transferred file %s (%d bytes) from %s to %s",
			workerID, task.FileName, task.FileSize, task.SourceDriveName, task.TargetDriveName)
	}
}

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func handleTransfer(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method == "GET" {
		queue.mu.RLock()
		taskList := make([]*TransferTask, 0, len(queue.tasks))
		for _, task := range queue.tasks {
			taskList = append(taskList, task)
		}
		queue.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
			"engine":  "Go High-Performance Goroutine Transfer Worker",
			"active_workers": 8,
			"tasks":   taskList,
		})
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	taskID := fmt.Sprintf("task_%d", time.Now().UnixNano())
	fileSize := req.FileSize
	if fileSize <= 0 {
		fileSize = 15728640 // 15 MB default
	}

	task := &TransferTask{
		ID:               taskID,
		FileName:         req.FileName,
		FileSize:         fileSize,
		SourceAccountID:  req.SourceAccountID,
		SourceDriveName:  req.SourceDriveName,
		TargetAccountID:  req.TargetAccountID,
		TargetDriveName:  req.TargetDriveName,
		Status:           "queued",
		ProgressPercent:  0.0,
		ChunksTransferred: 0,
		TotalChunks:      10,
		SpeedMBps:        0.0,
		CreatedAt:        time.Now(),
	}

	queue.mu.Lock()
	queue.tasks[taskID] = task
	queue.mu.Unlock()

	queue.queue <- task

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "queued",
		"task_id": taskID,
		"message": fmt.Sprintf("Goroutine transfer worker queued task for %s", req.FileName),
		"engine":  "Go Goroutine Parallel Transfer Engine",
		"task":    task,
	})
}

func main() {
	queue = NewWorkerQueue(100)
	queue.StartWorkers(8) // Launch 8 concurrent Goroutines

	http.HandleFunc("/api/v1/transfer", handleTransfer)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(&w)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"worker": "Go Transfer Engine v1.0",
		})
	})

	log.Println("Go Transfer Worker Service running on port 8080...")
	if err := http.ListenAndServe("0.0.0.0:8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
