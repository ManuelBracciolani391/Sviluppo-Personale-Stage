import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SideBar } from '../side-bar/side-bar';

@Component({
  imports: [RouterLink, SideBar],
  selector: 'app-impostazioni',
  styleUrl: './impostazioni.css',
  templateUrl: './impostazioni.html',
})
export class Impostazioni {}
