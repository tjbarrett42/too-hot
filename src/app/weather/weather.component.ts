import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { SharedService } from '../shared.service';  // Update with the path to your service
import { PreferencesComponent } from '../preferences/preferences.component';
import * as spoofData from '../../assets/spoof.json'

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
  temperature_2m: ValuePreference;
  relativeHumidity_2m: ValuePreference;
}

interface ValuePreference {
  value: number;
  symbol: string;
  precisionValue: number;
  color: string;
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
    temperature_2m: {
      value: 0,
      symbol: `+-`,
      precisionValue: 5,
      color: 'red',
    },
    relativeHumidity_2m: {
      value: 0,
      symbol: `+-`,
      precisionValue: 5,
      color: 'blue'
    }
  };
  spoofing: boolean = true;

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
            acc[curr.attribute] = {value: curr.value, symbol: curr.symbol, precisionValue: curr.precisionValue, color: curr.color } as ValuePreference;
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
    this.distance = 50;
    this.pointsToCheck = [];
    this.pointsToCheck = this.generateGrid(this.userLocation, 30, this.distance);
  
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

    if (this.spoofing) {
      this.pointsToCheck.forEach((point) => {
        const latLng = this.map.containerPointToLatLng(point);
  
        this.latLngElements.push({ latLng, element: null! });
      });
      this.http.get('../../assets/spoof.json').subscribe((data) => {
        this.weatherData = data as WeatherData[];
        console.log(this.weatherData);
        this.displayLocations();
      });
    } else {
      this.pointsToCheck.forEach((point) => {
      const latLng = this.map.containerPointToLatLng(point);

      this.latLngElements.push({ latLng, element: null! });

      let weatherObservable = this.http.get<WeatherData>(
        `https://customer-api.open-meteo.com/v1/forecast?latitude=${latLng.lat}&longitude=${latLng.lng}&hourly=temperature_2m,relativehumidity_2m&temperature_unit=fahrenheit&apikey=tU9Zk9YSzmTTV6kZ`
      );
      weatherObservables.push(weatherObservable);
      });

      forkJoin(weatherObservables).subscribe((weatherDataArray) => {
        this.weatherData = weatherDataArray;
        console.log(this.weatherData);
        this.displayLocations();
      });
    }
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

displayLocations() { // Build rectangle elements and gets popups bound and data bound to each element
  const currentZoomLevel = this.map.getZoom();
  const zoomAdjustmentFactor = this.initialZoomLevel ? Math.pow(2, this.initialZoomLevel - currentZoomLevel) : 1;
  const halfDistance = (this.distance / 2) * zoomAdjustmentFactor;

  this.weatherData.forEach((data: WeatherData, index: number) => {
      const latLng = this.latLngElements[index].latLng;

      const temperature = data.hourly.temperature_2m[this.currentHour];
      const humidity = data.hourly.relativehumidity_2m[this.currentHour];

      let color = 'green'; // default to green

      const centerPoint = this.map.latLngToContainerPoint(latLng);

      // Calculate the pixel coordinates of the corners of the rectangle
      const northWestPoint = L.point(centerPoint.x - halfDistance, centerPoint.y - halfDistance);
      const southEastPoint = L.point(centerPoint.x + halfDistance, centerPoint.y + halfDistance);

      // Convert these pixel coordinates back to lat-lng
      const northWestLatLng = this.map.containerPointToLatLng(northWestPoint);
      const southEastLatLng = this.map.containerPointToLatLng(southEastPoint);

      // Create bounds for the rectangle
      const bounds: L.LatLngBoundsExpression = [[northWestLatLng.lat, northWestLatLng.lng], [southEastLatLng.lat, southEastLatLng.lng]];

      const rectangle = L.rectangle(bounds, { color, fillOpacity: 0.5, stroke: false})
      .bindPopup(`Location: ${latLng.lat}, ${latLng.lng}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`)
      .bindTooltip(`Location: ${latLng.lat}, ${latLng.lng}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`)
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
  }
  this.updateWeatherDataOnMap();  
}

  updateSliderValue(event: any) {
    this.currentHour = Number(event.target.value);
    this.updateWeatherDataOnMap();
  }

  updateWeatherDataOnMap() {
    this.elements.forEach(({ data, element }) => {
      const temperature = data.hourly.temperature_2m[this.currentHour];
      const humidity = data.hourly.relativehumidity_2m[this.currentHour];

      let colors: any = [];
      let opacities: any = [];
      let attributes = 0;
      let stroke = true;

      // Iterate thru attributes (temp and humidity)
      Object.entries(this.preferences).forEach(([key, keyData], index) => {
        console.log(key, keyData);
        attributes += 1;
        let value = keyData.value;
        let symbol = keyData.symbol;
        let precisionValue = keyData.precisionValue;
        let color = keyData.color;
        
        colors.push(color);
        
        const attributeName = key;
        console.log('att: ', attributeName);
        console.log('all data: ', data);

        const currentValue = data.hourly[attributeName  as keyof typeof data.hourly][this.currentHour];
        
        // TODO: how do i connect this to the specific temperature?
        const difference = (currentValue as number) - value;
        
        // case for symbol
        switch (symbol) {
          case 'within':
            if (difference > precisionValue || difference < precisionValue*-1) { 
              opacities.push(0);
              stroke = false;
            } else {
              opacities.push((1 - Math.abs(difference / precisionValue)) / 2)
            }
            break;
          case 'lessthan':
            console.log('lessthan');
            if (difference > precisionValue) { 
              opacities.push(0);
              stroke = false;   
            }
            break;
          case 'greaterthan':
            console.log('greaterthan');
            if (difference < precisionValue*-1) {
              opacities.push(0);
              stroke = false;
            }
            break;
        }
      });
      
      //take average opacity
      let newOpacity = opacities.reduce((acc: number, cur: number) => acc + cur, 0) / opacities.length;

      // take average color
      let totalRgbValue = [ 0, 0, 0 ];

      Object.entries(colors).forEach(([key, data], index) => {
        console.log(data)
        let newRgbColor = this.hexToRgb(data);
        if (opacities[index] > 0 ) {
          totalRgbValue[0] += newRgbColor.r;
          totalRgbValue[1] += newRgbColor.g;
          totalRgbValue[2] += newRgbColor.b;
        }
      });

      // highlight 
      totalRgbValue[0] /= attributes;
      totalRgbValue[1] /= attributes;
      totalRgbValue[2] /= attributes; 

      let newHexColor = this.rgbToHex(Math.round(totalRgbValue[0]), Math.round(totalRgbValue[1]), Math.round(totalRgbValue[2]));

      console.log('opacitiesLen: ', opacities.length);

      if (element instanceof L.Rectangle) {
        element.setStyle({ color: newHexColor, fillOpacity: newOpacity, stroke: stroke });
        
        element.setPopupContent(
          `Location: ${data.latitude}, ${data.longitude}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`
        );
      }
      
      // TODO: reintroduce closest element later

      // let closestElementData: MapElement | null = null;
      // let minDifference: number = Infinity;
  
      // if (Math.abs(difference) < minDifference) {
      //   minDifference = Math.abs(difference);
      //   closestElementData = { data, element };
      // }
      // if (closestElementData) {
      //   (closestElementData['element'] as L.Rectangle).openPopup();
      // }
    });
  }

  hexToRgb(hex: any): any {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  componentToHex(c: number) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  rgbToHex(r: number, g: number, b: number) {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
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
