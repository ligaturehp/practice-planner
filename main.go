package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist/frontend/browser
var assets embed.FS

func main() {
	planService, err := NewPlanService()
	if err != nil {
		log.Fatal(err)
	}
	defer planService.close()

	app := application.New(application.Options{
		Name:        "Practice Planner",
		Description: "Local weekly demand planner for coaches.",
		Services: []application.Service{
			application.NewService(planService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            "Practice Planner",
		URL:              "/",
		Width:            1440,
		Height:           960,
		MinWidth:         1120,
		MinHeight:        720,
		BackgroundColour: application.NewRGB(248, 246, 239),
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
