import { BehaviorSubject, shareReplay } from "rxjs";

export class NavigationService {
    static _Titles = new BehaviorSubject([]);
    static Titles$ = NavigationService._Titles.asObservable().pipe(shareReplay(1));
    
    static SetTitles(t) { NavigationService._Titles.next(t); }
}