import {Component, Inject, OnInit} from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule} from '@angular/material/dialog';
import {NgIf} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatIconModule } from '@angular/material/icon';

import { SocialAuthService } from "@abacritt/angularx-social-login";
import { GoogleLoginProvider } from "@abacritt/angularx-social-login";
import { HttpClient } from '@angular/common/http';
import { AuthPresetService } from '../auth-preset.service';


@Component({
  selector: 'app-navbar',
  templateUrl: 'navbar.component.html',
  styleUrls: ['navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  user: any;
  loggedIn: any;

  constructor(public dialog: MatDialog, private authService: SocialAuthService, private http: HttpClient, private authPresetService: AuthPresetService) {
    
  }
  ngOnInit() {
    this.openDialog();
    this.authService.authState.subscribe((user) => {
      this.user = user;
      this.loggedIn = (user != null);
      this.onGoogleSignInSuccess(user); // This is the token we need to send to the backend
    })
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(AboutDialogComponent, {
    });

    dialogRef.afterClosed().subscribe(result => {
    });
  }

  refreshToken(): void {
    this.authService.refreshAuthToken(GoogleLoginProvider.PROVIDER_ID);
  }

  onGoogleSignInSuccess(response: any) {
    const tokenId = response.idToken;
    const unauthId = response.id;
    this.http.post('http://localhost:3000/api/googleSignIn', { tokenId }).subscribe(
      (response) => {
        this.authPresetService.setUserId(unauthId);
        this.authPresetService.loginSuccessful();
      },
      (error) => {
        this.authPresetService.logoutSuccessful();
      }
    );
  }
}

@Component({
  selector: 'app-about-dialog',
  templateUrl: 'about-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule, MatButtonModule],
})
export class AboutDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AboutDialogComponent>
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
