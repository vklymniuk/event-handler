'use strict'

const EventFactory = require('./event_factory');
const Context = require('./context.js');
const SessionHandler = require('./session_handler');
const LocalSessionHandlerAPI = require('./local_session_handler_api');

class MockContextFactory {

    static create(eventName, payload, precedingEventContext) {
        let localSessionHandlerAPI = new LocalSessionHandlerAPI();
        let sessionHandler = new SessionHandler(localSessionHandlerAPI);
        let eventFactory = new EventFactory();
        let event = eventFactory.create(eventName, payload, precedingEventContext || this.EVENT);
        let ctx = new Context(event, this, sessionHandler);
        ctx.emitEvent = this.create;

        return ctx;
    }
}

module.exports = MockContextFactory;