package app

import (
	"encoding/json"
	"errors"
	"fmt"
)

var validDayIDs = map[string]struct{}{
	"sat": {},
	"sun": {},
	"mon": {},
	"tue": {},
	"wed": {},
	"thu": {},
	"fri": {},
}

var validSports = map[string]struct{}{
	"football": {},
	"rugby":    {},
}

var validTemplates = map[string]struct{}{
	"gameFriday":   {},
	"gameSaturday": {},
}

var validWorkloadLevels = map[string]struct{}{
	"Low":    {},
	"Medium": {},
	"High":   {},
}

var validWeekOrders = map[string]struct{}{
	"mondayFirst": {},
	"sundayFirst": {},
	"gameDayLast": {},
}

var validDayReadiness = map[string]struct{}{
	"":         {},
	"standard": {},
	"protect":  {},
	"push":     {},
}

type plannerPayload struct {
	SelectedDay       string                           `json:"selectedDay"`
	Sport             string                           `json:"sport"`
	Template          string                           `json:"template"`
	Days              []plannerPayloadDay              `json:"days"`
	RowLabels         []string                         `json:"rowLabels"`
	Grid              map[string][]string              `json:"grid"`
	Blocks            map[string][]plannerPayloadBlock `json:"blocks"`
	BlockLabelPresets []plannerPayloadBlockLabelPreset `json:"blockLabelPresets"`
}

type plannerPayloadDay struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Title       string `json:"title"`
	Objective   string `json:"objective"`
	Readiness   string `json:"readiness"`
	Constraints string `json:"constraints"`
	Notes       string `json:"notes"`
}

type plannerPayloadBlock struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Category  string   `json:"category"`
	Level     string   `json:"level"`
	Minutes   int      `json:"minutes"`
	Demand    int      `json:"demand"`
	Tags      []string `json:"tags"`
	Exposures []string `json:"exposures"`
	Notes     string   `json:"notes"`
}

type plannerPayloadBlockLabelPreset struct {
	ID        string   `json:"id"`
	Label     string   `json:"label"`
	Category  string   `json:"category"`
	Level     string   `json:"level"`
	Minutes   int      `json:"minutes"`
	Demand    int      `json:"demand"`
	Tags      []string `json:"tags"`
	Exposures []string `json:"exposures"`
	Notes     string   `json:"notes"`
}

func validatePlanInput(input PlanInput) error {
	if _, ok := validSports[input.Sport]; !ok {
		return errors.New("valid sport is required")
	}
	if _, ok := validTemplates[input.Template]; !ok {
		return errors.New("valid template is required")
	}
	if input.LockVersion != nil && *input.LockVersion < 1 {
		return errors.New("valid lock_version is required")
	}

	var payload plannerPayload
	if err := json.Unmarshal(input.PlanJSON, &payload); err != nil {
		return errors.New("valid planner payload is required")
	}
	if payload.Sport != input.Sport || payload.Template != input.Template {
		return errors.New("plan metadata must match planner payload")
	}
	if !isValidDayID(payload.SelectedDay) {
		return errors.New("valid selected day is required")
	}
	if len(payload.Days) == 0 || len(payload.Days) > 7 {
		return errors.New("valid planner days are required")
	}
	if len(payload.RowLabels) == 0 || len(payload.RowLabels) > 20 {
		return errors.New("valid row labels are required")
	}
	seenDays := map[string]struct{}{}
	for _, day := range payload.Days {
		if !isValidDayID(day.ID) || day.Label == "" || len(day.Label) > 12 || len(day.Title) > 120 {
			return errors.New("valid planner days are required")
		}
		if _, ok := validDayReadiness[day.Readiness]; !ok || len(day.Objective) > 500 || len(day.Constraints) > 500 || len(day.Notes) > 1200 {
			return errors.New("valid planner day details are required")
		}
		seenDays[day.ID] = struct{}{}
	}
	if len(seenDays) != 7 {
		return errors.New("all planner days are required")
	}
	if err := validateGrid(payload.Grid); err != nil {
		return err
	}
	if err := validateBlocks(payload.Blocks); err != nil {
		return err
	}
	if len(payload.BlockLabelPresets) > 100 {
		return errors.New("too many block label presets")
	}
	for _, preset := range payload.BlockLabelPresets {
		block := plannerPayloadBlock{
			ID:        preset.ID,
			Name:      preset.Label,
			Category:  preset.Category,
			Level:     preset.Level,
			Minutes:   preset.Minutes,
			Demand:    preset.Demand,
			Tags:      preset.Tags,
			Exposures: preset.Exposures,
			Notes:     preset.Notes,
		}
		if err := validateBlock(block); err != nil {
			return fmt.Errorf("invalid block label preset: %w", err)
		}
	}
	return nil
}

func validateGrid(grid map[string][]string) error {
	if len(grid) != 7 {
		return errors.New("all planner grid days are required")
	}
	for dayID, cells := range grid {
		if !isValidDayID(dayID) {
			return errors.New("valid planner grid days are required")
		}
		if len(cells) == 0 || len(cells) > 20 {
			return errors.New("valid planner grid rows are required")
		}
		for _, cell := range cells {
			if len(cell) > 200 {
				return errors.New("planner grid cell is too long")
			}
		}
	}
	return nil
}

func validateBlocks(blocks map[string][]plannerPayloadBlock) error {
	if len(blocks) != 7 {
		return errors.New("all planner block days are required")
	}
	for dayID, dayBlocks := range blocks {
		if !isValidDayID(dayID) {
			return errors.New("valid planner block days are required")
		}
		if len(dayBlocks) > 30 {
			return errors.New("too many training blocks for a day")
		}
		for _, block := range dayBlocks {
			if err := validateBlock(block); err != nil {
				return err
			}
		}
	}
	return nil
}

func validateBlock(block plannerPayloadBlock) error {
	if block.ID == "" || len(block.ID) > 120 {
		return errors.New("valid training block id is required")
	}
	if block.Name == "" || len(block.Name) > 120 {
		return errors.New("valid training block name is required")
	}
	if block.Category == "" || len(block.Category) > 100 {
		return errors.New("valid training block category is required")
	}
	if _, ok := validWorkloadLevels[block.Level]; !ok {
		return errors.New("valid training block level is required")
	}
	if block.Minutes < 0 || block.Minutes > 600 {
		return errors.New("valid training block minutes are required")
	}
	if block.Demand < 0 || block.Demand > 10 {
		return errors.New("valid training block demand is required")
	}
	if len(block.Tags) > 20 || len(block.Exposures) > 20 {
		return errors.New("too many training block labels")
	}
	for _, value := range append(append([]string{}, block.Tags...), block.Exposures...) {
		if len(value) > 100 {
			return errors.New("training block label is too long")
		}
	}
	if len(block.Notes) > 1000 {
		return errors.New("training block notes are too long")
	}
	return nil
}

func isValidDayID(dayID string) bool {
	_, ok := validDayIDs[dayID]
	return ok
}

func validWeekOrder(value string) bool {
	_, ok := validWeekOrders[value]
	return ok
}
