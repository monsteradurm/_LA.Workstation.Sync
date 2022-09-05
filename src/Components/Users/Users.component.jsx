import { useEffect, useState } from "react";
import { NavigationService } from "../../Services/Navigation.service";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ScrollingPage } from "../General/ScrollingPage.component";
import { Stack } from "react-bootstrap";

export const Users = ({state}) => {
    useEffect(() => {
        NavigationService.SetTitles(['Users']);
    }, [])

    return (
    <ScrollingPage>
        <Stack direction="horizontal" gap={1}>
            <div>Found</div>
            <div className="laws-attr-value">{state.Users ? state.Users.length : 0}</div>
            <div>Users...</div>
        </Stack>
        <DataTable value={state.Users} responsiveLayout="scroll"
            emptyMessage="No Users found." dataKey="User">

        <Column field="User" header="User" sortable></Column>
        <Column field="FullName" header="Name" sortable></Column>
        <Column field="Email" header="Email" sortable></Column>
        <Column field="Update" header="Last Updated" sortable></Column>
        <Column field="Access" header="Last Accessed" sortable></Column>
        </DataTable>
    </ScrollingPage>)
}