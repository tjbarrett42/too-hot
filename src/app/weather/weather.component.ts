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

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss']
})
export class WeatherComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapContainer!: ElementRef;
  private map!: L.Map;
  private markers: { data: WeatherData, marker: L.Marker }[] = [];
  weatherForm: FormGroup;
  userLocation: Location = null!;
  pointsToCheck: Location[] = [];
  weatherData: WeatherData[] = [];

  constructor(private formBuilder: FormBuilder, private http: HttpClient) {
    this.weatherForm = this.formBuilder.group({
      temperature: ['', Validators.required],
      humidity: ['', Validators.required]
    });
  }

  ngOnInit() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      this.calculatePoints();
      this.initMap(); // Init the map here after the location is set
      this.fetchWeatherData(); // Fetch the data after the map is initialized
    });
  }

  ngAfterViewInit() {
  }

  initMap() {
    this.map = L.map(this.mapContainer.nativeElement).setView([this.userLocation.latitude, this.userLocation.longitude], 13);
    setTimeout(() => {
      this.map.invalidateSize();
  }, 0);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(this.map);
  }

  calculatePoints() {
    const milesPerDegreeLatitude = 69.172;
    const milesPerDegreeLongitude = Math.cos(this.userLocation.latitude * Math.PI / 180) * 69.172;
    const milesAway = 20;
    const degreesLatitude = milesAway / milesPerDegreeLatitude;
    const degreesLongitude = milesAway / milesPerDegreeLongitude;

    this.pointsToCheck = [
      {latitude: this.userLocation.latitude, longitude: this.userLocation.longitude - degreesLongitude}, // west
      {latitude: this.userLocation.latitude + degreesLatitude, longitude: this.userLocation.longitude}, // north
      {latitude: this.userLocation.latitude, longitude: this.userLocation.longitude + degreesLongitude}, // east
      {latitude: this.userLocation.latitude - degreesLatitude, longitude: this.userLocation.longitude}, // south
      {latitude: this.userLocation.latitude, longitude: this.userLocation.longitude} // current
    ];
  }

  fetchWeatherData() {
    let weatherObservables: Observable<WeatherData>[] = [];

    this.pointsToCheck.forEach((point) => {
      let weatherObservable = this.http.get<WeatherData>(
        `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}&hourly=temperature_2m,relativehumidity_2m&temperature_unit=fahrenheit`
      );
      weatherObservables.push(weatherObservable);
    });

    forkJoin(weatherObservables).subscribe((weatherDataArray) => {
      console.log(weatherDataArray);
      this.weatherData = weatherDataArray;
      this.displayLocations();
    });

    
  }

  displayLocations() {
  this.weatherData.forEach((data: WeatherData) => {
    const lat = data.latitude;
    const lon = data.longitude;

    const temperature = data.hourly.temperature_2m[0];
    const humidity = data.hourly.relativehumidity_2m[0];

    const leafletIcon = L.icon({
      iconUrl: 'leaflet/marker-icon.png',
      shadowUrl: 'leaflet/marker-shadow.png',
    });

    const marker = L.marker([lat, lon], { icon: leafletIcon })
      .bindPopup(`Location: ${lat}, ${lon}<br>Temperature: ${temperature}°F<br>Humidity: ${humidity}%`)
      .addTo(this.map);

    this.markers.push({ data: data, marker: marker });
  });

  // code to adjust map bounds
  const group = new L.FeatureGroup(this.markers.map(m => m.marker));
  this.map.fitBounds(group.getBounds());
}

onSubmit() {
  if (this.weatherForm.valid) {
    console.log(this.weatherForm.value);

    const submittedTemperature = this.weatherForm.value.temperature;

    let closestMarkerData: { data: WeatherData; marker: L.Marker } | null = null;
    let minDifference: number = Infinity;

    this.markers.forEach(({ data, marker }) => {
      const temperature = data.hourly.temperature_2m[0];

      const difference = Math.abs(temperature - submittedTemperature);
      if (difference < minDifference) {
        minDifference = difference;
        closestMarkerData = { data, marker };
      }
    });

    // Check if closestMarkerData has been assigned and is not null
    if (closestMarkerData) {
      (closestMarkerData['marker'] as L.Marker).openPopup();
    }
    
  }
}

  
  
}
