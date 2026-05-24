package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"practice-planner/backend/internal/app"
)

func main() {
	cfg, err := app.LoadConfig()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	store, err := newStore(ctx, cfg)
	if err != nil {
		log.Fatalf("database error: %v", err)
	}
	defer store.Close()

	server := newHTTPServer(cfg, store)

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	log.Printf("practice-planner backend listening on :%s", cfg.Port)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}

func newHTTPServer(cfg app.Config, store app.Store) *http.Server {
	return &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           app.NewServer(cfg, store).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func newStore(ctx context.Context, cfg app.Config) (app.Store, error) {
	if cfg.DatabaseURL == "memory" && cfg.Env != "production" {
		return app.NewMemoryStore(), nil
	}
	store, err := app.NewPostgresStore(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	if err := store.ApplyMigrations(ctx); err != nil {
		store.Close()
		return nil, err
	}
	return store, nil
}
