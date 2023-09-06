import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild, Input, Output, EventEmitter, NgZone } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PlaceSearchCoords } from '../app.component';

/// <reference types="@types/googlemaps" />

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule],
  styles: [

  ]
})
export class SearchComponent implements OnInit {
@ViewChild('inputField') inputField!: ElementRef;

  @Input() placeholder = '';

  @Output() placeChanged = new EventEmitter<PlaceSearchCoords>();

  autocomplete: google.maps.places.Autocomplete | undefined;

  constructor(private ngZone: NgZone) { }
  ngOnInit(): void {}

  ngAfterViewInit() {
    this.autocomplete = new google.maps.places.Autocomplete(this.inputField.nativeElement);

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete?.getPlace();

      const result: PlaceSearchCoords = {
            latitude: place?.geometry?.location?.lat(),
            longitude: place?.geometry?.location?.lng()
      };

      this.ngZone.run(() => {
        this.placeChanged.emit(result);
      })
      
      console.log(place);
    });
  }
}
