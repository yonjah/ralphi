module.exports = Object.assign({}, require('../.eslintrc.js'),{
    globals: {
        describe: true,
        it: true,
        before: true ,
        beforeEach: true,
        after: true,
        afterEach: true
    }
});