'use strict';
require('./00_init');

const RedisSessionHandlerAPI = require('../../lib/redis_session_handler_api');
const EventHandler = require('../../lib/event_handler');
const LocalPubSub = require('../../lib/local_pub_sub');

class Requester extends EventHandler {

    _initEventHandlers() {
        this.registerEventHandler('SOMETHING_HAPPENED', this._doRequest.bind(this));
        this.registerResponse('DO_SOMETHING_REPLIED')
    }

    async _doRequest(ctx) {
        let response = await ctx.emitRequest('DO_SOMETHING_REQUESTED');
        ctx.RESPONSE = response;
    }
}

class Responder extends EventHandler {

    _initEventHandlers() {
        this.registerEventHandler('DO_SOMETHING_REQUESTED', this._doRespond.bind(this));
    }

    _doRespond(ctx) {
        return ctx.emitEvent('DO_SOMETHING_REPLIED', {hello:'world'});
    }
}

describe('Event handler working with Redis Session Handler tests', function() {
    let rshApi;

    beforeEach(() => {
        rshApi = new RedisSessionHandlerAPI({
            host: 'redis'
        });
    });

    afterEach(() => {
        rshApi._client.quit();
    });

    it('TestCase #1', async () => {
        let localPubSub = new LocalPubSub();
        let requester = new Requester(localPubSub, rshApi);
        let responder = new Responder(localPubSub, rshApi);
        let result = await requester.emitInitialEventSync('SOMETHING_HAPPENED', undefined, {GROUP_ID:'test'});

        expect(result.PAYLOAD.hello).to.be.eq('world');
    });
});