import { Dropdown } from "primereact/dropdown";
import { useContext, useEffect, useState } from "react";
import { Stack } from "react-bootstrap";
import { take } from "rxjs";
import { ApplicationContext, RepositoryContext } from "../../App";
import { PerforceService } from "../../Services/Perforce.service";
import { TreeTable } from 'primereact/treetable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { RepositoryObservables } from "./Repository.context";
import { ToastService } from "../../Services/Toast.service";
import * as moment from 'moment';
import { InputText } from "primereact/inputtext";

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


export const Packaging = ({}) => {
    const appState = useContext(ApplicationContext);
    const repoState = useContext(RepositoryContext);

    const { PackagingOptions, DepotId } = repoState;
    const [root, setRoot] = useState(null);
    const [contents, setContents] = useState();
    const [selected, setSelected] = useState(null);
    const [toPackage, SetToPackage] = useState([]);
    const [globalFilter, setGlobalFilter] = useState(null);

    const onPackage = () => {
        const project = DepotId.split('.')[0];
        const base = root.Path.replace(/\\/g, '/');

        RepositoryObservables.AddBusyMessage('package-files', 'Packaging Selected Files...');
        PerforceService.PackageFiles$(toPackage, project, base).pipe(take(1))
        .subscribe((res) => {
            console.log("PACKAGE RESULT", res);
            RepositoryObservables.RemoveBusyMessage('package-files');
            if (res) {
                setSelected(null);
                ToastService.SendSuccess('Packaged ' + res.result.length + ' Files.');
            }
            
        })
    }

    const SelectionChanged = (change) => {
        console.log(Object.keys(change).filter(c => change[c].checked));
        setSelected(change);
    }

    useEffect(() => {
        console.log(toPackage);
    }, [toPackage])

    useEffect(() => {
        if (!selected) return
        
        console.log(selected);
        const paths = Object.keys(selected);
        console.log(paths);
        
        SetToPackage(Object.keys(selected)
            .filter(c => selected[c].checked)
            .map( f => f.replace(/\\/g, '/')))
    }, [selected])

    useEffect(() => {
        if (!PackagingOptions && !!root)
            setRoot(null);

        else if (!!PackagingOptions && !root)
            setRoot(PackagingOptions[0]);
    }, [PackagingOptions]);

    useEffect(() => {
        if (!root && contents)
            setContents(null)
        else if (root) {
            RepositoryObservables.AddBusyMessage('get-listing', 'Retrieving contents (' + root.Label + ')')
            PerforceService.DirectoryTree$(root.Path).pipe(take(1))
            .subscribe((result) => {
                const root = FormatTreeData(result.listing)
                RepositoryObservables.RemoveBusyMessage('get-listing');
                setContents(root.children);
            });
        }
    }, [root])

    const header = (
            <div className="text-right">
                <div className="p-input-icon-left">
                    <i className="pi pi-search"></i>
                    <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} 
                        placeholder="Search By Name" size="50" />
                </div>
            </div>
    )
    
    if ( !PackagingOptions )
        return (<Stack direction="horizontal" gap={1}>
            <div>This</div> 
            <div className="laws-attr-value">Repository</div> 
            <div>is not currently setup for</div> 
            <div className="laws-attr-value">Packaging</div> 
        </Stack>)

    return (
        <>
        <Stack direction="vertical" gap={3} style={{marginTop: 20, marginRight: 100}}>
            <Stack direction="horizontal" gap={3}>
                <Dropdown optionLabel="Label" value={root} style={{width: 200}}
                    options={PackagingOptions} onChange={(e) => setRoot(e.value)} />
                <div>{root?.Path}</div>
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
            toPackage.length > 0 ?
            <Button label="Package Selection" style={{position: 'absolute', bottom: '20px', right: '100px'}} 
                onClick={onPackage} /> : null 
        }
        </>
    )
}