'use strict'

const Bluebird = require('bluebird');
const redis = require('redis');
const LOCK_TIMEOUT_SECONDS = 5;

// Bluebird.promisifyAll(redis._client.prototype);

class RedisSessionHandlerAPI {

    constructor(clientOptions) {
        this._clientOptions = clientOptions;
        this._client = redis.createClient(this._clientOptions);
    }

    _getClient() {
        return this._client.duplicate();
    }

    async putAndWaitForRelease(key) {
        let longPollClient = this._getClient();
        let result = await longPollClient.brpopAsync(key, LOCK_TIMEOUT_SECONDS);
        longPollClient.quit();

        return JSON.parse(result[1]);
    }

    release(key, object) {
        if (!object) {
            object = {};
        }

        return this._client.lpushAsync(key, JSON.stringify(object));
    }
}

module.exports = RedisSessionHandlerAPI;