import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthPresetService {
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  private userId: string | null = null;

  constructor() {
    // Initialize by checking if the user is already logged in
    const isLoggedIn = this.checkUserIsLoggedIn();
    this.loggedInSubject.next(isLoggedIn);
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  getUserId() {
    return this.userId;
  }

  // Function to be called when login is successful
  loginSuccessful() {
    this.loggedInSubject.next(true);
  }

  // Function to be called when logout is successful
  logoutSuccessful() {
    this.loggedInSubject.next(false);
  }

  private checkUserIsLoggedIn(): boolean {
    // Implement your logic to check if the user is logged in
    // This could be checking a token in local storage, for example
    // return localStorage.getItem('token') != null;
    return false; // Placeholder
  }
}
