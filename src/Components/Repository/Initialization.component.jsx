import { Button } from "primereact/button";
import { useContext, useEffect, useState } from "react";
import { Stack } from "react-bootstrap";
import { take } from "rxjs";
import { result } from "underscore";
import { ApplicationContext, RepositoryContext } from "../../App";
import { PerforceService } from "../../Services/Perforce.service";
import { RepositoryObservables } from "./Repository.context";

export const Initialization = ({}) => {
    const repoState = useContext(RepositoryContext);
    const appState = useContext(ApplicationContext);

    const [view, setView] = useState(null);
    const { Client, Depot, Where, IgnoreFile, ConfigFile} = repoState;
    const { Depots } = appState;

    const [siblings, setSiblings] = useState(null);

    useEffect(() => {
        if (!Depot || !Depots || Depots.length < 1) {
            if (siblings !== null)
                setSiblings(null);
        } else {
            const id = Depot.name.split('.')[0];

            setSiblings(Depots
                .filter(d => d.name.indexOf(id) === 0 && d.name != Depot.name)
            );
        }
    }, [Depots, Depot]);

    useEffect(() => {
        const subs = [];

        subs.push(
            RepositoryObservables.View$.subscribe(setView)
        );

        return () => subs.forEach(s => s.unsubscribe());
    }, [])

    const initializeDepot = (evt) => {
        const msgKey = 'depot-init';
        RepositoryObservables.AddBusyMessage(msgKey, 'Initializing Repository...');
        PerforceService.InitializeDepot$(Client, Depot, view).pipe(take(1)).subscribe((result) => {
            RepositoryObservables.SetDepotId(Depot.name); // refresh depot/client;
            RepositoryObservables.RemoveBusyMessage(msgKey);
        })
    };

    const initializeClient = (evt) => {
        const msgKey = 'workspace-init';
        RepositoryObservables.AddBusyMessage(msgKey, 'Initializing Workspace...');
        PerforceService.InitializeClient$(Client, 
            view? view: null, Depot.name.split('.')[0]
        ).pipe(take(1)).subscribe((result) => {
            RepositoryObservables.SetDepotId(Depot.name); // refresh depot/client;
            RepositoryObservables.RemoveBusyMessage(msgKey);
        })
    }

    return (<Stack direction="vertical" gap={2} style={{marginTop: 20}}>
                    {
                        !!Client && !!Where ?
                        <div style={{fontWeight: 600, color: '#00956a', fontSize: 25, marginBottom: 10 }}>
                            Repository Validated!
                        </div> :
                        <div style={{fontWeight: 600, color: 'rgb(197 0 77)', fontSize: 25, marginBottom: 10 }}>
                            Repository Invalid!
                        </div>
                    }
                    {
                        !!Client ? 
                        <Stack direction="horizontal" gap={1}>
                            <i className="pi pi-check laws-icon-square success" style={{marginRight: 10}}></i>
                            <div>The</div> 
                            <div className="laws-attr-value">Workspace</div> 
                            <div>for this repository is named</div> 
                            <div className="laws-attr-value">{Client?.client}</div> 
                        </Stack> :
                        <Stack direction="horizontal" gap={1}>
                            <i className="pi pi-times laws-icon-square error" style={{marginRight: 10}}></i>
                            <div>There is no</div> 
                            <div className="laws-attr-value">Workspace</div> 
                            <div>associated with this</div> 
                            <div className="laws-attr-value">Repository</div> 
                        </Stack>
                    }
                    {
                        !!Client && !!Where ?
                        <>
                            {
                                ConfigFile ?
                                <Stack direction="horizontal" gap={1}>
                                    <i className="pi pi-check laws-icon-square success" style={{marginRight: 10}}></i>
                                    <div>This</div> 
                                    <div className="laws-attr-value">Workspace</div> 
                                    <div>has a valid</div> 
                                    <div className="laws-attr-value">p4Config.txt</div> 
                                    <div>for the</div> 
                                    <div className="laws-attr-value">p4 Explorer</div>
                                    <div>plugin</div> 
                                </Stack> : null
                            }

                            <Stack direction="horizontal" gap={1} style={{marginTop: 20}}>
                                <i className="pi pi-check laws-icon-square success" style={{marginRight: 10}}></i>
                                <div>This</div> 
                                <div className="laws-attr-value">Repository</div> 
                                <div>has been initialized at</div> 
                                <div className="laws-attr-value">{Where?.path
                                    .replace('\\...', '')
                                    .replace('\\...', '')
                                    .replace('/', '\\')}</div> 
                            </Stack>
                            {
                                IgnoreFile ?
                                <Stack direction="horizontal" gap={1}>
                                    <i className="pi pi-check laws-icon-square success" style={{marginRight: 10}}></i>
                                    <div>This</div> 
                                    <div className="laws-attr-value">Repository</div> 
                                    <div>has a valid</div> 
                                    <div className="laws-attr-value">.p4ignore.txt</div> 
                                </Stack>
                                : <Stack direction="horizontal" gap={1}>
                                    <i className="pi pi-exclamation-circle laws-icon-square warning" style={{marginRight: 10}}></i>
                                    <div>This</div> 
                                    <div className="laws-attr-value">Repository</div> 
                                    <div>does not have a valid</div> 
                                    <div className="laws-attr-value">.p4ignore.txt</div>
                                    <div>(but this may be intentional).</div> 
                                </Stack>
                            }
                            <Stack direction="horizontal" gap={1} style={{marginTop: 20}}>
                                <i className="pi pi-info     laws-icon-square info" style={{marginRight: 10}}></i>  
                                <div>You can use the</div>
                                <div className="laws-attr-value">P4 Explorer</div>
                                <div>plugin,</div>
                                <div className="laws-attr-value">Unity</div>
                                <div>and</div>
                                <div className="laws-attr-value">Unreal</div>
                                <div>integrations for this</div>
                                <div className="laws-attr-value">Repository</div>
                            </Stack>
                            {
                                siblings ? 
                                <>
                                    <Stack direction="horizontal" gap={1} style={{marginLeft: 40, marginTop: 20}}>
                                            <div>This</div> 
                                            <div className="laws-attr-value">Repository</div> 
                                            <div>has</div> 
                                            <div className="laws-attr-value">{siblings.length}</div> 
                                            <div>Siblings</div> 
                                    </Stack>
                                    {
                                        siblings.map(s => 
                                            <div key={"sibling_" + s.name} style={{marginLeft: 80}}>{s.name}</div>)
                                    }
                                </>
                                :null
                            }
                            {
                                view ?
                                <>
                                    <Stack direction="horizontal" gap={1} style={{marginLeft: 40, marginTop: 20}}>
                                        <div>This</div> 
                                        <div className="laws-attr-value">Workspace</div> 
                                        <div>has the</div> 
                                        <div className="laws-attr-value">View</div> 
                                    </Stack>
                                    {
                                        view.map((v, i) => <Stack key={'view_' + i} style={{marginLeft: 80}}
                                            direction="horizontal" gap={2}>
                                            <div>{v.from}</div>
                                            <i className="pi pi-arrow-right" style={{margin: '0px 10px'}}></i>
                                            <div>{v.to}</div>
                                        </Stack>)
                                    }
                                </> : null
                            }
                            
                        </> : 
                        <Stack direction="horizontal" gap={1}>
                            <i className="pi pi-times laws-icon-square error" style={{marginRight: 10}}></i>
                            <div>This</div> 
                            <div className="laws-attr-value">Repository</div> 
                            <div>has</div> 
                            <div className="laws-attr-value">not</div>
                            <div>been Initialized.</div>
                        </Stack>
                    }
                    {
                        !Client ?
                        <Button label="Initialize Workspace" style={{width: 250, marginTop: 20}} 
                            onClick={initializeClient} /> 
                        : null
                    }
                    {
                        !!Client && !Where?
                        <Button label="Initialize Repository" style={{width: 250, marginTop: 20}} 
                            onClick={initializeDepot} /> : null
                    }
                </Stack>
    )
}