# Ralphi

[![npm version](https://img.shields.io/npm/v/ralphi.svg)](https://www.npmjs.com/package/ralphi)
[![Build Status](https://travis-ci.org/yonjah/ralphi.svg?branch=master)](https://travis-ci.org/yonjah/ralphi)
[![codecov](https://codecov.io/gh/yonjah/ralphi/branch/master/graph/badge.svg)](https://codecov.io/gh/yonjah/ralphi)
[![Known Vulnerabilities](https://snyk.io/test/npm/ralphi/badge.svg)](https://snyk.io/test/npm/ralphi)
[![License](https://img.shields.io/npm/l/ralphi.svg?maxAge=2592000?style=plastic)](https://github.com/yonjah/ralphi/blob/master/LICENSE)

`Ralphi` is a simple rate limiting server intended to prevent bruteforce attacks on logins and other sensitive assets. it is very loosely base on [limitd](https://github.com/limitd/limitd) but it is much more simple.

Main difference to `limitd` -
- Memory only. no persistence.
- Simple drip only and frame interval only
- No wait, count or other advance features you can only `take` or `reset` a record
- HTTP interface

Ralphi currently has 4 independent npm modules to it
- ralphi - Simple API server for rate limiting, use to store rate limiting data
- [ralphi-client](../client/README.md) - client to easily query the server
- [hapi-ralphi](../hapi-plugin/README.md) - [hapi.js](https://hapijs.com/) plugin to easily add rate limiting to hapi
- [express-ralphi](../express-middleware/README.md) - [express.js](https://expressjs.com) middleware to easily add rate limiting to express

## Installation

```bash
$ npm install -s ralphi
$ npm install -s ralphi-client
# if you wish to use it with hapi install the hapi plugin
$ npm install -s hapi-ralphi
```

## Usage 

### Start Ralphi server
```bash
$ npx ralphi login,5,10m
```

The above command will start `Ralphi` with a single `login` bucket that allows for 5 request every 10 minutes
For more information see the [Config](#config) section or run `ralphi --help`

### Integrate rate limiting in hapi.js
<!-- eslint-disable strict,no-unused-vars,no-new-require,no-console -->

```js
const plugin = require('hapi-ralphi');
const client = new require('ralphi-client')();
const server = new require('hapi').Server();

async function init () {
    await server.register({plugin, options: {client}});
    server.route({
        method: 'POST',
        path: '/login',
        config: {
            plugins: {
                ralphi: {
                    bucket: 'login'
                }
            }
        },
        handler () {
            return 'Success';
        }
    });
}
init();
```

`login` root will be rate limited according to the bucket settings, and rate limiting headers will be sent with the response.

For more information see [hapi-ralphi](hapi-plugin/README.md) 

### Integrate rate limiting in express js
<!-- eslint-disable strict,no-unused-vars,no-new-require,no-console -->

```js
const express   = require('express');
const app       = express();
const RateLimit = require('express-ralphi');
const client    = new require('ralphi-client')();

app.use('/login', RateLimit({bucket: 'login', client}));
app.get('/login', (rec, res) => res.send('Success'));
```

`login` root will be rate limited according to the bucket settings, and rate limiting headers will be sent with the response.

For more information see [express-ralphi](express-middleware/README.md)

### Integrate rate limiting in other frameworks
<!-- eslint-disable strict,no-unused-vars,no-new-require,no-console -->

```js
const client = new require('ralphi-client')();

async function handler (req, res) { //in your handler code
    const limit = await client.take('login', req.ip);
    if (limit.conformant) {
        //allow access
        return `Request was done. You have ${limit.remaining} more requests until ${new Date(limit.ttl * 1000)}`;
    } else {
        //reject access
        throw new Error(`You have made too many requests. You can send ${limit.size} requests after ${new Date(limit.ttl * 1000)}`);
    }
}
```

For more information see [ralphi-client](client/README.md)


## Config

You can use the following command line flags to configure Ralphi -
- _-h, --host <ip> [localhost]_ - Ip address or host to listen to. by default ralphi only listen on localhost. if you have reason to listen on an external address make sure it is not publicly accessible.
- _-p, --port <n> [8910]_  - port server will listen on
- _l, --log-level <level> [info]_ - log level (debug,info,error,silent, ralphi will json logs to stdout.
- _-i, --clean-interval <n>_ - if set ralphi will try to remove expired records every X seconds.
_-c, --config <file>_ - JSON format config file to be used to load configuration (see the following section for the config file format)

Other than settings the flags Ralphi requires you to define buckets to be used for rate limiting -
```shell
$ ralphi login,10,30m token,2,1h
```
Using the above command Ralphi will start with two buckets defined
- Login bucket allowing for 10 requests ever 30 minutes
- Token bucket allowing for 2 request every hour

bucket name must be alphanumeric and ttl value can have a unit prefix (ms,s,m,h) or it will default to seconds

## Config file               
Config need to be in a json format.
```json
{
    "host": "localhost",
    "port": 8910,
    "cleanInterval": 1800,
    "buckets": {
        "login": {
            "size": 10,
            "ttl": "30m"
        }
    },
}
```

