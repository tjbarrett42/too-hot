import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { WeatherComponent } from './weather/weather.component';
import { SharedService } from './shared.service';
import { LocationService } from './location.service';
import { Subject } from 'rxjs';
import { SearchComponent } from './search/search.component';

export interface PlaceSearchCoords {
  latitude: any;
  longitude: any;
}

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
    private preferenceService: SharedService,
    private locationService: LocationService
  ) { }

  ngOnInit() {
    
  }

  preferences: any = [];
  preferencesForm: any = [];

  updatePreferences(newPreferences: any) {
    this.preferences = newPreferences;
    this.preferenceService.triggerEvent(newPreferences);
  }

  updateLocation(location: any){
    this.locationService.triggerEvent(location);
  }

  eventsSubject: Subject<void> = new Subject<void>();

  yourFunctionToHandleLocation(location: string) {
    // Call your weather API here
  }
}