module.exports = {
  apps : [{
    name   : "_LA.Workstation.Sync",
    script : "index.js",
    autorestart: true,
    watch: true,
    exec_mode: "cluster",
    instances: 1
  }]
}
