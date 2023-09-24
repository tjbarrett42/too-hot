import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import places from 'places.js';
import { HttpClient } from '@angular/common/http';
import { AuthPresetService } from '../auth-preset.service';
import { environment } from '../../environments/environment';

interface attributeDetails {
  apiName: string;
  listName: string;
}

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit {
  preferenceForm: FormGroup;
  @Output() preferencesChanged = new EventEmitter();

  isLoggedIn = true;
  presets: any[] = []; // Replace 'any' with your Preset type if you have one
  selectedPreset: any = null; // Selected preset
  isNewPreset = false; // Flag for adding new preset
  newPresetName: string = '';

  // TODO: turn into attributeDetails object, enable unit switching. This is an ugly way to store defaults, lol
  attributeList: string[][] = [
    ['temperature_2m', 'Temperature', 'F°', '-50', '150'], 
    ['relativehumidity_2m', 'Humidity', '%', '0', '100', '1'], 
    ['precipitation_probability', 'Precipitation', '%', '0', '100', '1'], 
    ['cloudcover', 'Cloudcover', '%', '0', '100', '1'], 
    ['windspeed_10m', 'Windspeed', 'mph', '0', '100', '1'], 
    ['soil_moisture_0_1cm', 'Soil Moist.', 'm3/m3', '0', '1', '0.01'], 
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
  
  constructor(private fb: FormBuilder, private http: HttpClient, private authPresetService: AuthPresetService) {
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
      this.preferencesChanged.emit(this.preferenceForm);
    });
  }

  get preferences() {
    return this.preferenceForm.get('preferences') as FormArray;
  }

  ngOnInit(): void {
    this.authPresetService.loggedIn$.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
      if (isLoggedIn) {
        this.loadPresets();
      }
    });
  }

  loadPresets(): void {
    const userId = this.authPresetService.getUserId();
    if (!userId) {
      console.error('user id not set');
      return;
    }

    // Fetch presets from the backend and populate the `presets` array.
    this.http.get(`${environment.backendUrl}/api/presets?userId=${userId}`)
      .subscribe(data => {
        this.presets = data as any[];

        // TODO: add logic for keeping current option as newest option (adding new preset)
        if (this.selectedPreset) {
          // Try to find the same preset by some unique identifier after reloading
          const samePreset = this.presets.find(p => p._id === this.selectedPreset._id);
          if (samePreset) {
            this.selectedPreset = samePreset;
          }
        }
      });
  }

  onPresetChange(): void {
    if (this.selectedPreset === 'add_new') {
      this.isNewPreset = true;
    } else {
      this.isNewPreset = false;
      this.getSpecificPreset(this.selectedPreset._id);
    }
  }

  savePreset(): void {
    const userId = this.authPresetService.getUserId();

    if (this.isNewPreset) {
      // Create a new preset
      this.http.post(`${environment.backendUrl}/api/presets`, {
        name: this.newPresetName,
        userId: userId,
        // ... other fields
      }).subscribe(() => {
        this.loadPresets();
        this.isNewPreset = false;
      });
    } else {
      // Update existing preset
      const preset = this.presets.find(preset => preset.name === this.selectedPreset.name);
      this.http.put(`${environment.backendUrl}/api/presets/${preset._id}`, { 
        preferences: this.preferences.value
      }).subscribe(() => {
        this.loadPresets();
      });
    }
  }

  getSpecificPreset(presetId: string): void {
    this.http.get(`${environment.backendUrl}/api/presets?presetId=${presetId}`) 
      .subscribe((data: any) => {
        this.updatePreferencesForm(data[0].preferences);
      });
  }

  deletePreset(): void {
    this.http.delete(`${environment.backendUrl}/api/presets/${this.selectedPreset._id}`)
      .subscribe(() => {
        this.loadPresets();
      });
    }

  updatePreferencesForm(preferences: any[]): void {
    const preferencesFormArray = this.preferenceForm.get('preferences') as FormArray;
  
    preferences.forEach((preference, index) => {
      const formGroup = preferencesFormArray.at(index) as FormGroup;
      
      if (formGroup) { // Make sure the form group exists
        formGroup.patchValue({
          attribute: preference.attribute,
          minValue: preference.minValue,
          maxValue: preference.maxValue,
          toggleValue: preference.toggleValue
        });
      }
    });
  }
    
  
}
