'use strict';

const ContextFactory = require('../lib/context_factory.js');
const EventFactory = require('./event_factory.js');
const SessionHandler = require('./session_handler');

const OS = require('os');
const Context = require('./context');
const _ = require('lodash');
const serializeError = require('serialize-error');
const VError = require('verror');

const ERROR_UNHANDLED_EVENT_NAME = 'ERR_UNHANDLED';
const ERROR_FAILED_CONTEXT_PARSING_EVENT_NAME = 'ERROR_FAILED_CONTEXT_PARSING'
const EVENT_HANDLING_FUNCTION_ERROR_NAME = 'EventHandlingFunctionError'
const CONTEXT_PARSING_ERROR_NAME = 'ContextParsingError';
const ERROR_EVENT_CONTEXT = { GROUP_ID:'ERR' };

class EventHandler {
    constructor(iPubSub, iSessionHandlerAPI, optionalLogger) {
        this._log = optionalLogger || this.getNoLogger();
        this._iPubSub = iPubSub;
        this._sessionHandler = new SessionHandler(iSessionHandlerAPI);
        this._contextFactory = new ContextFactory(
            new EventFactory(this._getEventContextConsts()),
            this._iPubSub,
            this._sessionHandler
        );
        this._initDefaultEventHandlers();
        this._initEventHandlers();
    }

    _initDefaultEventHandlers() {
        this.registerEventHandler('HEALTH_CHECK', this._healthCheck.bind(this));
    }

    _healthCheck() {
        return true;
    }

    _initEventHandlers() {
        return;
    }

    _getEventContextConsts() {
        return {
            APP_NAME: this.constructor.name,
            APP_VERSION: global.APP_VERSION || require('../package.json').version,
            OS: OS.platform(),
            OS_VER: OS.release(),
        }
    }

    getNoLogger() {
        return {
            verbose: function() {
                return;
            },
            error: function() {
                return;
            },
            info: function() {
                return;
            },
            warn: function() {
                return;
            }
        }
    }

    registerEventHandler(eventName, ctxHandlingFunction) {
        let eventHandlingWrapper = async (incoming) => {
            let ctx;

            try {
                ctx = this._makeContext(incoming);
                let className = this.constructor.name;
                let functionName = ctxHandlingFunction.name;
                this._verboseExecucting(eventName, className, functionName, ctx.EVENT.PAYLOAD);
                let result = await ctxHandlingFunction(ctx);
                this._verboseExited(eventName, className, functionName);

                return result;
            } catch (e) {
                this._logError(e);

                if (e.name === CONTEXT_PARSING_ERROR_NAME) {
                    return this._contextFactory.create(ERROR_FAILED_CONTEXT_PARSING_EVENT_NAME, e, ERROR_EVENT_CONTEXT);
                }

                await ctx.emitEvent(ERROR_UNHANDLED_EVENT_NAME, e);
                this._throwWhenContext(incoming, e);
            }
        }
        this._iPubSub.subscribe(eventName, eventHandlingWrapper);
    }

    registerResponse(eventReplyName) {
        this.registerEventHandler(eventReplyName, this._responseRelease.bind(this));
    }

    _responseRelease(ctx) {
        return this._sessionHandler.respond(ctx.CORR_ID, ctx.EVENT);
    }

    _throwWhenContext(incoming, e) {
        if(incoming instanceof Context) {
            throw new VError({
                name: EVENT_HANDLING_FUNCTION_ERROR_NAME,
                cause: e,
            });
        }
    }

    _makeContext(incoming) {
        let ctx;

        if(incoming instanceof Context) {
            ctx = incoming;
        }
        else {
            ctx = this._contextFactory.from(incoming);
        }

        return ctx;
    }

    _verboseExecuting(eventName, className, functionName, payload) {
        let date = new Date();
        this._log.verbose(`${date.toString()} Event ${eventName} caught :: with paylod ${payload} :: Executing ${className} :: ${functionName}`);
    }

    _verboseExited(eventName, className, functionName) {
        let date = new Date();
        this._log.verbose(`${date.toString()} Exited ${className} :: ${functionName} :: for ${eventName}`);
    }

    _logError(e) {
        this._log.error(e);
    }

    async emitInitialEventSync(eventName, payload, precedingEventContext) {
        let ctx;
        try {

            ctx = await this._contextFactory.create(eventName, payload, precedingEventContext);
            await this._iPubSub.onContext(ctx);

            if (!_.isEmpty(ctx.RESPONSE)) {

                if (ctx.RESPONSE.body) {
                    ctx.RESPONSE.body = JSON.stringify(ctx.RESPONSE.body);
                }

                return ctx.RESPONSE;
            }

            return ctx;
        }
        catch(e) {
            if (e.name === CONTEXT_PARSING_ERROR_NAME) {
                return this._handleContextParsingError(e);
            }

            return {
                statusCode: 500,
                body: JSON.stringify(serializeError(e)),
            }
        }
    }

    async _handleContextParsingError(e) {
        await this._contextFactory.create(ERROR_FAILED_CONTEXT_PARSING_EVENT_NAME, e, ERROR_EVENT_CONTEXT);

        return {
            statusCode: 500,
            body: JSON.stringify(e),
        }
    }
}

module.exports = EventHandler;