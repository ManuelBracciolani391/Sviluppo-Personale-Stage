import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SideBar } from '../side-bar/side-bar';

@Component({
  imports: [RouterLink, SideBar],
  selector: 'app-impostazioni',
  standalone: true,
  templateUrl: './impostazioni.html',
  styleUrl: './impostazioni.css',
})
export class Impostazioni {}
