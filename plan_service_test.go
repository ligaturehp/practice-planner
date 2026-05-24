package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPlanServiceProvisionsSQLiteAndPersistsPlans(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "practice-planner.sqlite")
	service, err := NewPlanServiceAt(dbPath)
	if err != nil {
		t.Fatalf("expected service to open sqlite database: %v", err)
	}
	defer service.close()

	if _, err := os.Stat(dbPath); err != nil {
		t.Fatalf("expected sqlite database to be provisioned: %v", err)
	}

	saved, err := service.SavePlan(" Week 1 ", map[string]any{
		"sport":    "football",
		"template": "gameFriday",
	})
	if err != nil {
		t.Fatalf("expected plan to save: %v", err)
	}
	if saved.Name != "Week 1" {
		t.Fatalf("expected trimmed plan name, got %q", saved.Name)
	}

	plans, err := service.ListPlans()
	if err != nil {
		t.Fatalf("expected plans to list: %v", err)
	}
	if len(plans) != 1 || plans[0].ID != saved.ID {
		t.Fatalf("expected saved plan in list, got %#v", plans)
	}

	if err := service.DeletePlan(saved.ID); err != nil {
		t.Fatalf("expected plan delete to succeed: %v", err)
	}
	plans, err = service.ListPlans()
	if err != nil {
		t.Fatalf("expected plans to list after delete: %v", err)
	}
	if len(plans) != 0 {
		t.Fatalf("expected no plans after delete, got %#v", plans)
	}
}
