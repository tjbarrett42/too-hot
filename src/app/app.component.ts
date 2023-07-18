import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { WeatherComponent } from './weather/weather.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'too-hot';
  data: any;

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.apiService.getSomeData().subscribe((response) => {
      this.data = response;
    });
  }
}