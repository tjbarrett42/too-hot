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
import { TourService } from 'ngx-ui-tour-md-menu';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

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
    private authPresetService: AuthPresetService,
    private tourService: TourService
  ) { }
  
  ngOnInit() {
    this.tourService.initialize([
    {
      anchorId: 'search',
      content: `Welcome to TooHot! If this is your first time, I'd recommend following this tutorial.`,
      title: 'Welcome!',
    },
    {
      anchorId: 'search',
      content: 'Search for and choose a location or set as your current coordinates (default).',
      title: 'Step 1',
    },
    {
      anchorId: 'search',
      content: `Click 'Gen' to generate the weather data for this location.`,
      title: 'Step 2',
      
    },
    {
      anchorId: 'preferencesButton',
      content: `Open the preferences editor on the top right of the screen.`,
      title: 'Step 3',
    },
    {
      anchorId: 'preferences',
      content: `Toggle the temperature on and move the sliders around! Try multiple! Purple lined squares indicate where these settings are true.`,
      title: 'Step 4',
     
    },
    {
      anchorId: 'preferencesButton',
      content: `Close the preferences editor.`,
      title: 'Step 5',
    },
    {
      anchorId: 'weather',
      content: `Open the 'Forecast Timeline' and drag the slider to see into the future!`,
      title: 'Step 6',
    },
  ]);
    this.tourService.start();
  }

  isDrawerOpen = false; // manage the state of the drawer

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
    
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

}