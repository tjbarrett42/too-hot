import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent {
  preferenceForm: FormGroup;
  @Output() preferencesChanged = new EventEmitter();
  attributeList: string[] = ['temperature_2m', 'relativehumidity_2m', 'precipitation_probability', 'cloudcover', 'windspeed_10m', 'soil_moisture_0_1cm', 'uv_index'];

  constructor(private fb: FormBuilder) {
    this.preferenceForm = this.fb.group({
      preferences: this.fb.array([])
    });

    const preferences = this.preferenceForm.get('preferences') as FormArray;
    this.attributeList.forEach(attribute => {
      const newPref = this.fb.group({
        attribute: attribute,
        value: [70, Validators.required],
        symbol: ['within', Validators.required],
        precisionValue: ['5', Validators.required],
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