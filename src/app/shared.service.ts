import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SharedService {

    private trigger = new Subject<FormGroup>();

    // Enable subscribing to the event
    trigger$ = this.trigger.asObservable();

    // Function to trigger the event
    triggerEvent(data: any) {
        console.log('About to emit: ', data);
        this.trigger.next(data);
    }
}
