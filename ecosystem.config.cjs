// PM2 loads ecosystem files as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');
module.exports = {
  apps: [{
    name: 'critter-quest',
    cwd: path.join(__dirname, 'server'),
    script: path.join(__dirname, 'server/dist/server/src/index.js'),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 2000,
    kill_timeout: 10000,
    time: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      CLIENT_ORIGIN: 'https://critterquest.nervoussow.com',
      DATABASE_FILE: path.join(__dirname, 'server/data/games.sqlite'),
    },
  }],
};
