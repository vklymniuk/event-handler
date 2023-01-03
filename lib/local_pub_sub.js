'use strict';

const EventEmitter2 = require('eventemitter2').EventEmitter2;
const MAX_LISTENERS = 100;

class LocalPubSub {

    constructor() {
        this._eventEmitter = new EventEmitter2();
        this._eventEmitter.setMaxListeners(MAX_LISTENERS);
    }

    subscribe(eventName, func) {
        if (eventName === 'ANY') {
            this._eventEmitter.onAny(async (eventName, event) => {
                return func(event);
            });
            return;
        }
        this._eventEmitter.on(eventName, func);
    }

    async publish(eventName, event) {
        return new Promise((resolve, reject) => {
            let mutableEvent = JSON.stringify(event);
            mutableEvent = JSON.parse(mutableEvent);
            this._eventEmitter.emit(eventName, mutableEvent);
            resolve();
        })
    }

    onContext(ctx) {
        return this._eventEmitter.emitAsync(ctx.EVENT.NAME, ctx);
    }
}

module.exports = LocalPubSub;