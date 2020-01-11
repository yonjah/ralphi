# Express-ralphi
Express middleware for ralphi pure Node.js rate limiting server

[![npm version](https://img.shields.io/npm/v/express-ralphi.svg)](https://www.npmjs.com/package/express-ralphi)
[![Build Status](https://travis-ci.org/yonjah/ralphi.svg?branch=master)](https://travis-ci.org/yonjah/ralphi)
[![codecov](https://codecov.io/gh/yonjah/ralphi/branch/master/graph/badge.svg)](https://codecov.io/gh/yonjah/ralphi)
[![Known Vulnerabilities](https://snyk.io/test/npm/express-ralphi/badge.svg)](https://snyk.io/test/npm/express-ralphi)
[![License](https://img.shields.io/npm/l/ralphi.svg?maxAge=2592000?style=plastic)](https://github.com/yonjah/ralphi/blob/master/LICENSE)

`Ralphi` is a simple rate limiting server intended to prevent bruteforce attacks on logins and other sensitive assets.

For more info about Ralphi other components see [ralphi](https://ralphi.js.org/)

## Plugin Installation

```bash
$ npm install -s ralphi-client
$ npm install -s express-ralphi
```

## Usage 

### Integrate rate limiting in express
<!-- eslint-disable strict,no-unused-vars,no-new-require -->

```js
const express   = require('express');
const app       = express();
const RateLimit = require('express-ralphi');
const client    = new require('ralphi-client')();

app.use('/login', RateLimit({bucket: 'login', client}));
app.get('/login', (rec, res) => res.send('Success'));
```

`login` root will be rate limited according to the bucket settings, and rate limiting headers will be sent with the response.

## Configuration Options
- _client RalphiClient_ **required** - Ralphi client, used to query Ralphi server.
- _bucket String_ **required** - bucket to use for rate limiting (**required** when _allRoutes_ is true)
- _countSuccess Boolean default(true)_ - if true request are counted even if they are successful, when set to false only request that result in an error will be counted toward rate limiting.
- _getKey Function(request)_ - A Function that will get the unique client key out of the request object. By default `request.info.remoteAddress` is used.
- _addHeaders Boolean default(true)_ - Add the headers 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset' for routes that enable rate liming
- _headerLimit String default('X-RateLimit-Limit')_ - name of the header that indicates the request quota
- _headerRemaining String default('X-RateLimit-Remaining')_ - name of the header that indicates the remaining request quota
- _headerReset String default('X-RateLimit-Reset')_ - name of the header that indicates how long until the request quota is reset
- _ttlTransform Function(ttl)_ - A Function that allows transformation of the _ttl_ passed down from the Ralphi server.
- _message String default('you have exceeded your request limit')_ - Error message in case limit has exceeded
- _onError Function(error, rec, res, next) default(undefined)_ - if communication with Ralphi server results in an error, middleware will call this method and stop processing the request. By default request will be rate limited using _errorSize_ and _errorDelay_ settings
_errorSize Integer default(1)_ - default record size if Ralphi server is not available
_errorDelay Integer default(60)_ - default delay in seconds to send to the user if Ralphi server is not available
- _errorLog Function(error) default(undefined)_ - if communication with Ralphi server results in an error, error will be passed to this method for logging. unlike `onError` the middleware will keep processing the request

For convince each configuration option has a method that will create a new instance extending the exiting configuration. so it is easy to have specific route configuration -
<!-- eslint-disable strict,no-unused-vars,no-new-require,no-console -->

```js
const express   = require('express');
const app       = express();
const RateLimit = require('express-ralphi');
const client    = new require('ralphi-client')();

const baseRateLimit = RateLimit({bucket: 'login', client, errorLog: e => console.log(e)});

app.use('/login', baseRateLimit);
app.get('/login', (rec, res) => res.send('Success'));

app.use('/recover', baseRateLimit.bucket('recover'));
app.get('/recover', (rec, res) => res.send('Success'));

app.use('/api', baseRateLimit.onError((e, req, res, next) => next()).bucket('api'));
app.get('/api', (rec, res) => res.send('Success'));
```

