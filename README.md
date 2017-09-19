# Ralphi

[![npm version](https://img.shields.io/npm/v/ralphi.svg)](https://www.npmjs.com/package/ralphi)
[![Build Status](https://travis-ci.org/yonjah/ralphi.svg?branch=master)](https://travis-ci.org/yonjah/ralphi)
[![codecov](https://codecov.io/gh/yonjah/ralphi/branch/master/graph/badge.svg)](https://codecov.io/gh/yonjah/ralphi)
[![License](https://img.shields.io/npm/l/ralphi.svg?maxAge=2592000?style=plastic)](https://github.com/yonjah/ralphi/blob/master/LICENSE)

`Ralphi` is a simple rate limiting server intended to prevent bruteforce attacks on logins and other sensitive assets. it is very loosely base on [limitd](https://github.com/limitd/limitd) but it is much more simple.

Main difference to `limitd` -
- Memory only. no persistence.
- Simple drip only and frame interval only
- No wait, count or other advance features you can only `take` or `reset` a record
- HTTP interface

Ralphi currently has 3 independent npm modules to it 
- [ralphi](https://github.com/yonjah/ralphi/blob/master/server/README.md) - Simple API server for rate limiting, use to store rate limiting data
- [ralphi-client](https://github.com/yonjah/ralphi/blob/master/client/README.md) - client to easily query the server
- [hapi-ralphi](https://github.com/yonjah/ralphi/blob/master/hapi-plugin/README.md) - [hapi.js](https://github.com/hapi/hapi) plugin to easily add rate limiting to hapi 

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
For more information see [Ralphi server](https://github.com/yonjah/ralphi/blob/master/server/README.md) or run `ralphi --help`

### Integrate rate limiting in hapi.js
```js
const plugin = require('hapi-ralphi');
const client = new require('ralphi-client')();
const server = new require('hapi').Server();

server.register({plugin, options: {client}})
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
        handler (request, reply) {
            reply(null, 'Success');
        }
    })
```

`login` root will be rate limited according to the bucket settings, and rate limiting headers will be sent with the response.

For more information see [hapi-ralphi](https://github.com/yonjah/ralphi/blob/master/hapi-plugin/README.md) 

### Integrate rate limiting in other frameworks
```js
const client = new require('ralphi-client')();
...
//in your handler code
client.take('login', ip)
    .then(limit => {
        if (limit.conformant) {
            //allow access
            return `Request was done. You have ${limit.remaining} more requests until ${new Date(limit.ttl * 1000)}`
        } else {
            //reject access
            throw new Error(`You have made too many requests. You can send ${limit.size} requests after ${new Date(limit.ttl * 1000)}`)
        }
    }, e => {
        //handle error if Ralphi server is unavailable 
    });
```

For more information see [ralphi-client](https://github.com/yonjah/ralphi/blob/master/client/README.md) 
