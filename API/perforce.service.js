import P4 from "p4api"

export class PerforceService {
    static async Login(addr, user, password) {
        const p4 = new P4.P4({ 
            p4set: {
                P4PORT: addr}
        });

        p4.addOpts({env:{P4USER: user}})
        return await p4.cmd("login", password);
        //return await p4.cmd("login -s");
    }

    static async Describe(id, login) {
        const p4 = await PerforceService.Connection(login);
        return p4.cmd('describe -s ' + id);
    }

    static async Connection(login) {
        const {Server, Username, Password} = login;
        const p4 = new P4.P4({ 
            p4set: {
                P4PORT: Server}
        });

        p4.addOpts({env:{P4USER: Username}})
        await p4.cmd("login", Password);
        return p4;
    }

    static async Clients(login) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("clients -u " + login.Username);       
    }

    static async Depots(login) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("depots");
    }


    static async Where(login, map, client) {
        const p4 = await PerforceService.Connection(login);
        await p4.cmd("set P4CLIENT=" + client);
        console.log(client);
        console.log(map);
        return await p4.cmd("where //" + map + "/...")
    }

    static async Changes(login, depot, client, type) {
        const p4 = await PerforceService.Connection(login);
        await p4.cmd("set P4CLIENT=" + client);
        return await p4.cmd(`changes -m 100 -s ${type} //${depot}/...`); 
    }

    static async Groups(login) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("groups -u " + login.Username);
    }

    static async Protects(login) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("protects -u " + login.Username);
    }

    static async Users(login) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("users");
    }

    static async InitializeUser(login) {
        
        const p4 = await PerforceService.Connection(login);
        const clientsResult = await p4.cmd(`clients -u ${login.Username}`); 
        const depotsResult = await p4.cmd("depots");
        const groupsResult = await p4.cmd("groups -u " + login.Username);
        const usersResult = await p4.cmd("users");
        return { Clients: clientsResult.stat, //.filter(c => c.Host === login.Host), 
                 Depots: depotsResult.stat, 
                 Groups: groupsResult.stat, 
                 Users: usersResult.stat };
    }

    static async Client(login, name) {
        const p4 = await PerforceService.Connection(login);
        PerforceService.SetClientConfig(p4, name);
        let out = await p4.cmd("client -o")
        return out;
    }

    static async Opened(login, name) {
        const p4 = await PerforceService.Connection(login);
        return await p4.cmd("opened -a //" + name + '/...');
    }
    static async SetIgnore(login, client, ignore) {
        const p4 = await PerforceService.Connection(login);
        PerforceService.SetClientConfig(p4, client);
        p4.addOpts({env: {P4Ignore:ignore.replace('\\', '/')}})
    };

    static async ReadIgnores(login, client, depot) {
        const p4 = await PerforceService.Connection(login);
        PerforceService.SetClientConfig(p4, client);
        let out = await p4.cmd(`ignores //${client}/${depot}/...`);
        return out;
    }

    static async SetClientConfig(p4, client) {
        p4.addOpts({env:{
            P4CLIENT:client, 
            P4CONFIG: "p4config.txt",
            }
        })
    } 

    static async Sync(login, client, from, to) {
        const p4 = await PerforceService.Connection(login);
        PerforceService.SetClientConfig(p4, client);
        return await p4.cmd(`sync -s ${from} ${to}`);
    }

    static async UpsertClient(login, config) {
        const p4 = await PerforceService.Connection(login);
        console.log('p4 -u acranch-perforce  client -i < ' + config);

        return await p4.rawCmd('client -i ', config);
    }

}