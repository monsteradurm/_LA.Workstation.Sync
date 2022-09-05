import { useContext, useEffect, useRef, useState } from 'react';
import { Dropdown, Navbar, Container, Stack } from 'react-bootstrap';
import { ApplicationContext } from '../../App';
import { NavigationService } from '../../Services/Navigation.service';
import { Button } from 'primereact/button';
import "./Navigation.scss";
import * as _ from 'underscore';
import { useNavigate } from 'react-router-dom';
import { PerforceService } from '../../Services/Perforce.service';
import { TieredMenu  } from 'primereact/tieredmenu';

const WORKSPACE_GROUPS = {
    'LADUS' : 'LADUS_DisneyUS',
    'LAL' : 'LAL_Lego',
    'LAG' : 'LAG_General',
    'LAS' : 'LAS_Spunge',
    'LADC' : 'LADC_DisneyChina',
    'LADJ' : 'LADJ_DisneyJapan',
    'LADAUS' : 'LADUS_DisneyAustralia',
    'LAU' : 'LAU_Universal',
    'LAIU' : 'LAIU_InvisibleUniverse',
    'LASC' : 'LASC_SnapChat',
    'LAT' : 'LAT_Technical',
    'Resources' : 'Resources',
    '_Environment' : '_Environment',
    '_Development' : '_Development'
}

const recursivelyAddItems = (items) => {
    if (Array.isArray(items))
        return items;

    return Object.keys(items).map(i =>
        ({
            label: i,
            items: recursivelyAddItems(items[i])
        })
    )
} 

export const NavigationComponent = ({state, servername}) => {
    const [titles, setTitles] = useState([]);
    const [depotMenu, setDepotMenu] = useState([]);
    const navigation = useNavigate();
    const depotMenuRef = useRef();
    
    const navigateTab = (url) => {
        console.log(url);
        window.open(url, '_blank').focus();
    }
    const navigateTo = (evt, page, params) => {
        const url = page + (        
            params ? '?' + 
                Object.entries(params)
                .map(p => p[0] + '=' + p[1])
                .join('&')
                : ''
            )

        navigation({
            pathname: url
        });

        if (evt)
            depotMenuRef.current.toggle(evt);
    }

    const signOut = () => {
        PerforceService.SignOut();
    }

    useEffect(() => {
        if (!state.Depots) return;

        const depotsById = _.groupBy(state.Depots, (d) => {
            if (d.name.indexOf('_') === 0)
                return d.name;

            const nameArr = d.name.split('.');
            if (nameArr.length < 3)
                return nameArr[0];

            return nameArr[0] + '_' + nameArr[1];
        });
        const Repositories = '/Repositories/Initialization';
        const depotsByGroup = _.reduce(Object.entries(depotsById), 
        (acc, [name, depots]) => {
            const addDepots = (key) => {
                
                if (name.indexOf('_') !== 0) {
                    if (!acc[key])
                        acc[key] = {}

                    acc[key][name] = depots.map(d => ({
                        label: _.last(d.name.split('.')), 
                        command: (evt) => { navigateTo(evt, Repositories, {name: d.name}) }
                    }))
                }
                else if (name.indexOf('_') === 0) {
                    if (!acc[key])
                        acc[key] = [];

                    acc[key].push({
                            label: name, 
                            command: (evt) => { navigateTo(evt, Repositories, {name: name}) }
                    })
                }
                
            }

            const key = _.find(Object.keys(WORKSPACE_GROUPS), k => name.indexOf(k) === 0)
            if (key) {
                addDepots(WORKSPACE_GROUPS[key]);
            } else {
                addDepots('Other');
                return acc;
            }

            return acc;
        }, {});

        
        const result = recursivelyAddItems(depotsByGroup);
        setDepotMenu(result);

    }, [state.Depots])
    
    useEffect(() => {
        const subs = [];

        subs.push(
            NavigationService.Titles$.subscribe(setTitles)
        )

        return () => subs.forEach(s => s.unsubscribe())
    }, [])

    return (
    <Navbar expand="lg" bg="dark" style={{height: 70, zIndex:1000}} id="laws-navbar">
        <TieredMenu model={depotMenu} popup ref={depotMenuRef} />
        <Stack direction="vertical">
            <Stack direction="horizontal" style={{marginLeft: 20, marginRight: 20, maxWidth: 'unset'}}>
                <Navbar.Brand href="#home" style={{color:"white", textAlign:"left"}}>
                    LA Workstation Sync
                </Navbar.Brand>
                <div className="ms-auto"></div>
                {
                    depotMenu && depotMenu.length > 0 ?
                <>
                    <Button icon="pi pi-home" className="laws-navbutton" 
                        onClick={(evt) => navigateTo(null, "/Home")}/>
                    <Button icon="pi pi-list" className="laws-navbutton"
                        onClick={(evt) => depotMenuRef.current.toggle(evt)}/>
                    <Button icon="pi pi-user" className="laws-navbutton"
                        onClick={(evt) => navigateTo(null, "/Users")}/>
                    <Button icon="pi pi-code" className="laws-navbutton"
                        onClick={(evt) => navigateTo(null, "/Terminal")}/>
                    <Button icon="pi pi-question-circle" className="laws-navbutton"
                        onClick={(evt) => navigateTab(
                        "https://liquidanimation.atlassian.net/wiki/spaces/LAT0003/pages/498761729/Repositories")}/>
                </> : null
                }
                <div className="ms-auto"></div>
                <Navbar.Brand href="#home" 
                    style={{color:"white", textAlign:"right", fontSize: 16, marginRight:0}}>
                    {state?.Login?.Username ? 
                    'Logged in as: ' + state.Login.Username : null}
                </Navbar.Brand>
                <Button icon="pi pi-sign-out" className="laws-navbutton signout" onClick={() => signOut() }/>
            </Stack>
            <Stack direction="horizontal" style={{height: 30, maxWidth: '100vw', lineHeight: '28px',
                width: '100vw', fontSize: 15, color: 'white', verticalAlign: 'middle',
                paddingLeft: 20, paddingRight: 20, fontWeight: 400,
                background: '#6366F1', borderBottom: 'solid 2px black'}} gap={3}>
                    <div> {servername} </div>
                    {
                        titles ? titles.map(t => 
                            <div className="laws-title" key={t + '_title'}>
                                {t}
                            </div>) : null
                    }
                    <div className="ms-auto"></div>
            </Stack>
        </Stack>
    </Navbar>);
}