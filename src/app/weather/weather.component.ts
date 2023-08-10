import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { SharedService } from '../shared.service';  // Update with the path to your service
import { PreferencesComponent } from '../preferences/preferences.component';

interface Location {
    latitude: number;
    longitude: number;
  }

interface WeatherData {
  elevation: number;
  generationtime_ms: number;
  hourly: {
    relativehumidity_2m: number[];
    temperature_2m: number[];
    time: string[];
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
    relativehumidity_2m: string;
  };
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
}

interface Preferences {
  temperature: ValuePreference;
  humidity: ValuePreference;
}

interface ValuePreference {
  value: number;
  symbol: string;
  precisionValue: number;
}

interface MapElement {
  data: WeatherData;
  element: L.Rectangle | L.Marker;
}

interface LatLngElement {
  latLng: L.LatLng;
  element: L.Rectangle | L.Marker;
}

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss']
})
export class WeatherComponent implements OnInit {
  @ViewChild('map') mapContainer!: ElementRef;

  @Input() preferencesForm: any = [];
  private map!: L.Map;
  private markers: { data: WeatherData, marker: L.Marker }[] = [];
  userLocation: Location = { latitude: 0, longitude: 0 };  // Initialized to prevent errors
  pointsToCheck: L.Point[] = [];
  weatherData: WeatherData[] = [];
  private elements: MapElement[] = [];
  private latLngElements: LatLngElement[] = [];
  private distance: number = 100  ;
  private initialZoomLevel: number | null = null;
  maxHours: number = 168; // total hours in a week
  currentHour: number = 0;
  forecastStart: Date = new Date();
  preferenceForm: any;
  preferences: Preferences = {
    temperature: {
      value: 0,
      symbol: `+-`,
      precisionValue: 5
    },
    humidity: {
      value: 0,
      symbol: `+-`,
      precisionValue: 5
    }
  };

  constructor(
    private formBuilder: FormBuilder, 
    private http: HttpClient, 
    private sharedService: SharedService, 
    private preferencesComponent: PreferencesComponent
  ) { }

  ngOnInit() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      this.initMap(); // Init the map here after the location is set
      this.sharedService.trigger$.subscribe((preferenceForm: FormGroup) => {
        this.preferenceForm = preferenceForm;
        if (this.preferenceForm.valid) {
          this.preferences = this.preferenceForm.value.reduce((acc: any, curr: any) => {
            acc[curr.attribute] = {value: curr.value, symbol: curr.symbol, precisionValue: curr.precisionValue } as ValuePreference;
            
            return acc;
        }, {} as Preferences);
        this.onSubmit()
        }
        
      });
    });
  }

  initMap() {
    this.map = L.map(this.mapContainer.nativeElement).setView([this.userLocation.latitude, this.userLocation.longitude], 10);
    this.initialZoomLevel = this.map.getZoom();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(this.map);
  
    this.map.whenReady(() => {
      this.calculatePoints();
    });
  
    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
  }
  
  calculatePoints() {
    this.distance = 1000;
    this.pointsToCheck = [];
    this.pointsToCheck = this.generateGrid(this.userLocation, 21, this.distance);
  
    this.fetchWeatherData(); // Fetch the data after calculating points
  }

  generateGrid(center: Location, gridSize: number, distance: number): L.Point[] {
    const centerPoint = this.map.latLngToContainerPoint([center.latitude, center.longitude]);
    const points: L.Point[] = [];

    // Calculate the offset to center the grid on the center point
    const offset = ((gridSize / 2) * distance) - (distance / 2);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const point = L.point(
          centerPoint.x - offset + i * distance, // Subtract the offset and add the current position
          centerPoint.y - offset + j * distance  // Subtract the offset and add the current position
        );
        points.push(point);
      }
    }
    return points;
}

  fetchWeatherData() {
    let weatherObservables: Observable<WeatherData>[] = [];

    this.pointsToCheck.forEach((point) => {
      const latLng = this.map.containerPointToLatLng(point);

      this.latLngElements.push({ latLng, element: null! });

      let weatherObservable = this.http.get<WeatherData>(
        `https://api.open-meteo.com/v1/forecast?latitude=${latLng.lat}&longitude=${latLng.lng}&hourly=temperature_2m,relativehumidity_2m&temperature_unit=fahrenheit`
      );
      weatherObservables.push(weatherObservable);
    });

    forkJoin(weatherObservables).subscribe((weatherDataArray) => {
      this.weatherData = weatherDataArray;
      this.displayLocations();
    });
  }
  
  updateMap() {
    this.removeLocations();
  } 

removeLocations() {
    this.elements.forEach(({ element }) => {
        this.map.removeLayer(element);
    });
    this.elements = [];
    this.latLngElements = [];
}

displayLocations() {
  // const submittedTemperature: any = this.preferences[0]['value'];

  const currentZoomLevel = this.map.getZoom();
  const zoomAdjustmentFactor = this.initialZoomLevel ? Math.pow(2, this.initialZoomLevel - currentZoomLevel) : 1;

  const halfDistance = (this.distance / 2) * zoomAdjustmentFactor;

  this.weatherData.forEach((data: WeatherData, index: number) => {
      const latLng = this.latLngElements[index].latLng;

      const temperature = data.hourly.temperature_2m[this.currentHour]; // updated this line
      const humidity = data.hourly.relativehumidity_2m[this.currentHour]; // updated this line

      // const difference = temperature - submittedTemperature;
      let color = 'green'; // default to green
      // if (difference > 5) {
      //   color = 'yellow'; // if the temperature is more than 5 degrees higher, make it yellow
      // } else if (difference < -5) {
      //   color = 'blue'; // if the temperature is more than 5 degrees lower, make it blue
      // }

      const centerPoint = this.map.latLngToContainerPoint(latLng);

      // Calculate the pixel coordinates of the corners of the rectangle
      const northWestPoint = L.point(centerPoint.x - halfDistance, centerPoint.y - halfDistance);
      const southEastPoint = L.point(centerPoint.x + halfDistance, centerPoint.y + halfDistance);

      // Convert these pixel coordinates back to lat-lng
      const northWestLatLng = this.map.containerPointToLatLng(northWestPoint);
      const southEastLatLng = this.map.containerPointToLatLng(southEastPoint);

      // Create bounds for the rectangle
      const bounds: L.LatLngBoundsExpression = [[northWestLatLng.lat, northWestLatLng.lng], [southEastLatLng.lat, southEastLatLng.lng]];

      const rectangle = L.rectangle(bounds, { color, fillOpacity: 0.5 })
      .bindPopup(`Location: ${latLng.lat}, ${latLng.lng}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`)
      .addTo(this.map);

      this.elements.push({ data: data, element: rectangle });
  });

  // Set the center of the map to the user's location
  this.map.setView([this.userLocation.latitude, this.userLocation.longitude], this.map.getZoom());
}

onSubmit() {
  console.log('pref ', this.preferences);

    if (this.preferenceForm.valid) {
      const submittedTemperature: any = this.preferencesForm.value;

    let closestElementData: MapElement | null = null;
    let minDifference: number = Infinity;

    this.elements.forEach(({ data, element }) => {
      const temperature = data.hourly.temperature_2m[0];

      const difference = temperature - submittedTemperature;
      let newColor = 'purple'; // default to green
      if (difference > 5) {
        newColor = 'yellow'; // if the temperature is more than 5 degrees higher, make it yellow
      } else if (difference < -5) {
        newColor = 'blue'; // if the temperature is more than 5 degrees lower, make it blue
      }
      
      if (Math.abs(difference) < minDifference) {
        minDifference = Math.abs(difference);
        closestElementData = { data, element };
      }

      // Check if the element is a Rectangle and set the new color
      if (element instanceof L.Rectangle) {
        element.setStyle({ color: newColor });
      }
    });

    // Check if closestElementData has been assigned and is not null
    if (closestElementData) {
      (closestElementData['element'] as L.Rectangle).openPopup();
    }
  }
  this.updateWeatherDataOnMap();  
}

  updatePreferences(newPreferences: { lat: number, lon: number }) {
    this.userLocation.latitude = newPreferences.lat;
    this.userLocation.longitude = newPreferences.lon;
    this.displayLocations();
  }

  updateSliderValue(event: any) {
    this.currentHour = Number(event.target.value);
    this.updateWeatherDataOnMap();
  }

  updateWeatherDataOnMap() {
    console.log('updateWeather: ', this.preferences.temperature);
    const submittedTemperature: any = this.preferences.temperature.value;
  
    this.elements.forEach(({ data, element }) => {
      const temperature = data.hourly.temperature_2m[this.currentHour];
      const humidity = data.hourly.relativehumidity_2m[this.currentHour];
  
      const difference = temperature - submittedTemperature;
      let newColor = 'green'; // default to green
      // case for symbol

      switch (this.preferences.temperature.symbol) {
        case 'within':
          console.log('within');
          if (difference > this.preferences.temperature.precisionValue) { 
            newColor = 'orange'; 
          } else if (difference < this.preferences.temperature.precisionValue*-1) {
            newColor = 'blue';
          }
          break;
        case 'lessthan':
          console.log('lessthan');
          if (difference > this.preferences.temperature.precisionValue) { 
            newColor = 'orange'; 
          }
          break;
        case 'greaterthan':
          console.log('greaterthan');
          if (difference < this.preferences.temperature.precisionValue*-1) {
            newColor = 'blue';
          }
          break;
      }
  
      if (element instanceof L.Rectangle) {
        element.setStyle({ color: newColor });
        element.setPopupContent(
          `Location: ${data.latitude}, ${data.longitude}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`
        );
      }
    });
  }
  
  getCurrentDayAndHour(): string {
    // Create a new date that is the forecast start plus the number of hours
    let date = new Date(this.forecastStart.getTime() + this.currentHour * 60 * 60 * 1000);

    // Format the date
    let day = date.toLocaleString('default', { weekday: 'long' }); // e.g. Monday
    let hour = date.getHours();

    return `${day}, ${hour}:00`;
  }
}
