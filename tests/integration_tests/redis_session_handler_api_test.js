'use strict';
require('./00_init');

const RedisSessionHandlerAPI = require('../../lib/redis_session_handler_api');
const MockContextFactory = require('../../lib/mock_context_factory');

const uuidv4 = require('uuidv4').default;
const Bluebird = require('bluebird');
const co = require('co');
const _ = require('lodash');

describe('Redis Session Handler integration tests', function () {
    let rsh;

    beforeEach(() => {
        rsh = new RedisSessionHandlerAPI({ host: 'redis' });        
    });

    afterEach(() => {
        rsh._client.quit();
    })

    it('TestCase #1', async () => {
        let key = uuidv4();
        let executed = false;

        co(async () => {
            await Bluebird.delay(1000);
            await rsh.putAndWaitForRelease(key);
            executed = true;
        });

        expect(executed).to.be.false;
        await Bluebird.delay(500);
        expect(executed).to.be.false;
        await Bluebird.delay(1000);
        expect(executed).to.be.false;
        await rsh.release(key);
        await Bluebird.delay(10);
        expect(executed).to.be.true;
    });

    it('TestCase #2', async () => {
        let key = uuidv4();
        let mockContext = MockContextFactory.create('MOCK_EVENT_REPLIED', {hello:'world'}, {GROUP_ID:'test'});
        let equal = false;

        co(async () => {
            let result = await rsh.putAndWaitForRelease(key);
            equal = _.isEqual(result, mockContext.EVENT);
        });

        await Bluebird.delay(100);
        await rsh.release(key, mockContext.EVENT);
        await Bluebird.delay(10);

        expect(equal).to.be.true;
    });

    it('TestCase #3', async () => {
        let key = uuidv4();
        let mockContext = MockContextFactory.create('MOCK_EVENT_REPLIED', {hello:'world'}, {GROUP_ID:'test'});
        await rsh.release(key, mockContext.EVENT);
        let result = await rsh.putAndWaitForRelease(key);

        expect(result).to.be.deep.eq(mockContext.EVENT);
    });

});