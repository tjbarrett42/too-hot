import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { WeatherComponent } from './weather/weather.component';
import { SharedService } from './shared.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'too-hot';
  data: any;
  
  constructor(
    private apiService: ApiService,
    private sharedService: SharedService
  ) { }

  ngOnInit() {
    this.apiService.getSomeData().subscribe((response) => {
      this.data = response;
    });
  }

  preferences: any = [];
  preferencesForm: any = [];

  updatePreferences(newPreferences: any) {
    this.preferences = newPreferences;
    this.sharedService.triggerEvent(newPreferences);
  }
}