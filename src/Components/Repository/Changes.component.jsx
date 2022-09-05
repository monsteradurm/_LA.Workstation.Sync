import { useContext, useEffect, useState } from "react"
import { PerforceService } from "../../Services/Perforce.service";
import { take } from "rxjs/operators"
import { Stack } from "react-bootstrap";
import { Dialog } from 'primereact/dialog';

import * as _ from 'underscore';
import { useSearchParams } from "react-router-dom";
import { RepositoryContext } from "../../App";
import { RepositoryObservables } from "./Repository.context";

export const Changes = ({}) => {
    const { DepotId, ClientId } = useContext(RepositoryContext);
    const [changes, setChanges] = useState(null);
    const [changeSummary, setChangeSummary] = useState(null)
    const [changeId, setChangeId] = useState(null);
    const [type, setType] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const onViewChange = (id) => {
        if (!id)  {
            setChangeId(null);
            setChangeSummary(null);
        } else {
            setChangeId(id);
        }
    }

    useEffect(() => {

        const id = searchParams.get('changeId');
        const t = searchParams.get('type');

        setChangeId(id ? id : null);
        setType(t ? t : null);
    }, [searchParams]);

    useEffect(() => {
        if (!DepotId || !ClientId || !type) return;

        if (changes)
            setChanges(null);
            
        RepositoryObservables.AddBusyMessage('get-changes', "Retrieving Change Logs...")
        PerforceService.Changes$(DepotId, ClientId, type.toLowerCase())
            .pipe(take(1))
            .subscribe((result) => {
                setChanges(result);
                RepositoryObservables.RemoveBusyMessage('get-changes');
        });
    }, [DepotId, ClientId, type]);

    useEffect(() => {
        if (!changeId) {
            setChangeSummary(null);
        }
        else {
            RepositoryObservables.AddBusyMessage('get-change', "Retrieving Change #" + changeId)
            PerforceService.Describe$(changeId).pipe(take(1))
                .subscribe((result) => {
                    if (!result) setChangeSummary(null);

                    setChangeSummary(result);
                    RepositoryObservables.RemoveBusyMessage('get-change');
                });
        }
    }, [changeId])
    return (
        <>
        {
            !!changeId && changeSummary ?
            <Dialog header={"Change #" + changeId  + " //" + DepotId + "/..."} visible={!!changeId}  className="laws-change-summary"
                style={{ width: '80vw', height: '80vh' }} onHide={() => onViewChange(null)}>
                <div style={{marginTop: 20}}>
                {
                changeSummary.map((c) => 
                    <Stack direction="horizontal" gap={3} key={c.file}
                        className="laws-change-container" style={{width: '100%'}}>
                        <div className="laws-change-action">{c.action}</div>
                        <div className="laws-change-desc">{c.file}</div>
                        <div className="laws-change-filetype">{c.type}</div>
                        <div className="laws-change-filesize" style={{textAlign: 'right'}}>{Math.round(c.size / 1024) + ' kb'}</div>
                    </Stack>)
                }
                </div>
            </Dialog> : null
        }
            {
                !changeSummary && !changeId && DepotId && ClientId && type ? 
                changes?.length > 0 ?
                <>
                    <Stack direction="horizontal" gap={1} style={{marginTop: 20, marginBottom: 20}}>
                        <div className="laws-attr-value laws-capitalize">{type}</div> 
                        <div>changes for this</div> 
                        <div className="laws-attr-value">Repository</div> 
                        <div className="laws-attr-value">
                            ({changes.length > 100 ? '1 - 100' : '1 - ' + changes.length})
                        </div> 
                    </Stack> 
                    
                    <Stack direction="vertical" style={{padding: '0px 130px 0px 30px'}}>
                    {
                        changes.map((c) => (
                            <Stack direction="horizontal" gap={3} key={c.change} 
                                className="laws-change-container">
                                <div className="laws-change-id" onClick={() => onViewChange(c.change)}>#{c.change}</div>
                                <div className="laws-change-time">{c.time}</div>
                                <div className="laws-change-desc">{c.desc}</div>
                                <div className="laws-change-user">{c.user}</div>
                            </Stack>
                        ))
                    }
                    </Stack>
                    
                </>:
                <Stack direction="horizontal" gap={1}>
                <div>There are no</div> 
                <div className="laws-attr-value">{type} Changes</div> 
                <div>for this</div> 
                <div className="laws-attr-value">Repository</div> 
            </Stack> : null
            }
        </>
    )
}