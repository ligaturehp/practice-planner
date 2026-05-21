import { Component } from '@angular/core';
import { PlannerShellComponent } from './components/planner-shell/planner-shell.component';

@Component({
  selector: 'app-root',
  imports: [PlannerShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
