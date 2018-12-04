<a name="3.1.2"></a>
## [3.1.2](https://github.com/yonjah/ralphi/compare/v3.1.1...v3.1.2) (2018-12-04)


### Bug Fixes

* use original loger object instead of cloned joi result ([5ad0977](https://github.com/yonjah/ralphi/commit/5ad0977))



<a name="3.1.0"></a>
# [3.1.0](https://github.com/yonjah/ralphi/compare/v3.0.1...v3.1.0) (2018-09-25)


### Features

* added keepAlive setting for client connection ([bf27158](https://github.com/yonjah/ralphi/commit/bf27158))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/yonjah/ralphi/compare/v2.1.0...v3.0.0) (2018-06-13)


### Features

* api take now accept count integer -1,1 to allow giving back a token, client implement give method ([b7195c9](https://github.com/yonjah/ralphi/commit/b7195c9))
* express middleware ([41e7096](https://github.com/yonjah/ralphi/commit/41e7096))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/yonjah/ralphi/compare/v2.0.2...v2.1.0) (2018-05-07)


### Features

* **client:** timeout request ([692782f](https://github.com/yonjah/ralphi/commit/692782f))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/yonjah/ralphi/compare/v1.0.0...v2.0.0) (2018-04-04)


### Code Refactoring

* **hapi-plugin:** remove hapi v16 suppport ([dfa342a](https://github.com/yonjah/ralphi/commit/dfa342a))


### Features

* Query, allow checking limit stats without removing a token ([6aec760](https://github.com/yonjah/ralphi/commit/6aec760))
* **hapi-plugin:** Allow to only take a token if request is rejected countSuccess=false ([100537f](https://github.com/yonjah/ralphi/commit/100537f))


### improve

* **server:** Upgrade server to run on hapi v17 ([2f9a2f6](https://github.com/yonjah/ralphi/commit/2f9a2f6))


### BREAKING CHANGES

* **server:** hapi 17
* **hapi-plugin:** Only support hapi v17 and up



