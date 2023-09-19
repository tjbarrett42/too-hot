import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import places from 'places.js';
import { HttpClient } from '@angular/common/http';
import { AuthPresetService } from '../auth-preset.service';


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
      console.log('Changed form:', value);
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
    this.http.get(`http://localhost:3000/api/presets/${userId}`)
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
    console.log('preset current: ', this.selectedPreset);
    if (this.selectedPreset === 'add_new') {
      this.isNewPreset = true;
    } else {
      this.isNewPreset = false;
      // Load preset data here if needed
    }
  }

  savePreset(): void {
    const userId = this.authPresetService.getUserId();

    if (this.isNewPreset) {
      // Create a new preset
      this.http.post('http://localhost:3000/api/presets', {
        name: this.newPresetName,
        userId: userId,
        // ... other fields
      }).subscribe(() => {
        this.loadPresets();
        this.isNewPreset = false;
      });
    } else {
      // Update existing preset
      console.log('presets: ', this.presets);
      console.log('selectedPreset: ', this.selectedPreset);
      const preset = this.presets.find(preset => preset.name === this.selectedPreset.name);
      this.http.put(`http://localhost:3000/api/presets/${preset._id}`, {
        // TODO: updated fields
      }).subscribe(() => {
        this.loadPresets();
      });
    }
  }

  getSpecificPreset(presetId: string): void {
    this.http.get(`http://localhost:3000/api/presets/${presetId}`) 
      .subscribe(data => {
        
      });
  }

  deletePreset(): void {
    this.http.delete(`http://localhost:3000/api/presets/${this.selectedPreset._id}`)
      .subscribe(() => {
        this.loadPresets();
      });
  }
}
