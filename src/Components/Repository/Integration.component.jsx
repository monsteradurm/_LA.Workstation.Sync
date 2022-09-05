import { Dropdown } from "primereact/dropdown";
import { useContext, useEffect, useState } from "react";
import { Stack } from "react-bootstrap";
import { switchMap, take } from "rxjs";
import { ApplicationContext, RepositoryContext } from "../../App";
import { PerforceService } from "../../Services/Perforce.service";
import { TreeTable } from 'primereact/treetable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { RepositoryObservables } from "./Repository.context";
import { ToastService } from "../../Services/Toast.service";
import { InputText } from "primereact/inputtext";
import * as moment from 'moment';

const FormatTreeData = (data) => {
    const result = { key: data.path, data: {name: data.name, hasChildren: false, 
            size: data.size, mtime: moment(data.mtime).format('YY/MM/DD HH:mm') } };
    if (data.children) {
        result.children = data.children.map(c => FormatTreeData(c));
        result.data.hasChildren = true;
    }
    return result;
}
const SizeColumn = (row) => {
    let size;
    const kb = row.data.size / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;

    if (kb < 1024)
        size = `${Math.round(kb)} KB`
    else if (mb < 1024)
        size = `${Math.round(mb * 100) * 0.01} MB`
    else size = `${Math.round(gb * 100) *0.01} GB`
    return (
        <span style={{width: '100px'}}>
            {size}
        </span>);
}
const ModifiedColumn = (row) => {
    return (
        <span style={{width: '100px'}}>
            {row.data.mtime}
        </span>);
}

const NameColumn = (row) => {
    const icon = row.children ? 
        <i className="laws-folder fa fa-folder"></i> : null

    return (
        <span style={{width: '100%'}}>
            {icon}
            { row.children ?
                <label className="laws-tree-folder">
                    {row.data.name}
                </label>
                : 
                <label className="laws-tree-file">
                    {row.data.name}
                </label>
                
            }
        </span>);
}


export const Integration = ({}) => {
    const appState = useContext(ApplicationContext);
    const repoState = useContext(RepositoryContext);

    const [contents, setContents] = useState();
    const [selected, setSelected] = useState(null);
    const [toIntegrate, SetToIntegrate] = useState([]);
    const [globalFilter, setGlobalFilter] = useState(null);
    const [valid, setValid] = useState(null)
    const { IntegrationPath, Where, DepotId, IntegrationFile } = repoState;

    const onIntegrate = () => {
        const project = DepotId.split('.')[0];
        const src = Where.path
        .replace('\\...', '')
        .replace('\\...', '')
        .replace(/\\/g, '/');

        const dest = IntegrationPath.replace(/\\/g, '/');

        RepositoryObservables.AddBusyMessage('integrate-files', 'Integrating Selected Files...');
        PerforceService.IntegrateFiles$(toIntegrate, project, src, dest).pipe(take(1))
        .subscribe((res) => {
            console.log("Integrate RESULT", res);
            RepositoryObservables.RemoveBusyMessage('integrate-files');
            if (res) {
                setSelected(null);
                ToastService.SendSuccess('Integrated ' + res.result.length + ' Files.');
                SetListing();
            }
            
        })
    }

    const SelectionChanged = (change) => {
        console.log(Object.keys(change).filter(c => change[c].checked));
        setSelected(change);
    }

    useEffect(() => {
        RepositoryObservables.AddBusyMessage("integration-file", "Validating Integration File...");
        const sub = RepositoryObservables.IntegrationFile$.pipe(take(1),
        switchMap(fn => PerforceService.PathExists$(fn)))
        .subscribe(exists => {
            setValid(exists);
            
            RepositoryObservables.RemoveBusyMessage('integration-file');
        });

        return () => sub.unsubscribe();
    }, [])

    useEffect(() => {
        if (!selected) return
        
        const paths = Object.keys(selected);
        SetToIntegrate(Object.keys(selected)
            .filter(c => selected[c].checked)
            .map( f => f.replace(/\\/g, '/')))
    }, [selected])

    const SetListing = () => {
        const src = Where.path
            .replace('\\...', '')
            .replace('\\...', '')
        RepositoryObservables.AddBusyMessage(
            'get-integration-listing', 'Retrieving potential integrations...')
        PerforceService.IntegrationTree$(src, IntegrationPath).pipe(take(1))
        .subscribe((result) => {
            const root = FormatTreeData(result.listing)
            RepositoryObservables.RemoveBusyMessage('get-integration-listing');
            setContents(root.children);
        });
    }

    useEffect(() => {

        if ((!IntegrationPath || !Where) && contents) {
            setContents(null)
            return
        }
        if (IntegrationPath && Where) {
            SetListing();
        }
    }, [IntegrationPath]);

    const header = (
        <div className="text-right">
            <div className="p-input-icon-left">
                <i className="pi pi-search"></i>
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} 
                    placeholder="Search By Name" size="50" />
            </div>
        </div>
    )

    if ( !valid || !IntegrationPath)
        return (<Stack direction="horizontal" gap={1}>
            <div>This</div> 
            <div className="laws-attr-value">Repository</div> 
            <div>and/or</div>
            <div className="laws-attr-value">Workstation</div> 
            <div>is not currently setup for</div> 
            <div className="laws-attr-value">Integration</div> 
        </Stack>)

return (
    <>
    <Stack direction="vertical" gap={3} style={{marginTop: 40, marginRight: 100}}>
        <Stack direction="horizontal" gap={3}>
        <Stack direction="horizontal" gap={1}>
            <div>This</div> 
            <div className="laws-attr-value">Repository</div> 
            <div>will</div>
            <div className="laws-attr-value">Integrate</div> 
            <div>at</div> 
            <div className="laws-attr-value">{IntegrationPath}</div> 
        </Stack>
        </Stack>
        <TreeTable value={contents} selectionMode="checkbox" selectionKeys={selected}
        globalFilter={globalFilter} header={header}
        onSelectionChange={e => SelectionChanged(e.value)} autoLayout={true}>
            <Column field="name" header="Name" body={NameColumn} expander sortable></Column>
            <Column field="mtime" header="Last Modified" body={ModifiedColumn} sortable> </Column>
            <Column field="size" header="Size" body={SizeColumn} sortable></Column>
        </TreeTable>
    </Stack>
    {
        toIntegrate.length > 0 ?
        <Button label="Integrate Selection" style={{position: 'absolute', bottom: '20px', right: '100px'}} 
            onClick={onIntegrate} /> : null 
    }
    </>
)
}