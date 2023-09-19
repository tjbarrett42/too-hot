import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { WeatherComponent } from './weather/weather.component';
import { LocationService } from './location.service';
import { Subject } from 'rxjs';
import { SearchComponent } from './search/search.component';
import { PreferenceService } from './preference.service';
import { GenerateService } from './generate.service';
import { NavbarComponent } from './navbar/navbar.component'
import { AuthPresetService } from './auth-preset.service';

export interface PlaceSearchCoords {
  lat: any;
  lng: any;
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
    private preferenceService: PreferenceService,
    private locationService: LocationService,
    private generateService: GenerateService,
    private authPresetService: AuthPresetService
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

  generateResults(){
    this.generateService.triggerEvent();
  }

  eventsSubject: Subject<void> = new Subject<void>();

  yourFunctionToHandleLocation(location: string) {
    // Call your weather API here
  }
}