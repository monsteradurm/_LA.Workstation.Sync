import { BehaviorSubject, combineLatest, EMPTY, of } from "rxjs"
import { shareReplay, take, map, switchMap, tap } from "rxjs/operators";
import { PerforceService } from "../../Services/Perforce.service.js";
import * as _ from 'underscore';
import { AppObservables } from "../../App.context.js";
export const RepositoryState = {
    Depot: null,
    Client: null,
    Where: null,
    Path: null,
    View: null,
    IgnoreFile: null,
    ConfigFile: null,
    PackagingOptions: null,
    IntegrationPath: null,
    BusyMessage : null
}

export class RepositoryObservables {
    static Page = '/Repositories/Initialization';

    static _DepotId = new BehaviorSubject(null);
    static DepotId$ = RepositoryObservables._DepotId.asObservable();

    static _ClientId = new BehaviorSubject(null);
    static _ClientId$ = RepositoryObservables._ClientId.asObservable();
    static ClientId$ = combineLatest([
        RepositoryObservables._ClientId$, RepositoryObservables.DepotId$, PerforceService.Login$
    ]).pipe(
        map(([clientId, depotId, login]) => {
            if (clientId) return clientId;

            if (!depotId || !login)
                return null;

            const id = depotId.indexOf('.') > -1 ? depotId.split('.')[0] : depotId
            return `${login.Username}.${login.Host}.${id}`
        }),
    )

    static _BusyMessages = new BehaviorSubject([]);
    static BusyMessages$ = RepositoryObservables._BusyMessages.asObservable();

    static BusyMessage$ = RepositoryObservables.BusyMessages$.pipe(  
        map(messages => messages && messages.length > 0 ? messages[0][1] : null),
    )

    static Depot$ = combineLatest(
        [PerforceService.Depots$, RepositoryObservables.DepotId$]
    ).pipe(
        switchMap(([depots, id]) => !!depots && depots.length > 0 && !!id ? 
            of([depots, id]) : EMPTY),
        map(([depots, id]) =>  _.find(depots, d => d.name === id)),
        shareReplay(1)
    )

    static Where$ = combineLatest(
        [PerforceService.Clients$, RepositoryObservables.Depot$]
    ).pipe(
        switchMap(([clients, depot]) => !!clients && clients.length > 0 && depot ? 
            of([clients, depot]) : EMPTY),
        tap(t => console.log("WHERE!", t)),
        switchMap(([clients, depot]) => {
            const id = depot.name.split('.')[0];
            const rel_clients = clients.filter(c => c.client.indexOf(id) >= 0);

            if (RepositoryObservables.Page.indexOf('Initialization') > -1||
                RepositoryObservables.Page.indexOf('Packaging') > -1)
                RepositoryObservables.AddBusyMessage("get-where", `Searching for Depot Location: //${depot.name}/...`);

            return PerforceService.Where(depot.map, rel_clients).pipe(take(1)).pipe(
                map(where => {
                    if (where) 
                        RepositoryObservables.SetClientId(where.client.client);
                        
                    RepositoryObservables.RemoveBusyMessage("get-where");
                    return where;
                })
            )
        }),
        shareReplay(1)
    )

    static Client$ = combineLatest([
        PerforceService.Clients$, RepositoryObservables.ClientId$, 
    ]).pipe(
        switchMap(([clients, clientId, where]) => {
            if (!clientId || !clients)
                return EMPTY

            console.log(clients);
            const client = _.find(clients, (c) => c.client === clientId)
            if (client)
                return of(client);
            
            return RepositoryObservables.Where$.pipe(
                switchMap(where => where ? where.client : EMPTY )
            )
        }),
        shareReplay(1)
    )
     
    static View$ = RepositoryObservables.Client$.pipe(
        tap(t => {
            if (RepositoryObservables.Page.indexOf('Initialization') >= 0)
                AppObservables.AddBusyMessage('get-view', "Retrieving Workspace View...")
        }),
        switchMap(client => !client ? EMPTY : of(client) ),
        tap(console.log),
        switchMap(client => {
            const hasViews = Object.keys(client)
                .filter(attr => attr.startsWith('View')).length > 0;

            return hasViews ? of(client) :
                PerforceService.Client$(client.client)
        }),
        tap(console.log),
        map(client => client ? Object.keys(client).reduce(
            (acc, attr) => {
                if (attr.indexOf('View') !== 0)
                    return acc;

                const [from, to] = client[attr].split(' ');
                if (from.indexOf('//depot') < 0
                    && !_.find(acc, (v) => v.from == from && v.to == to)) {
                    acc.push({from, to});
            }
                return acc;
            }, []) : null
        ),
        tap(console.log),
        tap(t => AppObservables.RemoveBusyMessage('get-view')),
        shareReplay(1)
    )

    static ConfigFile$ = RepositoryObservables.Client$.pipe(
        switchMap(client => !client ? EMPTY : 
            PerforceService.Config$(client.client, client.Root).pipe(
                take(1),
                map(res => res?.config ? res.config : null)
            )
        ),
        shareReplay(1),
    )

    static PackagingFile$ = combineLatest(
        [RepositoryObservables.Client$, RepositoryObservables.Where$]
    ).pipe(
        map(([client, where]) => {
            if (!client || !where) return of(null);

            return where.path.replace('\\...', '')
                .replace('\\...', '')
                .replace(/\\/g, "/")
                + '/.packagingPaths.txt';
        }),
        shareReplay(1)
    )

    static IntegrationFile$ = combineLatest(
        [RepositoryObservables.Client$, RepositoryObservables.Where$]
    ).pipe(
        map(([client, where]) => {
            if (!client || !where) return of(null);

            return where.path.replace('\\...', '')
                .replace('\\...', '')
                .replace(/\\/g, "/")
                + '/.integrationPath.txt';
        }),
        shareReplay(1)
    )

    static IntegrationPath$ = RepositoryObservables.IntegrationFile$.pipe(
        tap(t => console.log("Integration FILE", t)),
        switchMap(fn => fn ? of(fn) : EMPTY),
        switchMap(fn => {
            if (RepositoryObservables.Page.indexOf('Integration') >= 0)
                RepositoryObservables.AddBusyMessage("get-integration", "Retrieving Integration Path...");

            return PerforceService.ReadFile(fn).pipe(
                    take(1),
                    map(res => res && res.data ? res.data : null)
                )
        }),
        tap(t => RepositoryObservables.RemoveBusyMessage("get-integration")),
        shareReplay(1)
    )

    static PackagingOptions$ = RepositoryObservables.PackagingFile$.pipe(
        tap(t => console.log("PACKAGING FILE", t)),
        switchMap(fn => fn ? of(fn) : EMPTY),
        switchMap(fn => {
            if (RepositoryObservables.Page.indexOf('Packaging') >= 0)
                RepositoryObservables.AddBusyMessage("get-packaging", "Retrieving Export Paths...");

            return PerforceService.PackagePaths$(fn).pipe(
                    take(1),
                    map(res => res ? res : null)
                )
        }),
        tap(t => RepositoryObservables.RemoveBusyMessage("get-packaging")),
        shareReplay(1)
    )

    static IgnoreFile$ = combineLatest(
            [RepositoryObservables.Client$, RepositoryObservables.Where$]
        ).pipe(
        switchMap(([client, where]) => {
            if (!client || !where) return of(null);

            if (RepositoryObservables.Page.indexOf('Initialization') >= 0 ||
                RepositoryObservables.Page.indexOf('Ignore') >= 0)
                RepositoryObservables.AddBusyMessage("get-ignore", "Retrieving Ignore...");

            const root = where.path.replace('\\...', '')
                .replace('\\...', '')
                .replace(/\\/g, "/")

            return PerforceService.Ignore$(client.client, root).pipe(
                    take(1),
                    map(res => res && res.ignore ? res.ignore : null)
                )
            }),
        tap(t => RepositoryObservables.RemoveBusyMessage("get-ignore")),
        shareReplay(1)
    )

    static AddBusyMessage(key, msg) {
        RepositoryObservables.BusyMessages$.pipe(take(1)).subscribe((messages) => {
            const result = [...messages, [key, msg]];
            RepositoryObservables._BusyMessages.next(result);
        })
    }
    static RemoveBusyMessage(key) {
        RepositoryObservables.BusyMessages$.pipe(take(1)).subscribe((messages) => {
            const result = messages.filter(([k, msg]) => k !== key);
            RepositoryObservables._BusyMessages.next(result);
        })
    }
    static SetDepotId = (id) => {
        RepositoryObservables._DepotId.next(id);
    }

    static SetClientId = (id) => {
        RepositoryObservables._ClientId.next(id);
    }
}


export const DispatchRepositoryState = (state, action) => {
    console.log("Repo Action: ", action)
    switch(action.type) {
        case 'Page': {
            RepositoryObservables.Page = action.value;
            return state;
        }
        case 'DepotId' : 
            return { ...state, 
                DepotId: action.value
            }
        
        case 'ClientId' : 
            return { ...state, 
                ClientId: action.value
            }

        case 'Path' : 
            return { ...state, 
                Path: action.value
            }

        case 'Where' : 
            return { ...state, 
                Where: action.value
            }

        case 'Client' : 
            return { ...state, 
                Client: action.value
            }

        case 'Depot' : 
            return { ...state, 
                Depot: action.value
            }
        
        case 'View' : 
            return { ...state, 
                View: action.value
            }
        
        case 'IgnoreFile' : 
            return { ...state, 
                IgnoreFile: action.value
            }

        case 'ConfigFile' : 
            return { ...state, 
                ConfigFile: action.value
            }

        case 'PackagingFile':
            return { ...state,
                PackagingFile: action.value
            }

        case 'BusyMessage' : 
            return { ...state, 
                BusyMessage: action.value
            }
        case 'PackagingOptions' : 
            return { ...state, 
                PackagingOptions: action.value
            }

        case 'IntegrationPath' : 
            return { ...state, 
                IntegrationPath: action.value
            }

        default: {
                console.log('Repository State -- Error -- Could not find Action: ' + action);
                break;
            }
        }
    }