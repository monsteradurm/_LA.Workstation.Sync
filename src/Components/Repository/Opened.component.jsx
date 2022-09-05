import { InputText } from "primereact/inputtext";
import { useContext, useEffect, useState } from "react"
import { Stack } from "react-bootstrap";
import { take } from "rxjs";
import { RepositoryContext } from "../../App"
import { AppObservables } from "../../App.context";
import { PerforceService } from "../../Services/Perforce.service";

export const Opened = ({}) => {
    const repoState = useContext(RepositoryContext);
    const { DepotId } = repoState;
    const [summary, setSummary] = useState(null);
    const [userFilter, setUserFilter] = useState([]);
    const [actionFilter, setActionFilter] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredSummary, setFilteredSummary] = useState(null);

    const addFilter = (t, f) => {
        if (t === 'action' && actionFilter.indexOf(f) < 0)
            setActionFilter([...actionFilter, f]);
        else if (t === 'user'  && userFilter.indexOf(f) < 0)
            setUserFilter([...userFilter, f]);
    }
    
    const removeFilter = (t, f) => {
        if (t === 'action')
            setActionFilter(actionFilter.filter(a => a !== f));
        else if (t === 'user')
            setUserFilter(userFilter.filter(a => a !== f));
    }
    
    useEffect(() => {
        if (DepotId === null)
            return;

        AppObservables.AddBusyMessage('get-open', "Retrieving Files Open for Add, Edit & Deletion")
        PerforceService.Opened$(DepotId).pipe(take(1)).subscribe((result) => {
            setSummary(result);
            AppObservables.RemoveBusyMessage('get-open');
        })
    }, [DepotId])

    useEffect(() => {
        if (!summary) {
            setFilteredSummary(null);
            return;
        }
        let filtered = [...summary];
        if (userFilter.length > 0)
            filtered = filtered.filter(s => userFilter.indexOf(s.user) >= 0);
        
        if (actionFilter.length > 0)
            filtered = filtered.filter(s => actionFilter.indexOf(s.action) >= 0);

        if (searchFilter && searchFilter.length > 0)
            filtered = filtered.filter(s => 
                JSON.stringify(s).toLowerCase().indexOf(searchFilter.toLowerCase()) >= 0)

        setFilteredSummary(filtered);

    }, [summary, userFilter, actionFilter, searchFilter]);
    
    return (
        <div className="laws-opened-page" style={{marginTop:20, marginRight: 100}}>
            <div className="filter-row" style={{width: '100%'}}>
                <span className="p-input-icon-right">
                        <i className="pi pi-search" />
                        <InputText value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
                </span>
            </div>
            <Stack direction="vertical" gap={1} style={{marginTop: 20}}>
            <Stack direction="horizontal" gap={3} style={{marginBottom: 20, fontWeight: 600}}>
                <div>{filteredSummary?.length > 0 ? filteredSummary.length + ' opened files...' : 
                    'No Opened files matching this criteria...'}</div>
            {
                userFilter.length > 0 ? 
                    userFilter.map(u => 
                    <div key={"userFilter_" + u} className="laws-opened-filter"
                        onClick={() => removeFilter('user', u)}>#{u}
                    </div>) : null
            }
            {
                actionFilter.length > 0 ? 
                    actionFilter.map(u => 
                    <div key={"actionFilter_" + u} className="laws-opened-filter"
                        onClick={() => removeFilter('action', u)}>#{u}
                    </div>) : null
            }
            </Stack>
            {
                filteredSummary ? filteredSummary.map((s) => 
                    <Stack direction="horizontal" gap={3} key={s.clientFile} className="laws-opened-container">
                        <div className="laws-opened-file">{s.depotFile}</div>
                        <div className="laws-opened-action" data-result-val={s.action}
                            onClick={() => addFilter('action', s.action)}>{s.action}</div>
                        <div className="laws-opened-user"
                            onClick={() => addFilter('user', s.user)}>{s.user}</div>
                        <div className="laws-opened-revision">#{s.rev}/#{s.haveRev}</div>
                        <div className="laws-opened-change">{s.change}</div>
                    </Stack>
                ) : null
            }
        </Stack>
    </div>)
}