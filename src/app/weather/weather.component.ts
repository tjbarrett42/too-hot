import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { PreferenceService } from '../preference.service';  // Update with the path to your service
import { LocationService } from '../location.service';
import { PreferencesComponent } from '../preferences/preferences.component';
import * as spoofData from '../../assets/spoof.json'
import { PlaceSearchCoords } from '../app.component';
import { GenerateService } from '../generate.service';
import { icon, Marker } from 'leaflet';

const iconRetinaUrl = '../assets/images/marker-icon-2x.png';
const iconUrl = '../assets/images/marker-icon.png';
const shadowUrl = '../assets/images/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
Marker.prototype.options.icon = iconDefault;

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
    precipitation_probability: number[];
    cloudcover: number[];
    windspeed_10m: number[];
    soil_moisture_0_1cm: number[];
    uv_index: number[];
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
    relativehumidity_2m: string;
    precipitation_probability: string;
    cloudcover: string;
    windspeed_10m: string;
    soil_moisture_0_1cm: string;
    uv_index: string;
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
  precipitation_probability: ValuePreference;
  cloudcover: ValuePreference;
  windspeed_10m: ValuePreference;
  soil_moisture_0_1cm: ValuePreference;
  uv_index: ValuePreference;
}

interface ValuePreference {
  toggleValue: boolean;
  minValue: number;
  maxValue: number;
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
  private elementCache: { [key: string]: L.Rectangle | L.Marker } = {};
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
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    relativeHumidity_2m: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    precipitation_probability: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    cloudcover: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    windspeed_10m: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    soil_moisture_0_1cm: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
    uv_index: {
      toggleValue: true,
      minValue: 0,
      maxValue: 1
    },
  }
  spoofing: boolean = false;
  isBottomDrawerOpen = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient, 
    private preferenceService: PreferenceService, 
    private locationService: LocationService,
    private generateService: GenerateService,
  ) { }

  ngOnInit() {
    const locationSubscription = this.locationService.trigger$.subscribe((location: any) => {
      this.userLocation = { latitude: location.lat, longitude: location.lng };
      this.initMap(); // Init the map here after the location is set
      this.map.whenReady(() => {
        this.calculatePoints();
      });

      const generateSubscription = this.generateService.trigger$.subscribe(() => {
        this.fetchWeatherData();
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];
        if (this.preferenceForm) {
          this.preferences = this.preferenceForm.value.preferences.reduce((acc: any, curr: any) => {
            acc[curr.attribute] = {minValue: curr.minValue, maxValue: curr.maxValue, toggleValue: curr.toggleValue };
            return acc;
        })};
        this.onSubmit();
        
        const preferenceSubscription = this.preferenceService.trigger$.subscribe((preferenceForm: FormGroup) => {
          this.preferenceForm = preferenceForm;
          if (this.preferenceForm) {
            this.preferences = this.preferenceForm.value.preferences.reduce((acc: any, curr: any) => {
              acc[curr.attribute] = {minValue: curr.minValue, maxValue: curr.maxValue, toggleValue: curr.toggleValue };
              return acc;
          }, {});
          this.onSubmit()
          }
        });
      });
      this.subscriptions.push(generateSubscription);
    });
  }

  initMap() {
    if (this.map) {
      this.map.remove();
    }
    this.map = L.map(this.mapContainer.nativeElement, {attributionControl: false }).setView([this.userLocation.latitude, this.userLocation.longitude], 10);

    L.control.scale().addTo(this.map);

    this.initialZoomLevel = this.map.getZoom();

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(this.map);


    L.marker([this.userLocation.latitude, this.userLocation.longitude]).addTo(this.map);

    this.map.removeControl(this.map.zoomControl);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
  }
  
  calculatePoints() {
    this.distance = 70;
    this.pointsToCheck = [];
    this.pointsToCheck = this.generateGrid(this.userLocation, 21, this.distance);
  }

  generateGrid(center: Location, gridSize: number, distance: number): L.Point[] {
    console.log('center: ', center);
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
    this.map.setView([this.userLocation.latitude, this.userLocation.longitude], this.map.getZoom());

    let weatherObservables: Observable<WeatherData>[] = [];
    this.weatherData = [];
    this.latLngElements = [];

    if (this.spoofing) {
      this.pointsToCheck.forEach((point) => {
        const latLng = this.map.containerPointToLatLng(point);
  
        this.latLngElements.push({ latLng, element: null! });
      });
      this.http.get('../../assets/spoof.json').subscribe((data) => {
        this.weatherData = data as WeatherData[];
        this.displayLocations();
        this.onSubmit()
      });
    } else {
      this.pointsToCheck.forEach((point) => {
      const latLng = this.map.containerPointToLatLng(point);

      this.latLngElements.push({ latLng, element: null! });

      let weatherObservable = this.http.get<WeatherData>(
        `https://customer-api.open-meteo.com/v1/forecast?latitude=${latLng.lat}&longitude=${latLng.lng}&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,cloudcover,windspeed_10m,soil_moisture_0_1cm,uv_index&temperature_unit=fahrenheit&windspeed_unit=mph&apikey=tU9Zk9YSzmTTV6kZ`
      );
      weatherObservables.push(weatherObservable);
      });

      forkJoin(weatherObservables).subscribe((weatherDataArray) => {
        this.weatherData = weatherDataArray;
        this.displayLocations();
      });
    }
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

    // Set the center of the map to the user's location
    

    this.weatherData.forEach((data: WeatherData, index: number) => {
        const latLng = this.latLngElements[index].latLng;

        const temperature = data.hourly.temperature_2m[this.currentHour];
        const humidity = data.hourly.relativehumidity_2m[this.currentHour];
        const precipitation_probability = data.hourly.precipitation_probability[this.currentHour];
        const cloudcover = data.hourly.cloudcover[this.currentHour];
        const windspeed_10m = data.hourly.windspeed_10m[this.currentHour];
        const soil_moisture_0_1cm = data.hourly.soil_moisture_0_1cm[this.currentHour];
        const uv_index = data.hourly.uv_index[this.currentHour];

        let color = '#7343BE';

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
        .bindPopup(
          `Location: ${data.latitude}, ${data.longitude}
            <br>Temperature: ${temperature}°F
            <br>Humidity: ${humidity}%
            <br>Precip Chance: ${precipitation_probability}%
            <br>Cloudcover: ${cloudcover}%
            <br>Windspeed: ${windspeed_10m}mph
            <br>Soil Moisture: ${soil_moisture_0_1cm}m3/m3
            <br>UV Index: ${uv_index}`
          )
        .bindTooltip(
          `Location: ${data.latitude}, ${data.longitude}
            <br>Temperature: ${temperature}°F
            <br>Humidity: ${humidity}%
            <br>Precip Chance: ${precipitation_probability}%
            <br>Cloudcover: ${cloudcover}%
            <br>Windspeed: ${windspeed_10m}mph
            <br>Soil Moisture: ${soil_moisture_0_1cm}m3/m3
            <br>UV Index: ${uv_index}`
          )
        .addTo(this.map);

        data.longitude = latLng.lng;
        data.latitude = latLng.lat;

        this.elements.push({ data: data, element: rectangle });
    });

    
  }

  onSubmit() {
    this.updateWeatherDataOnMap();  
  }

  updateSliderValue(event: any) {
    this.currentHour = Number(event.target.value);
    this.updateWeatherDataOnMap();
  }

  updateWeatherDataOnMap() {
    this.elements.forEach(({ data, element }) => {
      // Generate a cache key for each set of latitude and longitude
      const cacheKey = `${data.latitude}-${data.longitude}-${this.currentHour}`;
      // Check if element is already cached
      let cachedElement: L.Rectangle | L.Marker | undefined = this.elementCache[cacheKey];
  
      // If not, cache the incoming element
      if (!cachedElement) {
        cachedElement = element;
        this.elementCache[cacheKey] = cachedElement;
      }
  
      const temperature = data.hourly.temperature_2m[this.currentHour];
      const humidity = data.hourly.relativehumidity_2m[this.currentHour];
      const precipitation_probability = data.hourly.precipitation_probability[this.currentHour];
      const cloudcover = data.hourly.cloudcover[this.currentHour];
      const windspeed_10m = data.hourly.windspeed_10m[this.currentHour];
      const soil_moisture_0_1cm = data.hourly.soil_moisture_0_1cm[this.currentHour];
      const uv_index = data.hourly.uv_index[this.currentHour];
  
      let stroke = true;
      let prefOpacity: number = 0;
      let unprefOpacity: number = 0.5;
      Object.entries(this.preferences).forEach(([key, keyData], index) => {
        if (keyData.toggleValue){
          let minValue = keyData.minValue;
          let maxValue = keyData.maxValue;
  
          const attributeName = key;
          const currentValue = data.hourly[attributeName as keyof typeof data.hourly][this.currentHour];
          
          // Can optimize to look better with multiple colors
          if (currentValue >= minValue && currentValue <= maxValue) {
            prefOpacity = 0.5;
          } else {
            stroke = false;
            unprefOpacity = unprefOpacity - 0.2;
          }
        }
      });
  
      if (cachedElement instanceof L.Rectangle) {
        cachedElement.setStyle({ color: '#7343BE', fillOpacity: Math.min(prefOpacity, unprefOpacity), stroke: stroke , weight: 1});
        cachedElement.setPopupContent(
          `Location: ${data.latitude}, ${data.longitude}
          <br>Temperature: ${temperature}°F
          <br>Humidity: ${humidity}%
          <br>Precip Chance: ${precipitation_probability}%
          <br>Cloudcover: ${cloudcover}%
          <br>Windspeed: ${windspeed_10m}mph
          <br>Soil Moisture: ${soil_moisture_0_1cm}m3/m3
          <br>UV Index: ${uv_index}`
        );
        cachedElement.setTooltipContent(
          `Location: ${data.latitude}, ${data.longitude}
          <br>Temperature: ${temperature}°F
          <br>Humidity: ${humidity}%
          <br>Precip Chance: ${precipitation_probability}%
          <br>Cloudcover: ${cloudcover}%
          <br>Windspeed: ${windspeed_10m}mph
          <br>Soil Moisture: ${soil_moisture_0_1cm}m3/m3
          <br>UV Index: ${uv_index}`
        );
      }
    });
  }  
  
  getCurrentDayAndHour(): string {
    // Create a new date that is the forecast start plus the number of hours
    let date = new Date(this.forecastStart.getTime() + this.currentHour * 60 * 60 * 1000);
    let day = date.toLocaleString('default', { weekday: 'long' }); // e.g. Monday
    let hour = date.getHours();
    return `${day}, ${hour}:00`;
  }

  getThumbLabelPosition(): number {
    return (this.currentHour / this.maxHours) * 100;
  }

  toggleBottomDrawer() {
    this.isBottomDrawerOpen = !this.isBottomDrawerOpen;
  }
}
