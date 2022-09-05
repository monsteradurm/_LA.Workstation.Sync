import { BehaviorSubject, map, shareReplay, take, tap } from "rxjs"
import * as _ from 'underscore';

export const ApplicationState = {
    Login: null,
    //Workspace: null,
    Clients: null,
    Depots: null,
    Protects: null,
    Groups: null,
    Users: null,
    BusyMessage: null
}

export class AppObservables {
    static _BusyMessages = new BehaviorSubject([
        ['INIT', 'Initializing...'], 
    ]);
    static BusyMessages$ = AppObservables._BusyMessages.asObservable().pipe(shareReplay(1))

    static BusyMessage$ = AppObservables.BusyMessages$.pipe(
        map(messages => messages && messages.length > 0 ? messages[0][1] : null)
    )

    static AddBusyMessage(key, message) {
        AppObservables.BusyMessages$.pipe(take(1)).subscribe(messages => {
            if (!!_.find(messages, m => m[0] === key))
                return;

            const result = [...messages, [key, message]];
            AppObservables._BusyMessages.next(result);
        })
    }
    static RemoveBusyMessage(key) {
        AppObservables.BusyMessages$.pipe(take(1)).subscribe(messages => {
            const result = messages.filter(m => m[0] !== key);
            AppObservables._BusyMessages.next(result);
        })
    }

}

export const DispatchApplicationState = (state, action) => {
    switch(action.type) {
        case 'BusyMessage' : 
            return { ...state, 
                BusyMessage: action.value
            }

        case 'Login' : 
            return { ...state, 
                Login: action.value
            }

        case 'Clients' : 
            return { ...state, 
                Clients: action.value
            }

        case 'Depots': 
            return {...state,
                Depots: action.value
            }

        case 'Groups':
            return {...state,
                Groups: action.value
            }

        case 'Protects': 
            return {...state,
                Protects: action.value
            }

        /*case 'Workspace' : 
            return { ...state, 
                Workspace: action.value
            }*/

        case 'Users' : 
            return { ...state, 
                Users: action.value
            }

        default: {
                console.log('Application State -- Error -- Could not find Action: ' + action);
                break;
            }
        }
    }