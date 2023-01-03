'use strict';

const Context = require('./context.js');
const VError = require('verror');

class ContextFactory {
    constructor(eventFactory, iPubSub, sessionHandler) {
        this._eventFactory = eventFactory;
        this._sessionHandler = sessionHandler;
        this._iPubSub = iPubSub;
    }

    async create(eventName, payload, precedingEventContext) {
        try {

            let event = this._eventFactory.create(eventName, payload, precedingEventContext);
            let ctx = new Context(event, this, this._sessionHandler);
            await this._iPubSub.publish(eventName, event);

            return ctx;
        }
        catch(e) {
            throw new VError({
                name: 'ContextParsingError',
                cause: e,
            });
        }
    }

    from(event) {
        event = this._eventFactory.toImmutable(event);

        return new Context(event, this, this._sessionHandler);
    }
}

module.exports = ContextFactory;