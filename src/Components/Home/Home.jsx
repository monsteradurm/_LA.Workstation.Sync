import { useEffect } from "react"
import { Stack } from "react-bootstrap"
import { NavigationService } from "../../Services/Navigation.service"
import { ScrollingPage } from "../General/ScrollingPage.component"

export const Home = ({state}) => {

    useEffect(() => {
        NavigationService.SetTitles(['Home']);
    }, [])

    return (
        <ScrollingPage style={{fontSize: 12}}>
           <div style={{marginTop: 20, fontSize: 17}}>
                You currently have membership for <span className="laws-attr-value">{state.Groups?.length}</span> Permission Groups:
            </div>
            <Stack direction="vertical" style={{padding: '10px 50px'}}>
                {
                    state.Groups ? state.Groups.map(g => 
                        <div key={g.group} style={{fontWeight:600}}>{g.group}</div>
                    ) : 
                    <div className="laws-empty">No Groups to Display...</div> 
                }
            </Stack>
            <div style={{marginTop: 20}}>
                You have initialized <span className="laws-attr-value">
                    {state.Clients?.length}
                </span> Workspaces for <span className="laws-attr-value">{state.Login.Host}</span>:
            </div>
            <Stack direction="vertical" style={{padding: '10px 50px'}}>
                {
                    state.Clients ? state.Clients.map(d => 
                        <div key={d.client + '_client'} 
                            style={{fontWeight:600, width:'40%'}}>{d.client}</div>
                    ) : null
                }
            </Stack>
            <div style={{marginTop: 20}}>
                You currently have access to <span className="laws-attr-value">{state.Depots?.length}</span> Repositories:
            </div>
            <Stack direction="vertical" style={{padding: '10px 50px'}}>
                {
                    state.Depots ? state.Depots.map(d => 
                        <div key={d.name + '_depot'} style={{fontWeight:600}}>{d.name}</div>
                    ) : 
                    <div className="laws-empty">No Repositories to Display...</div> 
                }
            </Stack>
        </ScrollingPage>
    )
}