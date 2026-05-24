package app

import (
	"strings"
	"testing"
)

func TestLoadConfigRejectsUnsafeProductionSettings(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/planner")
	t.Setenv("SESSION_SECRET", "short")
	t.Setenv("ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "")

	if _, err := LoadConfig(); err == nil || !strings.Contains(err.Error(), "SESSION_SECRET") {
		t.Fatalf("expected weak production session secret to be rejected, got %v", err)
	}

	t.Setenv("SESSION_SECRET", "0123456789abcdef0123456789abcdef")
	if _, err := LoadConfig(); err == nil || !strings.Contains(err.Error(), "ALLOWED_ORIGINS") {
		t.Fatalf("expected missing production origins to be rejected, got %v", err)
	}

	t.Setenv("ALLOWED_ORIGINS", "http://localhost:4200")
	if _, err := LoadConfig(); err == nil || !strings.Contains(err.Error(), "https") {
		t.Fatalf("expected production localhost origin to be rejected, got %v", err)
	}

	t.Setenv("ALLOWED_ORIGINS", "*")
	if _, err := LoadConfig(); err == nil || !strings.Contains(err.Error(), "wildcard") {
		t.Fatalf("expected wildcard origin to be rejected, got %v", err)
	}
}

func TestLoadConfigAcceptsExplicitProductionOrigins(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/planner")
	t.Setenv("SESSION_SECRET", "0123456789abcdef0123456789abcdef")
	t.Setenv("ENV", "production")
	t.Setenv("ALLOWED_ORIGINS", "https://app.example.com,https://coach.example.com")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("expected production config to load, got %v", err)
	}
	if !cfg.CookieSecure {
		t.Fatal("expected production cookies to be secure")
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Fatalf("expected two allowed origins, got %d", len(cfg.AllowedOrigins))
	}
}
