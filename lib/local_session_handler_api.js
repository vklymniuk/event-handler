'use strict';

class LocalSessionHandlerAPI {

    constructor() {
        this._locks = {};
    }

    putAndWaitForRelease(key) {
        return new Promise((resolve, reject) => {
            this._locks[key] = resolve;
        });
    }

    release(key, object) {
        let resolve = this._locks[key];
        resolve(object);
    }
}

module.exports = LocalSessionHandlerAPI;