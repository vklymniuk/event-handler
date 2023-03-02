'use strict';

const merge = require('merge');
const uuidv4 = require('uuidv4').default;

class Context {

    constructor(event, contextFactory, sessionHandler) {
        this.EVENT = event;
        this.RESPONSE = {}
        this.CORR_ID = event.CORR_ID;
        this._contextFactory = contextFactory;
        this._sessionHandler = sessionHandler;
    }

    emitEvent(eventName, payload, newContext) {
        return this._contextFactory.create(
            eventName, 
            payload, 
            this._mergeContexts(newContext)
        );
    }

    async emitRequest(eventName, payload) {
        let correlationId = uuidv4();
        let resolves = await Promise.all(
            [
                this._sessionHandler.waitForResponse(correlationId),
                this._contextFactory.create(
                    eventName, 
                    payload, 
                    this._mergeContexts({CORR_ID: correlationId}),
                ),
            ]
        );
        let replyEvent = resolves[0];

        return replyEvent;
    }

    _mergeContexts(contextOverride) {
        return merge(
            contextOverride, 
            this.EVENT,
        );
    }
}

module.exports = Context;