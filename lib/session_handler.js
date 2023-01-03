'use strict'

class SessionHandler {

    constructor(sessionHandlerAPI) {
        this._sessionHandlerApi = sessionHandlerAPI;
    }

    waitForResponse(corrId) {
        return this._sessionHandlerApi.putAndWaitForRelease(corrId);
    }

    respond(corrId, replyEvent) {
        return this._sessionHandlerApi.release(corrId, replyEvent);
    }
}

module.exports = SessionHandler;