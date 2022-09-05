import { ServerOptions } from "./../../App";
import { Dropdown } from 'primereact/dropdown';
import { useState } from "react";
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { ajax } from 'rxjs/ajax';
import { take } from 'rxjs/operators';
import { ToastService } from '../../Services/Toast.service';
import { PerforceService } from "../../Services/Perforce.service";
import { Loading } from "../General/Loading";

export const Login = () => {

    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [server, setServer] = useState(null);
    const [authenticating, setAuthenticating] = useState(false);

    const onLogin = (e) => {
        if (!server) {
            ToastService.SendError("You need to select a server!")
            return;
        } else if (!loginUser || loginUser.length < 1) {
            ToastService.SendError("You forgot to enter your Username!")
            return;
        } else if (!loginPass || loginPass.length < 1) {
            ToastService.SendError("You forgot to enter your Password!")
            return;
        }
        setAuthenticating(true);
        PerforceService.Login(server, loginUser, loginPass)
        .subscribe((login) => {
            if (login) {
                ToastService.SendSuccess("Login Authenticated!");
                PerforceService.SetLogin(login);
            }

            setAuthenticating(false);
        })
    }
    return (
    <div className="flex flex-row flex-grow-1 align-items-center justify-content-center" 
        style={{width: '100vw', height: '100vh'}}>
        <div className="flex flex-column flex-grow-1 align-items-center justify-content-center">
            {
                authenticating ? <Loading text="Authenticating..." /> :
                <>
                    <p style={{width: 400, fontWeight: 500, color: '#6366f1', fontSize: 20}}>
                        Please Login to Continue...
                    </p>
                    <Dropdown style={{width: 400}} className="mt-2"
                        value={server} options={ServerOptions}
                        onChange={(e) => setServer(e.value)} optionLabel="label" placeholder="Select a Server" />
                    <p style={{width: 400, fontWeight: 500, marginTop: 40}}>
                                    User
                    </p>
                    <InputText value={loginUser} style={{width: 400}} onChange={(e) => setLoginUser(e.target.value)}/>

                    <p style={{width: 400, fontWeight: 500}}>
                                    Password
                    </p>
                    <Password value={loginPass} onChange={(e) => setLoginPass(e.target.value)} 
                    style={{width: 400}} feedback={false}/>
                    <div className="flex flex-column align-items-end justify-content-end" style={{width: 400}}>
                        <Button style={{marginTop: 40}} onClick={onLogin}>Login</Button>
                    </div>
                </>
            }
        </div>
    </div>
    )
    
    
}