import { BehaviorSubject, EMPTY, from, of, timer } from "rxjs";
import { ajax } from "rxjs/ajax";
import { take, map, switchMap, catchError, shareReplay, tap, 
    concatAll, toArray, concatMap, filter, delay } from "rxjs/operators";
import { ToastService } from "./Toast.service.js";
import * as _ from 'underscore';
import moment from "moment";
import { result } from "underscore";

export const SERVERS = {
    'ssl:52.147.58.109:1666' : '_LA.Repositories',
    'ssl:10.10.100.80:1666':   '_WDI.Repositories',
    'Liquid Animation' : '_LA.Repositories',
    'Walt Disney Imagineering' : '_WDI.Repositories'
}

export class PerforceService {
    static _LastLogin$ = new BehaviorSubject(null);
    static LastLogin$ = ajax.get("/lastlogin").pipe(
        map(result => result.response ? result.response : null),
        take(1)
    );

    static _Initialized = new BehaviorSubject(false);
    static Initialized$ = PerforceService._Initialized.asObservable().pipe(shareReplay(1));

    static _Login = new BehaviorSubject(null);
    static Login$ = PerforceService._Login.asObservable().pipe(shareReplay(1));

    static _Workspace = new BehaviorSubject(null);
    static Workspace$ = PerforceService._Workspace.asObservable().pipe(shareReplay(1));

    static _Users = new BehaviorSubject(null);
    static Users$ = PerforceService._Users.asObservable().pipe(shareReplay(1));

    static _Groups= new BehaviorSubject(null);
    static Groups$ = PerforceService._Groups.asObservable().pipe(shareReplay(1));

    static _Depots = new BehaviorSubject(null);
    static Depots$ = PerforceService._Depots.asObservable().pipe(shareReplay(1));

    /*
    static _Clients = new BehaviorSubject(null);
    static Clients$ = PerforceService._Clients.asObservable().pipe(shareReplay(1));
    */
    
    static Clients$ = PerforceService.Login$.pipe(
        switchMap(login => !login ? EMPTY :
            ajax.post('/clients', { login })),
        tap(t => PerforceService.LogMessage("Service --> Retrieving All Workspaces for User: " + t.Username)),
        map(result => result.response ? result.response : null),
        tap(t => PerforceService.LogMessage("Clients -->" + t.map(o => JSON.stringify(o)).join('\n'))),
        shareReplay(1)
    )

    static Client$ = (name) => {
        if (!name) return of(null);

        return PerforceService.Login$.pipe(
            switchMap(login => !login ? EMPTY :
                ajax.post('/get-client', { login, name })),
            map(result => result.response),
            map(client => ({...client, client: client.Client})),
            take(1)
        ) 
    }

    static Restart = () => {
        ajax.get('/restart').pipe(take(1)).subscribe(() => {
            delay(2048).pipe(take(1)).subscribe(() => {
                window.location.reload();
            })
        })
    }

    static Depots$ = PerforceService.Login$.pipe(
        switchMap(login => !login ? EMPTY :
            ajax.post('/depots', { login })),
        tap(t => PerforceService.LogMessage("Service --> Retrieving All Depots for User: " + t.Username)),
        map(result => result.response ? 
            _.filter(result.response, d => d.name.indexOf('.') >= 0) 
            : null),
            tap(t => PerforceService.LogMessage("Depots -->" + t.map(o => JSON.stringify(o)).join('\n'))),
        shareReplay(1)
    )

    static Protects$ = PerforceService.Login$.pipe(
        switchMap(login => !login ? EMPTY :
            ajax.post('/protects', { login })),

        map(result => result.response ? result.response : null),
        shareReplay(1)
    )

    static Groups$ = PerforceService.Login$.pipe(
        
        switchMap(login => !login ? EMPTY :
            ajax.post('/groups', { login })),
        tap(t => PerforceService.LogMessage("Service --> Retrieving All Groups for User: " + t.Username)),
        map(result => result.response ? result.response : null),
        tap(t => PerforceService.LogMessage("Groups -->\n" + t.map(o => '\t\t' + JSON.stringify(o)).join('\n'))),
        shareReplay(1)
    )
    
    static Describe$ = (id) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/describe', { login, id})),
            map(result => result.response ? result.response : null),
            map(result => {
                const user = result.user;
                    const desc = result.desc;

                    const entries = Object.entries(result);
                    const actions = entries.filter(([attr, val]) => 
                    attr.startsWith('action')).map(([attr, val]) => val);
                    const sizes = entries.filter(([attr, val]) => 
                    attr.startsWith('fileSize')).map(([attr, val]) => val);

                    const files = entries.filter(([attr, val]) => 
                    attr.startsWith('depotFile')).map(([attr, val]) => val);

                    const types = entries.filter(([attr, val]) => 
                    attr.startsWith('type')).map(([attr, val]) => val);

                    const mapped = _.reduce(actions, (acc, action, i) => {
                        acc.push({action, file: files[i], type: types[i],
                        size: sizes[i], user, desc });
                        return acc;
                    }, []);

                    return mapped;
            }),
            take(1)
        );
    }

    static Opened$ = (depot) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/opened', { login, depot })),
            map(result => result.response ? result.response : null),
            /*map(response => response && response.stat ? response.stat.map(s => 
                ({...s, time: moment.unix(s.time).format('HH:MM DD/MM/YY') })) : null),*/
            take(1)
        );
    }
    static Changes$ = (depot, client, type) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/changes', { login, depot, client, type })),
            map(result => result.response ? result.response : null),
            map(response => response && response.stat ? response.stat.map(s => 
                ({...s, time: moment.unix(s.time).format('YY/MM/DD HH:mm') })) : null),
            take(1)
        );
    }
    
    static Users$ = PerforceService.Login$.pipe(
        switchMap(login => !login ? EMPTY :
            ajax.post('/users', { login })),

        map(result => result.response ? result.response : null),
        map(users => users ? users.map(u => ({
                ...u,
                Update: moment.unix(u.Update).format('YYYY/MM/DD'),
                Access: moment.unix(u.Access).format('YYYY/MM/DD')
                })
            ) : null
        ),
        tap(t => PerforceService.LogMessage("Users -->" + t.map(o => JSON.stringify(o)).join('\n'))),
        
        shareReplay(1)
    )

    static Where = (mapping, clients) => {
        if (clients.length < 1) return of(null);

        return PerforceService.Login$.pipe(
            switchMap(login => from(clients).pipe(
                concatMap(c => ajax.post('/where', {map: mapping, login, client: c.client}).pipe(
                    tap(console.log(c)),
                    map(result => result.response),
                    map(response => response.error ? null: 
                        { ...response.stat[0], client: c }),
                    tap(t => console.log(c.client, "p4 where //" + mapping + "/...")),
                )),
                toArray(),
                take(clients.length),
            )),
            map(res => _.filter(res, (r) => r !== null)),
            map(res => res && res.length > 0 ? _.first(res) : null),
            tap(t => PerforceService.LogMessage("Where -->" + JSON.stringify(t))),
        
            take(1),
            );
    }
    static InitializeClient$ = (client, view, id) => {
        return PerforceService.Login$.pipe(
            switchMap(login => {
                const addr = login.Server;
                const root = 'C:/' + SERVERS[addr];
                const body = { login, 
                    client: {
                        name: client && client.client? client.client : 
                            `${login.Username}.${login.Host}.${id}`, 
                        root: client && client.Root ? client.Root :
                            `${root}/${id}`, 
                        view: view ? view : []
                    }, 
                };
                return ajax.post('/init-client', body).pipe(
                take(1),
            )
        }),
        take(1),
        map(res => res.response),
        map(response => response && response.stat && response.stat.length > 0 ? 
            response.stat[0] : null),
        map(stat => stat ? ({...stat, client: stat.Client}) : null), // (p4 client result has capitalized Client)
        tap(t => {
            if (t === null)
                ToastService.SendError("Could not Initialize Client!");
            })
        )
    }
    static InitializeDepot$ = (client, depot, view, stream=null) => {
        return PerforceService.Login$.pipe(
            switchMap(login => {
                const body = { login, 
                    depot: depot.name, 
                    client: {
                        name: client.client, 
                        root: client.Root, 
                        view: view ? view : []
                        }, 

                    stream };
                
                return ajax.post('/init-depot', body).pipe(
                take(1),
            )
        }),
        take(1),
        map(res => res.response),
        map(response => response && response.stat && response.stat.length > 0 ? 
            response.stat[0] : null),
        map(stat => stat ? ({...stat, client: stat.Client}) : null), // (p4 client result has capitalized Client)
        tap(t => {
            if (t === null)
                ToastService.SendError("Could not Initialize Repository!");
            })
        )
    }

    static View$ = (name) => {
        return PerforceService.Login$.pipe(
            switchMap(login => 
                ajax.post('/get-client', {login, name})
                .pipe(
                    map(res => res ? res.response : null),
                    map(res => res?.stat.length > 0 ? res.stat[0] : null),
                    map(stat => stat ? Object.keys(stat).reduce(
                        (acc, attr) => {
                            if (attr.indexOf('View') !== 0)
                                return acc;

                            const [from, to] = stat[attr].split(' ');
                            if (from.indexOf('//depot') < 0
                                && !_.find(acc, (v) => v.from == from && v.to == to)) {
                                acc.push({from, to});
                        }
                            return acc;
                        }, []
                    ) : null),
                    take(1),
                )
            ),
            take(1),
            tap(t => PerforceService.LogMessage("View -->" + t.map(o => JSON.stringify(o)).join('\n'))),
        )
    }

    static Config$ = (client, root) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/set-config', {login, client, root}).pipe(
                map(res => res.response),
                take(1)
                )
            ),
            take(1)
        )
    } 

    static Ignore$ = (client, root) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/set-ignore', {client, login, root}).pipe(
                map(res => res.response),
                take(1)
                )
            ),
            take(1)
        )
    } 

    static CreateWorkspace = (name) => {
        return ajax.post('/workspace', {name})
    }

    static SetLogin = (params) => {
        PerforceService._Login.next(params)
    }

    static PathExists$ = (path) => {
        return ajax.post('/path-exists', {path}).pipe(
            map(result => result?.response?.exists ? result.response.exists : false),
            map(exists => exists ? exists : null),
            take(1)
        )
    }
    static PackagePaths$ = (filename) => {
        return PerforceService.ReadFile(filename).pipe(
            map(result => { 
                if (result.error) {
                    console.log(filename, result.error);
                    return [];
                }
                try {
                    const data = JSON.parse(result.data);
                    if (!Array.isArray(data))
                        throw 'Package Path Is not Array!';

                    return data;
                } catch {
                    ToastService.SendError("Error Parsing Package Path");
                    return [];
                }
            }),
            concatMap(options => from(options.filter(o => !!o.Path)).pipe(
                    switchMap(option => ajax.post('/path-exists', {path: option.Path}).pipe(
                            map(result => result?.response?.exists ? result.response.exists : false),
                            map(exists => exists ? option : null),
                        )
                    )
                )
            ),
            toArray(),
            take(1),
            catchError(err => of(null)),
            shareReplay(1)
        )
    }

    static ReadFile = (filename) => {
        return ajax.post('/read-file', {filename}).pipe(
            map(result => result.response),
        )
    }

    static PackageFiles$ = (files, project, base) => {
        return PerforceService.Login$.pipe(
            switchMap( login => ajax.post('/package', {login, files, project, base})),
            map(result => result.response),
            map(res => {
                if (res.result) {
                    ToastService.SendSuccess('Packaged ' + res.result.length + ' Files.');
                    return res;
                }

                ToastService.SendError("There was an issue packaging selected files.");
                return null;
            }),
            take(1)
        )
    }

    static IntegrateFiles$ = (files, project, src, dest) => {
        return PerforceService.Login$.pipe(
            switchMap( login => ajax.post('/integrate', {login, files, project, src, dest})),
            map(result => result.response),
            map(res => {
                if (res.result) {
                    ToastService.SendSuccess('Integrated ' + res.result.length + ' Files.');
                    return res;
                }

                ToastService.SendError("There was an issue packaging selected files.");
                return null;
            }),
            take(1)
        )
    }

    static IntegrationTree$ = (src, dest) => {
        console.log("CALLING INTEGRATION TREE$");
        return ajax.post('/integration-tree', {src, dest}).pipe(
            map(result => result.response),
            tap(t => console.log("Integration Listing: ", t)),
            take(1)
        )
    }

    static DirectoryTree$ = (root) => {
        return ajax.post('/dir-tree', {root}).pipe(
            map(result => result.response),
            tap(t => console.log("LISTING: ", t)),
            take(1)
        )
    }
    static ExplorePath = (path) => {
        return ajax.post('/explore', {path}).pipe(
            take(1)
        ).subscribe((res) => {
            if (res?.response?.error)
            {
                ToastService.SendError('Explorer was not able to access the path');
            }
        })
    }
    static ReadIgnores = (client, depot) => {
        return PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/ignores', {client, login, depot}).pipe(
                map(res => res.response),
                take(1)
                )
            ),
            take(1)
        )
    }

    static Console$ = timer(0, 2048).pipe(
        switchMap(t => ajax({
            url: '/terminal',
            method: 'GET',
            responseType: 'text'}).pipe(take(1))),
        map(res => res.response ? res.response.split('\n') : null),
    )
    
    static LogMessage = (message) => {
        ajax.post('/log-message', {message}).pipe(take(1)).subscribe(() => { })
    }

    static SignOut = () => {
        PerforceService.Login$.pipe(
            switchMap(login => ajax.post('/logout', {login}).pipe(
                take(1)
            )
        ),
            take(1)
        ).subscribe((result) => {
            if (result.status === 200) {
                ToastService.SendSuccess("You have been logged out.");
                PerforceService._Login.next(null);
            } else {
                ToastService.SendError("There was an issue logging out!")
            }
        })
    }
    static Login = (address, user, password) => {
        return ajax.post('/login', {address, user, password}).pipe(
            catchError((err) => {
                console.log(err);
                return of(null);
            }),
            switchMap(result => {
                if (!result || !result.response) {
                    ToastService.SendError("Unknown Error!")
                    return of(null);
                }
                return of(result.response)
            }),
            map(res => {
                if (res && res.error && res.error.length > 0) {
                    ToastService.SendError(res.error[0].data.split('\n')[0]);
                    return null;
                } 
                return (res);
            }),
            take(1)
        )
    }
}
/*
PerforceService.Login$.subscribe(login => {
    if (login) {
        ajax.post('/initialize-user', {login})
            .pipe(
                map(result => result.response),
                take(1)
            )
            .subscribe(({Groups, Depots, Clients, Users}) => {
            PerforceService._Depots.next(Depots);
            PerforceService._Clients.next(Clients);
            PerforceService._Groups.next(Groups);
            PerforceService._Users.next(Users);
        })
    } else {
        PerforceService._Depots.next(null);
        PerforceService._Clients.next(null);
        PerforceService._Groups.next(null);
        PerforceService._Users.next(null);
    }
});*/

PerforceService.LastLogin$.pipe(take(1)).subscribe(last => {
    console.log("LAST", last)
    if (last) {
        const server = last.Last;
        if (last[server]) {
            PerforceService._Login.next(last[server]);
        }
    } 
    PerforceService._Initialized.next(true);
});

