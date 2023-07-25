import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';

const iconRetinaUrl = 'assets/images/marker-icon-2x.png';
const iconUrl = 'assets/images/marker-icon.png';
const shadowUrl = 'assets/images/marker-shadow.png';
const iconDefault = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;



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
  private map!: L.Map;
  private markers: { data: WeatherData, marker: L.Marker }[] = [];
  weatherForm: FormGroup;
  userLocation: Location = null!;
  pointsToCheck: L.Point[] = [];
  weatherData: WeatherData[] = [];
  private elements: MapElement[] = [];
  private latLngElements: LatLngElement[] = [];
  private distance: number = 100  ;
  private initialZoomLevel: number | null = null;
  maxHours: number = 168; // total hours in a week
  currentHour: number = 0;
  forecastStart: Date = new Date();

  

  constructor(private formBuilder: FormBuilder, private http: HttpClient) {
    this.weatherForm = this.formBuilder.group({
      temperature: ['', Validators.required],
      humidity: ['', Validators.required]
    });
  }

  ngOnInit() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      // this.calculatePoints();
      this.initMap(); // Init the map here after the location is set
      // this.fetchWeatherData(); // Fetch the data after the map is initialized
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
    console.log('distance in calculatePoints:', this.distance);
    this.distance = 10;
    this.pointsToCheck = [];
    this.pointsToCheck = this.generateGrid(this.userLocation, 9, this.distance);
  
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

    console.log('points ', points);
    return points;
}


  

  fetchWeatherData() {
    console.log('fetchWeatherData', this.pointsToCheck.length);

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
      console.log(weatherDataArray);
      this.weatherData = weatherDataArray;
      console.log('weatherDataArray.length', weatherDataArray.length);

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
  console.log('displayLocations', this.weatherData.length, this.latLngElements.length);

  console.log('zoom level in displayLocations:', this.map.getZoom());

  console.log('distance in displayLocations:', this.distance);
  const submittedTemperature = this.weatherForm.value.temperature;

  const currentZoomLevel = this.map.getZoom();
  const zoomAdjustmentFactor = this.initialZoomLevel ? Math.pow(2, this.initialZoomLevel - currentZoomLevel) : 1;

  const halfDistance = (this.distance / 2) * zoomAdjustmentFactor;

  this.weatherData.forEach((data: WeatherData, index: number) => {
      const latLng = this.latLngElements[index].latLng;


      const temperature = data.hourly.temperature_2m[this.currentHour]; // updated this line
      const humidity = data.hourly.relativehumidity_2m[this.currentHour]; // updated this line

      const difference = temperature - submittedTemperature;
      let color = 'green'; // default to green
      if (difference > 5) {
        color = 'yellow'; // if the temperature is more than 5 degrees higher, make it yellow
      } else if (difference < -5) {
        color = 'blue'; // if the temperature is more than 5 degrees lower, make it blue
      }

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
  if (this.weatherForm.valid) {
    console.log(this.weatherForm.value);

    const submittedTemperature = this.weatherForm.value.temperature;

    let closestElementData: MapElement | null = null;
    let minDifference: number = Infinity;

    this.elements.forEach(({ data, element }) => {
      const temperature = data.hourly.temperature_2m[0];

      const difference = temperature - submittedTemperature;
      let newColor = 'green'; // default to green
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
}

  
  updateSliderValue(event: any) {
    this.currentHour = Number(event.target.value);
    this.updateWeatherDataOnMap();
  }

  updateWeatherDataOnMap() {
    const submittedTemperature = this.weatherForm.value.temperature;
  
    this.elements.forEach(({ data, element }) => {
      const temperature = data.hourly.temperature_2m[this.currentHour];
      const humidity = data.hourly.relativehumidity_2m[this.currentHour];
  
      const difference = temperature - submittedTemperature;
      let newColor = 'green'; // default to green
      if (difference > 5) {
        newColor = 'orange'; // if the temperature is more than 5 degrees higher, make it yellow
      } else if (difference < -5) {
        newColor = 'blue'; // if the temperature is more than 5 degrees lower, make it blue
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
