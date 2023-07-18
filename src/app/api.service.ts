import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://api.open-meteo.com/v1/'; // Replace with your API URL

  constructor(private http: HttpClient) { }

  getSomeData() {
    return this.http.get(`${this.apiUrl}/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m`);
  }
}
