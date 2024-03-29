import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class GenerateService {

    private trigger = new Subject<void>();

    // Enable subscribing to the event
    trigger$ = this.trigger.asObservable();

    // Function to trigger the event
    triggerEvent() {
        this.trigger.next();
    }
}
