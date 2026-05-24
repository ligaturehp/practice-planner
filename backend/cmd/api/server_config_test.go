package main

import (
	"testing"
	"time"

	"practice-planner/backend/internal/app"
)

func TestNewHTTPServerConfiguresProductionTimeouts(t *testing.T) {
	server := newHTTPServer(app.Config{Port: "9090"}, nil)

	if server.Addr != ":9090" {
		t.Fatalf("expected server addr :9090, got %q", server.Addr)
	}
	if server.ReadHeaderTimeout < 5*time.Second {
		t.Fatalf("expected read header timeout, got %s", server.ReadHeaderTimeout)
	}
	if server.ReadTimeout < 10*time.Second {
		t.Fatalf("expected read timeout, got %s", server.ReadTimeout)
	}
	if server.WriteTimeout < 10*time.Second {
		t.Fatalf("expected write timeout, got %s", server.WriteTimeout)
	}
	if server.IdleTimeout < 30*time.Second {
		t.Fatalf("expected idle timeout, got %s", server.IdleTimeout)
	}
}
