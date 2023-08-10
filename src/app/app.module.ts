import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';


import { AppComponent } from './app.component';
import { WeatherComponent } from './weather/weather.component';
import { PreferencesComponent } from './preferences/preferences.component';
import { SharedService } from './shared.service';

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
    FormsModule
  ],
  providers: [
    SharedService,
    PreferencesComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

