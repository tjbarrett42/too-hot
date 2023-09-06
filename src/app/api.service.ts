import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://api.open-meteo.com/v1/'; // Replace with your API URL

  constructor(private http: HttpClient) { }

}
