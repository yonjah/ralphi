# hapi-ralphi
hapi plugin for ralphi pure Node.js rate limiting server

[![npm version](https://img.shields.io/npm/v/hapi-ralphi.svg)](https://www.npmjs.com/package/hapi-ralphi)
[![Build Status](https://travis-ci.org/yonjah/ralphi.svg?branch=master)](https://travis-ci.org/yonjah/ralphi)
[![codecov](https://codecov.io/gh/yonjah/ralphi/branch/master/graph/badge.svg)](https://codecov.io/gh/yonjah/ralphi)
[![Known Vulnerabilities](https://snyk.io/test/npm/hapi-ralphi/badge.svg)](https://snyk.io/test/npm/hapi-ralphi)
[![License](https://img.shields.io/npm/l/ralphi.svg?maxAge=2592000?style=plastic)](https://github.com/yonjah/ralphi/blob/master/LICENSE)

`Ralphi` is a simple rate limiting server intended to prevent bruteforce attacks on logins and other sensitive assets.

For more info about Ralphi other components see [ralphi](https://ralphi.js.org/)

## Plugin Installation

```bash
$ npm install -s ralphi-client
$ npm install -s hapi-ralphi
```

## Usage 

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

## Configuration Options
- _client RalphiClient_ **required** - Ralphi client, used to query Ralphi server.
- _ext String default(onPreHandler)_ - request flow hook when plugin should check rate limiting can be one of ('onPreAuth', 'onPostAuth', 'onPreHandler')
- _allRoutes Boolean default(false)_ - if true rate limiting will be enabled by default on all routes
- _bucket String_ - bucket to use for rate limiting (**required** when _allRoutes_ is true)
- _countSuccess Boolean default(true)_ - if true request are counted even if they are successful, when set to false only request that result in an error will be counted toward rate limiting.
- _getKey Function(request)_ - A Function that will get the unique client key out of the request object. By default `request.info.remoteAddress` is used.
- _addHeaders Boolean default(true)_ - Add the headers 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset' for routes that enable rate liming
- _headerLimit String default('X-RateLimit-Limit')_ - name of the header that indicates the request quota
- _headerRemaining String default('X-RateLimit-Remaining')_ - name of the header that indicates the remaining request quota
- _headerReset String default('X-RateLimit-Reset')_ - name of the header that indicates how long until the request quota is reset
- _ttlTransform Function(ttl)_ - A Function that allows transformation of the _ttl_ passed down from the Ralphi server.
- _message String default('you have exceeded your request limit')_ - Error message in case limit has exceeded
- _onError Function(request, reply, Error) default(undefined)_ - if communication with Ralphi server results in an error, plugin will call this method and stop processing the request. By default request will be rate limited using _errorSize_ and _errorDelay_ settings
_errorSize Integer default(1)_ - default record size if Ralphi server is not available
_errorDelay Integer default(60)_ - default delay in seconds to send to the user if Ralphi server is not available

All configuration options other than _client_,_ext_,_allRoutes_ can be overridden in the route settings. When _allRoutes_ is `false`(default), you'll need to set a config object in `config.plugins.ralphi` to enable the route. If _allRoutes_ is  `true` you can disable a specific route by setting `config.plugins.ralphi` to `false`.
