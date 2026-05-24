package app

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
)

const minProductionSessionSecretLength = 32

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
	if err := validateProductionSecret(cfg.Env, cfg.SessionSecret); err != nil {
		return Config{}, err
	}

	cfg.AllowedOrigins = parseCSV(os.Getenv("ALLOWED_ORIGINS"))
	if len(cfg.AllowedOrigins) == 0 {
		if strings.EqualFold(cfg.Env, "production") {
			return Config{}, errors.New("ALLOWED_ORIGINS is required in production")
		}
		cfg.AllowedOrigins = []string{"http://localhost:4200", "http://127.0.0.1:4200"}
	}
	if err := validateProductionOrigins(cfg.Env, cfg.AllowedOrigins); err != nil {
		return Config{}, err
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

func validateProductionSecret(env string, secret string) error {
	if !strings.EqualFold(env, "production") {
		return nil
	}
	if len(secret) < minProductionSessionSecretLength {
		return fmt.Errorf("SESSION_SECRET must be at least %d characters in production", minProductionSessionSecretLength)
	}
	switch secret {
	case "dev-secret-change-me", "test-session-secret":
		return errors.New("SESSION_SECRET must not use a development placeholder in production")
	}
	return nil
}

func validateProductionOrigins(env string, origins []string) error {
	if !strings.EqualFold(env, "production") {
		return nil
	}
	for _, origin := range origins {
		if strings.Contains(origin, "*") {
			return errors.New("wildcard origins are not allowed in production")
		}
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return fmt.Errorf("production origin %q must be an absolute https origin", origin)
		}
		host := parsed.Hostname()
		if host == "localhost" || host == "127.0.0.1" || host == "::1" {
			return fmt.Errorf("production origin %q must not use a local host", origin)
		}
	}
	return nil
}
