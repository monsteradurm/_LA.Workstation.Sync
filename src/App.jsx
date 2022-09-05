
import React, { useEffect, useState, useRef, useReducer } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Login } from './Components/Login/Login.component';
import { Toast } from 'primereact/toast';
import { ToastService } from './Services/Toast.service';
import { NavigationComponent } from './Components/Navigation/Navigation.component';
import { ApplicationState, AppObservables, DispatchApplicationState } from './App.context';
import { PerforceService } from './Services/Perforce.service';
import { Home } from './Components/Home/Home';
import { Repository } from './Components/Repository/Repository.component';
import { Terminal } from './Components/Terminal/Terminal.component';
import { Users } from './Components/Users/Users.component';
import { Tooltip } from 'primereact/tooltip';
import './App.css';
import * as _ from 'underscore';
import { Loading } from './Components/General/Loading';
import { DispatchRepositoryState, RepositoryState } from './Components/Repository/Repository.context';
import { Packaging } from './Components/Repository/Packaging.component';
import { Initialization } from './Components/Repository/Initialization.component';
import { Changes } from './Components/Repository/Changes.component';
import { of, switchMap, tap } from 'rxjs';
import { Ignore } from './Components/Repository/Ignore.component';
import { Opened } from './Components/Repository/Opened.component';
import { DisplayWhen } from './Components/General/DisplayWhen';
import { BusyHandler } from './Components/General/BusyHandler';
import { Integration } from './Components/Repository/Integration.component';

export const ServerOptions = [{label: 'Liquid Animation', value: 'ssl:52.147.58.109:1666'}, 
    {label: 'Walt Disney Imagineering', value: 'ssl:10.10.100.80:1666'}]

export const ApplicationContext = React.createContext(ApplicationState);
export const RepositoryContext = React.createContext(RepositoryState);

function App() {
  const [initialized, setInitialized] = useState(false);
  const [state, dispatch] = useReducer(DispatchApplicationState, ApplicationState);
  const [repoState, repoDispatch] = useReducer(DispatchRepositoryState, RepositoryState);

  const [servername, setServername] = useState(null);
  const toastRef = useRef(null);

  const { BusyMessage, Depots } = state;

  useEffect(() => {
    if (!Depots && state.Login) {
      AppObservables.AddBusyMessage('get-depots', 
        `Fetching All Repositories & Workspaces for ${state.Login.Username}...`);
    } else {
      AppObservables.RemoveBusyMessage('get-depots');
    }
  }, [Depots, state.Login]);

  useEffect(() => {
    if (state.Login?.Server) {
      setServername(_.find(ServerOptions, (o) => o.value === state.Login.Server)?.label)
    }
    if (!state.Login)
      AppObservables.AddBusyMessage('login', 'Logging in User...');
    else AppObservables.RemoveBusyMessage('login');

  }, [state.Login])

  useEffect(() => {
    if (initialized)
      AppObservables.RemoveBusyMessage('INIT');

  }, [initialized])

  useEffect(() => {
    const subs = [];

    /*
    subs.push(
      AppObservables.BusyMessage$.subscribe((msg) => {
        dispatch({type: 'BusyMessage', value: msg})
      })
    )*/

    subs.push(
      PerforceService.Initialized$.subscribe(u => {
      setInitialized(u);
    }))

    subs.push(
      PerforceService.Login$.subscribe((u) => {
        dispatch({type: 'Login', value: u});
      })
    )

    subs.push(
      PerforceService.Clients$.subscribe((u) => {
        dispatch({type: 'Clients', value: u});
      })
    )

    subs.push(
      PerforceService.Users$.subscribe((u) => {
        dispatch({type: 'Users', value: u});
      })
    )

    subs.push(
      PerforceService.Depots$.subscribe((u) => {
        dispatch({type: 'Depots', value: u});
      })
    )

    subs.push(
      PerforceService.Groups$.subscribe((u) => {
        dispatch({type: 'Groups', value: u});
      })
    )

    return () => subs.forEach(s => s.unsubscribe());

  }, []);
  
  ToastService.SetToaster(toastRef);


  if (!initialized)
    return null;
  
  return (
      <div className="App">
        <ApplicationContext.Provider value={state}>
          <BrowserRouter>
            <header className="App-header">
              <NavigationComponent state={state} servername={servername}/>
            </header>
            <Tooltip target=".laws-tooltip" />
            <Toast ref={toastRef} position="top-right"></Toast>
            {
              !state.Login ? <Login /> : 
              <BusyHandler message$={AppObservables.BusyMessage$}>
                <DisplayWhen condition={!!state.Login} alt={null}>
                  <Routes>
                    <Route path="/" element={<Home state={state} />} />
                    <Route path="Home" element={<Home state={state} />} />
                    <Route path="Repositories" element={
                        <RepositoryContext.Provider value={repoState}>
                          <Repository repoDispatch={repoDispatch}/>
                        </RepositoryContext.Provider>} >
                      <Route path="Opened" element={<Opened repoDispatch={repoDispatch}/>} />
                      <Route path="Packaging" element={<Packaging repoDispatch={repoDispatch}/>} />
                      <Route path="Integration" element={<Integration repoDispatch={repoDispatch}/>} />
                      <Route path="Changes" element={<Changes repoDispatch={repoDispatch}/>} />
                      <Route path="Ignore" element={<Ignore repoDispatch={repoDispatch} />} />
                      <Route path="Initialization" element={<Initialization repoDispatch={repoDispatch}/>} />
                    </Route>
                    <Route path="Users" element={<Users state={state}/>} />
                    <Route path="Terminal" element={<Terminal />} />
                  </Routes>
                </DisplayWhen>
              </BusyHandler>
              /*
              <div style={{height: 'calc(100vh - 70px)', display: !state.Login ? 'none' : null}}>
                <Loading text={BusyMessage} /> 
              </div> : null*/
            }
            
          </BrowserRouter>
        </ApplicationContext.Provider>
      </div>
    );
    
}

export default App;
