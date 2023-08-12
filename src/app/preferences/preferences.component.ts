import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})

export class PreferencesComponent {
  preferenceForm: FormGroup;
  @Output() preferencesChanged = new EventEmitter();

  constructor(private fb: FormBuilder) {
    this.preferenceForm = this.fb.group({
      preferences: this.fb.array([])
    })
  }

  get preferences() {
    return this.preferenceForm.get('preferences') as FormArray;
  }

  newPreference(): FormGroup {
    const newPref = this.fb.group({
      attribute: '',
      value: '',
      symbol: 'within',
      precisionValue: '5',
      color: '#ff0000'
    });

    this.preferences.valueChanges.subscribe((value) => {
      this.preferencesChanged.emit(this.preferences);
    });

    return newPref;
  }

  addPreference() {
    this.preferences.push(this.newPreference());
    this.preferencesChanged.emit(this.preferences.value);

  }

  removePreference(i: number) {
    this.preferences.removeAt(i);
    this.preferencesChanged.emit(this.preferences.value);

  }

  changePreference() {
    this.preferencesChanged.emit(this.preferences.value);
  }
}
