import { Component } from '@angular/core';

import { AppShellComponent } from './shared/components/app-shell/app-shell';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}