package app

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL    string
	SessionSecret  string
	AllowedOrigins []string
	Port           string
	Env            string
	CookieSecure   bool
}

func LoadConfig() (Config, error) {
	cfg := Config{
		DatabaseURL:   strings.TrimSpace(os.Getenv("DATABASE_URL")),
		SessionSecret: strings.TrimSpace(os.Getenv("SESSION_SECRET")),
		Port:          strings.TrimSpace(os.Getenv("PORT")),
		Env:           strings.TrimSpace(os.Getenv("ENV")),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.Env == "" {
		cfg.Env = "development"
	}
	if cfg.SessionSecret == "" {
		return Config{}, errors.New("SESSION_SECRET is required")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	cfg.AllowedOrigins = parseCSV(os.Getenv("ALLOWED_ORIGINS"))
	if len(cfg.AllowedOrigins) == 0 {
		cfg.AllowedOrigins = []string{"http://localhost:4200", "http://127.0.0.1:4200"}
	}
	cfg.CookieSecure = strings.EqualFold(cfg.Env, "production")

	return cfg, nil
}

func parseCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}
