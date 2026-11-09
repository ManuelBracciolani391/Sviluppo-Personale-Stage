import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-side-bar',
  styleUrl: './side-bar.css',
  templateUrl: './side-bar.html',
})
export class SideBar {
  @Input() titoloPagina: string = '';
}
