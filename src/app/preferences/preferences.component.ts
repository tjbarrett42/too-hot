import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import places from 'places.js';


interface attributeDetails {
  apiName: string;
  listName: string;
}

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {
  preferenceForm: FormGroup;
  @Output() preferencesChanged = new EventEmitter();

  // TODO: turn into attributeDetails object, enable unit switching. This is an ugly way to store defaults, lol
  attributeList: string[][] = [
    ['temperature_2m', 'Temperature', 'F°', '-50', '150'], 
    ['relativehumidity_2m', 'Humidity', '%', '0', '100', '1'], 
    ['precipitation_probability', 'Precipitation Probability', '%', '0', '100', '1'], 
    ['cloudcover', 'Cloudcover', '%', '0', '100', '1'], 
    ['windspeed_10m', 'Windspeed', 'mph', '0', '100', '1'], 
    ['soil_moisture_0_1cm', 'Soil Moisture', 'm3/m3', '0', '1', '0.01'], 
    ['uv_index', 'UV Index', '', '0', '12', '1']
  ];
  attributeDefault: number[][] = [
    [50, 70],
    [0, 20],
    [0, 10],
    [0, 10],
    [0, 5],
    [0, 0.1],
    [0, 5]
  ]

  constructor(private fb: FormBuilder) {
    this.preferenceForm = this.fb.group({
      preferences: this.fb.array([])
    });

    const preferences = this.preferenceForm.get('preferences') as FormArray;
    this.attributeList.forEach((attribute, index) => {
      const newPref = this.fb.group({
        attribute: attribute[0], 
        minValue: [this.attributeDefault[index][0], Validators.required],
        maxValue: [this.attributeDefault[index][1], Validators.required],
        toggleValue: [false]
      });
      
      preferences.push(newPref);
    });

    this.preferenceForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(value => {
      console.log('Changed form:', value);
      this.preferencesChanged.emit(this.preferenceForm);
    });
  }

  get preferences() {
    return this.preferenceForm.get('preferences') as FormArray;
  }

  removePreference(i: number) {
    this.preferences.removeAt(i);
    this.preferencesChanged.emit(this.preferences.value);
  }
}
