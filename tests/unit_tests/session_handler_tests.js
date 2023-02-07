'use strict';
require('./bootstrap.js');
const EventHandler = require('../../lib/event_handler');
const LocalPubSub = require('../../lib/local_pub_sub');
const LocalSessionHandlerAPI = require('../../lib/local_session_handler_api');

describe('Event handler working with Mock Session Handler API tests', function() {

    let sessionHandlerApi;
    beforeEach(() => {
        sessionHandlerApi = new LocalSessionHandlerAPI();
    });

    it('Expect one event handler to emit request and wait for another ones responds', async () => {
        let localPubSub = new LocalPubSub();
        let requester = new Requester(localPubSub, sessionHandlerApi);
        let responder = new Responder(localPubSub, sessionHandlerApi);
        let result = await requester.emitInitialEventSync('SOMETHING_HAPPENED', undefined, {GROUP_ID:'test'});
        expect(result.PAYLOAD.hello).to.be.eq('world');
    });

    class Requester extends EventHandler {

        _initEventHandlers() {
            this.registerEventHandler('SOMETHING_HAPPENED', this._doRequest.bind(this));
            this.registerResponse('DO_SOMETHING_REPLIED')
        }

        async _doRequest(ctx) {
            let respond = await ctx.emitRequest('DO_SOMETHING_REQUESTED');
            ctx.RESPONSE = respond;
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
});