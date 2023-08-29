import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';


import { AppComponent } from './app.component';
import { WeatherComponent } from './weather/weather.component';
import { PreferencesComponent } from './preferences/preferences.component';
import { SharedService } from './shared.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatCardModule} from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  declarations: [
    AppComponent,
    WeatherComponent,
    PreferencesComponent
  ],
  imports: [
    BrowserModule, 
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    BrowserAnimationsModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatIconModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  providers: [
    SharedService,
    PreferencesComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

