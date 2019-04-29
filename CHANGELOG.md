## <small>3.1.4 (2019-04-29)</small>

* fix: logging to properly log request ([ce2870d](https://github.com/yonjah/ralphi/commit/ce2870d))
* chore(package): update supertest to version 4.0.2, mocha to version 6.1.4, move conventional-changel ([1f0f195](https://github.com/yonjah/ralphi/commit/1f0f195))
* Update lolex to the latest version 🚀 (#22) ([e1c4f89](https://github.com/yonjah/ralphi/commit/e1c4f89)), closes [#22](https://github.com/yonjah/ralphi/issues/22)
* Update nyc to the latest version 🚀 (#21) ([9bd6360](https://github.com/yonjah/ralphi/commit/9bd6360)), closes [#21](https://github.com/yonjah/ralphi/issues/21)



<a name="3.1.3"></a>
## [3.1.3](https://github.com/yonjah/ralphi/compare/v3.1.2...v3.1.3) (2019-02-08)

### Chores

* Added npm update script ([d10fc0b](https://github.com/yonjah/ralphi/commit/d10fc0b))
* Dependency upgrade ([359ad11](https://github.com/yonjah/ralphi/commit/359ad11))



<a name="3.1.2"></a>
## [3.1.2](https://github.com/yonjah/ralphi/compare/v3.1.1...v3.1.2) (2018-12-04)


### Bug Fixes

* use original logger object instead of cloned joi result ([5ad0977](https://github.com/yonjah/ralphi/commit/5ad0977))



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



