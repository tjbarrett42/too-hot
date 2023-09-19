import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild, Input, Output, EventEmitter, NgZone } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PlaceSearchCoords } from '../app.component';
import { MatIconModule } from '@angular/material/icon';
import { PlacesEventsHandlers } from 'places.js';
import { concat } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'


/// <reference types="@types/googlemaps" />

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatCardModule],
  styles: [

  ]
})
export class SearchComponent implements OnInit {
  @ViewChild('inputField') inputField!: ElementRef;

  @Input() placeholder: string = '';
  @Input() currentCoords: string = '';

  @Output() placeChanged = new EventEmitter<PlaceSearchCoords>();
  @Output() coordinatesRequested = new EventEmitter<any>();
  @Output() generateMapRequested = new EventEmitter<any>();

  autocomplete: google.maps.places.Autocomplete | undefined;
  initialLocation: any;
  result: PlaceSearchCoords | undefined;
  defaultBounds: any;
  isGenerateDisabled: boolean = false;

  constructor(private ngZone: NgZone) { }
  ngOnInit(): void {}

  ngAfterViewInit() {
    this.updateHome();
  

    const options = {
      bounds: this.defaultBounds
    }

    this.autocomplete = new google.maps.places.Autocomplete(this.inputField.nativeElement, options);
    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete?.getPlace();
      this.result = {
            lat: place?.geometry?.location?.lat(),
            lng: place?.geometry?.location?.lng()
      };
      this.submitLocation();
      this.isGenerateDisabled = false;
    });
  }

  updateHome() {
    navigator.geolocation.getCurrentPosition((position) => {
      this.result = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      this.defaultBounds = {
        north: this.result.lat + 0.1,
        south: this.result.lat - 0.1,
        east: this.result.lng + 0.1,
        west: this.result.lng - 0.1
      }
      this.placeholder = 'here (default)';
      this.submitLocation();
    });
  };

  submitLocation() {
    this.ngZone.run(() => {
      this.placeChanged.emit(this.result);
    })
  }

  generateMap() {
    this.ngZone.run(() => {
      this.isGenerateDisabled = true;
      this.generateMapRequested.emit();

    })
  }
}
