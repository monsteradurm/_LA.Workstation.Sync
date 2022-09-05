import path from "path";
import bodyParser from "body-parser"
import fs from "fs";
import express from "express";
import httpProxy from "http-proxy";
import util from "util";
import os from "os";
import { exec } from 'child_process';
import { timer } from "rxjs";
import { tap } from "rxjs/operators";
import { PerforceService } from "./perforce.service.js";
import { EnvironmentService } from "./Environment.service.js";
import moment from 'moment';
import * as nc from 'node-cache';
import * as dt from "directory-tree";

const dirTree = dt.default;
const NodeCache = nc.default;
const myCache = new NodeCache();

const HOST = os.hostname();
const CURRENTUSER = os.userInfo()['username'];

export const SERVERS = {
    'ssl:52.147.58.109:1666' : '_LA.Repositories',
    'ssl:10.10.100.80:1666':   '_WDI.Repositories',
    'Liquid Animation' : '_LA.Repositories',
    'Walt Disney Imagineering' : '_WDI.Repositories'
}

import {fileURLToPath} from 'url';
import _ from "underscore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 4000;

const WriteLastLogin = (details) => {
    const fn = "C:\\_LA.Repositories\\connection.json";
    const data = ReadLastLogin();
    fs.writeFileSync(fn, JSON.stringify(
        {...(data ? data : {}), ...details}
    ));
}

export const ReadLastLogin = () => {
    const fn = "C:\\_LA.Repositories\\connection.json";
    let rawdata = {}

    if (fs.existsSync(fn)) {
        try {
            rawdata = JSON.parse(fs.readFileSync(fn));
        } catch { }
        
    }

    return rawdata;
}

var proxy = httpProxy.createProxyServer({});
var app = express();

const LOG_PATH = 'C:/_LA.Workstation/_LA.Workstation.Sync.log';
var log_file = fs.createWriteStream(LOG_PATH, {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(new moment().format('HH:MM:SS DD/MM/YYYY') + '\t' + util.format(d) + '\n');
  log_stdout.write(new moment().format('HH:MM:SS DD/MM/YYYY') + '\t' + util.format(d) + '\n');
};

proxy.on('error', function(e) {
    console.log(e);
});
app.use(express.json());
app.use(express.static(__dirname + '/../build'));

app.post('/dir-tree', (req, res) => {
    const root = req.body.root;
    res.send( { listing: dirTree(root, {attributes:['mode', 'mtime', 'size']}) });
});

app.post('/integration-tree', (req, res) => {
    const src = req.body.src.replace(/\\/g, '/')
    const dest = req.body.dest.replace(/\\/g, '/')

    const isOutdated = (data) => {
        const path = data.path.replace(/\\/g, '/')
        const destPath = path.replace(src, dest);

        console.log("/Integration A: " + path)
        console.log("/Integration B: " + destPath)
        let integrate = false;
        
        if (!fs.existsSync(destPath)) {
            console.log("--- DOES NOT EXIST ---");
            integrate = true;
        }

        else if (fs.lstatSync(path).mtimeMs > fs.lstatSync(destPath).mtimeMs) {
            integrate = true;
            console.log("--- IS OUTDATED ---")
        }
        return integrate;
    }

    const ParseValidTree = (data) => {
        if (!data.children || data.children.length < 1)
            return data;
        
        const children = data.children
            .filter(c => c.children || isOutdated(c))
            .map(c => ParseValidTree(c))
            .filter(c => !c.children || c.children.length > 0); 

        return {...data, children};
    }

    res.send( { listing: ParseValidTree(
        dirTree(src, {attributes:['mode', 'mtime', 'size']})
    ) } );
});
//login, files, project, src, dest
app.post('/integrate', (req, res) => {
    const { login, files, project, src, dest } = req.body;
    if (!login || !files || !project || !Array.isArray(files) || !src || !dest)
        res.send({error: 'Missing required details.'})
    else {
        const result = [];
        files.forEach(f => {
            if (fs.lstatSync(f).isDirectory())
                return;

            const integrationPath = f.replace(src, dest);
            const folder = path.dirname(integrationPath);
            
            if (!fs.existsSync(folder))
                fs.mkdirSync(folder, {recursive: true});

            fs.copyFileSync(f, integrationPath);
            result.push(integrationPath);
        });

        exec(`cmd.exe /K "start ${dest}" && exit`);
        res.send({src, dest, result});
    }
})

app.post('/package', (req, res) => {
    const { login, files, project, base } = req.body;
    if (!login || !files || !project || !Array.isArray(files))
        res.send({error: 'Missing required details.'})
    else {
        const today = new moment().format('YYMMDD_HH')
        let root = `C:/${SERVERS[login.Server]}/_Packaging/${project}/${today}`

        if (!fs.existsSync(root))
            fs.mkdirSync(root, {recursive: true});

        const result = [];
        files.forEach(f => {
            if (fs.lstatSync(f).isDirectory())
                return;
            const dest = f.replace(base, root);
            const folder = path.dirname(dest);
            
            if (!fs.existsSync(folder))
                fs.mkdirSync(folder, {recursive: true});

            fs.copyFileSync(f, dest);
            result.push(dest);
        });

        exec(`cmd.exe /K "start ${root}" && exit`);
        res.send({path: base, result});
    }
})

app.post('/login', (req, res) => {
    const user = req.body.user;
    const password = req.body.password;
    const addr = req.body.address;

    console.log("Login Request:", req.body);
    PerforceService.Login(addr, user, password).then((result) => {
    
        const details = ReadLastLogin();
        if (!details[CURRENTUSER])
            details[CURRENTUSER] = {};
        
        details[addr] = {Server: addr, Username: user, Password: password, Host: HOST}; 
        details[CURRENTUSER]['Last'] = addr;

        WriteLastLogin(details);
        res.send({Server: addr, Username: user, Password: password, Host: HOST});
    })
    .catch((err) => {
        console.log(err);
        res.sendStatus(500)
    });
})

app.post('/where', (req, res) => {
    const login = req.body.login;
    const mapping = req.body.map;
    const client = req.body.client;

    const key = 'p4 where //' + client;
    console.log(key);

    const cached = myCache.get(key)
    if (cached !== null && cached !== undefined) {
        console.log("--- USING CACHED RESULT ---")
        console.log(cached);
        res.send(cached)
    } else {
        
        PerforceService.Where(login, mapping, client).then((result) => {
            console.log("Where result: " + JSON.stringify(result));
            if (result)
                myCache.set( key, result );
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
});

app.post('/get-client', (req, res) => {
    const login = req.body.login;
    const name = req.body.name;
    
    const key = 'p4 client ' + name;
    console.log(key)
    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
        PerforceService.Client(login, name).then((result) => {
            myCache.set(key, result.stat[0]);
            res.send(result.stat[0]);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
});

app.post('/initialize-user', (req, res) => {
    const login = req.body.login;
    
    const key = "laws-Initialize " + login.Username
    console.log(key)
    
    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
            PerforceService.InitializeUser(login).then((result) => {
                myCache.set(key, result);
                res.send(result);
            })
    }
});

app.post('/workspace', (req, res) => {
    const login = req.body.login;
    const name = req.body.name;
    PerforceService.CreateWorkspace(login, name).then((result) => {
        const stat = result.stat;
        if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
        res.send(_.filter(stat, s => s.Host === HOST));
    })
    .catch((err) => {
        console.log(err);
        res.sendStatus(500)
    });
});
app.post('/clients', (req, res) => {
    const login = req.body.login;
    const key = "p4 clients -u " + login.Username
    console.log(key)

    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
        PerforceService.Clients(login).then((result) => {
            const stat = result.stat;
            if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
            myCache.set(key, stat);
            res.send(stat); //_.filter(stat, s => s.Host === HOST));
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
})

app.post('/depots', (req, res) => {
    const login = req.body.login;

    const key = "p4 depots -u " + login.Username
    console.log(key)
    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
        PerforceService.Depots(login).then((result) => {
            const stat = result.stat;
            if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
            myCache.set(key, stat);
            res.send(stat);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
})

app.post('/path-exists', (req, res) => {
    const path = req.body.path;
    if (fs.existsSync(path))
        res.send({ exists: true });

    else res.send({ exists: false });
});

app.post('/groups', (req, res) => {
    const login = req.body.login;

    const key = "p4 groups -u " + login.Username
    console.log(key)
    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
        PerforceService.Groups(login).then((result) => {
            const stat = result.stat;
            if (!stat || !Array.isArray(stat)) return res.sendStatus(500);

            myCache.set(key, stat);
            res.send(stat);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
})

app.get('/terminal', (req, res) => {
    const lines = fs.readFileSync(LOG_PATH)
    res.send(lines);
});

app.post('/log-message', (req, res) => {
    console.log(req.body.message);
    res.sendStatus(200);
})

app.post('/users', (req, res) => {
    const login = req.body.login;

    const key = "p4 users"
    console.log(key)
    const cached = myCache.get(key)
    if (cached) {
        console.log("--- USING CACHED RESULT ---")
        res.send(cached)
    } else {
        PerforceService.Users(login).then((result) => {
            const stat = result.stat;
            
            if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
            myCache.set(key, stat, 1200);
            res.send(stat);
        })
        .catch((err) => {
            console.log(err);
            res.sendStatus(500)
        });
    }
})

app.post('/protects', (req, res) => {
    const login = req.body.login;
    PerforceService.Protects(login).then((result) => {
        const stat = result.stat;
        if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
        res.send(stat);
    })
    .catch((err) => {
        console.log(err);
        res.sendStatus(500)
    });
})

app.post('/describe', (req, res) => {
    const login = req.body.login;
    const id = req.body.id;
    PerforceService.Describe(id, login).then((result) => {
        const stat = result.stat;
        if (!stat || !Array.isArray(stat)) return res.sendStatus(500);
        res.send(stat[0]);
    })
    .catch((err) => {
        console.log(err);
        res.sendStatus(500)
    });
})

app.get('/lastlogin', (req, res) => {
    console.log("LAWS --> Retrieving login cache...")
    const details = ReadLastLogin();
    if (!details || !details[CURRENTUSER]) {
        res.send(null);
    } else {
        res.send(details[CURRENTUSER]);
    }
});

app.post('/logout', (req, res) => {
    const details = ReadLastLogin();
    if (!details || !details[CURRENTUSER]) {
        res.sendStatus(200);
    }
    else {
        details[CURRENTUSER] = null;
        WriteLastLogin(details);
        res.sendStatus(200);
    }
});

app.post('/init-client', (req, res) => {
    const { client, login} = req.body;
    let config = `Client: ${client.name}\n` +
        `Root: \t${client.root}\n` + 
        `Owner: ${login.Username}\n` +
        `Host: \t${login.Host}\nView:\n`;

    myCache.del( "p4 clients -u " + login.Username );
    myCache.del( 'p4 where //' + client.name);
    myCache.del( 'p4 client ' + client.name);
    myCache.del("laws-Initialize " + login.Username)
    
    const views = client.view.map(v => v.from.replace('+', '') + ' ' + v.to);

    _.uniq(views).forEach((v, i) => {
        config += '\t' + v +'\n'
    });

    if (!fs.existsSync(client.root)){
        fs.mkdirSync(client.root);
    }

    const configFile = client.root + '/' + 'clientSpec.txt';
    fs.writeFileSync(configFile, config);

    PerforceService.UpsertClient(login, config).then(result => {
        //fs.unlinkSync(configFn)
        PerforceService.Client(login, client.name).then((clientResult) => {
            res.send(clientResult);
        })
    });
});

app.post('/init-depot', (req, res) => {
    const { client, depot, stream, login} = req.body;

    myCache.del( "p4 depots -u " + login.Username );

    let config = `Client: ${client.name}\n` +
        `Root: \t${client.root}\n` + 
        `Owner: ${login.Username}\n` +
        `Host: \t${login.Host}\nView:\n`;

    const views = client.view.map(v => v.from.replace('+', '') + ' ' + v.to)
    views.push('//' + depot + '/... //' + client.name + '/' + depot + '/...');

    _.uniq(views).forEach((v, i) => {
        config += '\t' + v +'\n'
    });

    const depot_folder = client.root + "/" + depot;

    if (!fs.existsSync(depot_folder)){
        fs.mkdirSync(depot_folder);
    }

    const configFile = client.root + '/' + 'clientSpec.txt';
    fs.writeFileSync(configFile, config);

    PerforceService.UpsertClient(login, config).then(result => {
        //fs.unlinkSync(configFn)
        PerforceService.Client(login, client.name).then((clientResult) => {
            res.send(clientResult);
        })
    })
})
app.post('/set-ignore', (req, res) => {
    const login = req.body.login;
    const root = req.body.root;
    const client = req.body.client;
    const ignore = root + "/.p4ignore.txt";
    
    if (fs.existsSync(ignore)) {
        PerforceService.SetIgnore(login, client, root)
        res.send({ignore});
    } else {
        res.send({ignore: null})
    }
})

app.post('/set-config', (req, res) => {
    const login = req.body.login;
    const client = req.body.client;
    const root = req.body.root;

    const config = root + "/p4Config.txt";

    if (!fs.existsSync(config)) {
        const configData = `P4PORT=${login.Server}\n` +
            `P4USER=${login.Username}\n` +
            `P4CLIENT=${client}`;

        fs.writeFileSync(config, configData);
    }

    PerforceService.Client(login, client).then((result) => {
        /* Refresh config by calling client */
        res.send({config});
    })
});
app.get('/restart', (req, res) => {
    process.exit(1)
});


app.post('/read-file', (req, res) => {
    const path = req.body.filename;

    if (!fs.existsSync(path))
        res.send({error: 'Path Does Not Exist'})
    else {
        const data = fs.readFileSync(path, 'utf8');
        res.send({data});
    }
    
})

app.post('/ignores', (req, res) => {
    const login = req.body.login;
    const client = req.body.client;
    const depot = req.body.depot;

    if (!login || !client || !depot) {
        res.sendStatus(500)
    } else {

        PerforceService.ReadIgnores(login, client, depot).then((result) => {
            res.send(result);
        })
    }
})

app.post('/changes', (req, res) => {
    const { login, depot, client, type } = req.body;

    if (!login || !depot ) {
        console.log("CHANGE INCORRECT PARAMETERS")
        res.sendStatus(500)
    } else {
        PerforceService.Changes(login, depot, client, type).then((result) => {
            console.log("CHANGES RESULOT" + JSON.stringify(result));
            res.send(result);
        })
    }
})

app.post('/opened', (req, res) => {
    const { login, depot } = req.body;
    if (!login || !depot ) {
        console.log("OPENED INCORRECT PARAMETERS")
        res.sendStatus(500)
    } else {
        PerforceService.Opened(login, depot).then((result) => {
            console.log("OPENED RESULT" + JSON.stringify(result));
            res.send(result.stat);
        })
    }
})
app.post('/explore', (req, res) => {

    const path = req.body.path;

    console.log(`cmd.exe /K "start ${path}" && exit`);
    if (!path || !fs.existsSync(path)) {
        res.send({error: 'Could not find path'})
    } else {
        exec(`cmd.exe /K "start ${path}" && exit`);
        res.sendStatus(200);
    }
});

app.get('*', function(req, res) {
    console.log("HERE");
    res.sendFile('c:/_LA.Workstation/_LA.Workstation.Sync/build/index.html');
});

const server = app.listen(port, () => {
    console.log("LA-WS --> listening at: " + port)
    console.log("LA-WS --> Logged in as: " + CURRENTUSER + ', ' + HOST)
});