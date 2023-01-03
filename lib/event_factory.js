'use strict';

const _ = require('lodash');
const deepFreeze = require('deep-freeze');
const serializeError = require('serialize-error');
const randomUuidV4 = require('uuidv4').default;
const uuidv5 = require('uuidv5');
const merge = require('merge');
const VError = require('verror');
const stackTraceParser = require('stacktrace-parser');

class EventFactory {

    constructor(eventContextConsts) {
        this._init(eventContextConsts);
    }

    _init(eventContextConsts) {
        this._EVENT_VERSION = require('../package.json').eventVersion;
        this._initEventContextConsts(eventContextConsts);
    }

    _initEventContextConsts(consts) {
        if (consts === undefined) {
            return;
        }

        this._APP_NAME = consts.APP_NAME;
        this._OS = consts.OS;
        this._OS_VERSION = consts.OS_VERSION;
        this._APP_VERSION = consts.APP_VERSION;
    }

    create(eventName, payload, precedingEventContext) {
        this._validateEventContextIds(precedingEventContext);
        let eventGenerationTimestamp = Date.now();
        let eventData = {
            NAME: eventName,
            VERSION: this._EVENT_VERSION,
            IS_TRIGGER: this._isTrigger(precedingEventContext) ? true : undefined,
            TIMESTAMP: eventGenerationTimestamp,
            HAS_ALERT: this._whichAlert(eventName),
            PAYLOAD: this._parsePayload(payload),
        };
        let eventContext = this._createEventContext(precedingEventContext);
        let newEventId = this._generateEventId(eventData, eventContext, precedingEventContext);
        eventData.ID = newEventId;

        if (eventContext.INITIAL_EVENT_ID === undefined) {
            eventContext.INITIAL_EVENT_ID = newEventId;
        }

        return this.toImmutable(this._clearIrrelevantFields(merge(eventData, eventContext)));
    }

    _validateEventContextIds(eventContext) {

        if (eventContext === undefined) {
            throw new VError('No event context provided');
        }

        if (eventContext.USER_ID === undefined &&
            eventContext.DEVICE_ID === undefined &&
            eventContext.GROUP_ID === undefined) {

            throw new VError("No event context IDs provided, can not create a new event")
        }
    }

    _createEventContext(precedingEventContext) {

        return merge({
            USER_ID: precedingEventContext.USER_ID,
            DEVICE_ID: precedingEventContext.DEVICE_ID,
            GROUP_ID: precedingEventContext.GROUP_ID,
            INITIAL_EVENT_ID: precedingEventContext.INITIAL_EVENT_ID,
            CORR_ID: precedingEventContext.CORR_ID
        }, {
            SOURCE_TYPE: this._getEventSourceType(),
            SOURCE_VERSION: this._getEventSourceVersion(),
            OS: this._getEventOS(),
            OS_VERSION: this._getEventOSVersion()
        })
    }

    toImmutable(object) {
        return deepFreeze(object);
    }

    _parsePayload(payload) {
        if (this._isObjectError(payload)) {
            payload = this._serializeError(payload);
            payload.stack = stackTraceParser.parse(payload.stack);

            return payload;
        }

        return this._serializeErrorNodes(payload);
    }

    _isObjectError(object) {
        return (object instanceof Error);
    }

    _serializeError(error) {
        return serializeError(error);
    }

    _serializeErrorNodes(payload) {
        let errorKeyName = this._discoverErrorNodes(payload);

        if (!errorKeyName) {
            return payload;
        }

        return payload;
    }

    _discoverErrorNodes(payload) {
        let errorKeyNames = ['error', 'e', 'err'];

        for (let errorKeyName of errorKeyNames) {
            if (_.has(payload, errorKeyName)) {

                return errorKeyName;
            }
        }

        return undefined;
    }

    _generateEventId(eventData, eventContext, precedingEventContext) {
        if (eventContext.INITIAL_EVENT_ID === undefined) {
            return randomUuidV4();
        }

        
        let namespace = precedingEventContext.ID;
        
        if (namespace === undefined) {
            namespace = eventContext.INITIAL_EVENT_ID;
        }

        let name = JSON.stringify(eventContext) + JSON.stringify({ NAME: eventData.NAME, PAYLOAD: eventData.PAYLOAD});

        return uuidv5(namespace, name);
    }

    toString(...args) {
        let concat = '';

        for (let arg of args) {
            concat += arg.toString();
        }

        return concat;
    }

    _whichAlert(eventName) {

        if (this._isErrorEvent(eventName)) {
            return 'ERR';
        }

        if (this._isWarningEvent(eventName)) {
            return 'WARN';
        }

        return null;
    }

    _isErrorEvent(eventName) {
        return _.startsWith(eventName, 'ERR');
    }

    _isWarningEvent(eventName) {
        return _.startsWith(eventName, 'WARN');
    }

    _clearIrrelevantFields(event) {
        return _.pickBy(event, _.identity);
    }

    _isTrigger(event) {
        return event === undefined || event.NAME === undefined
    }

    _getEventSourceType() {
        return this._APP_NAME;
    }

    _getEventSourceVersion() {
        return this._APP_VERSION || '-1';
    }

    _getEventOS() {
        return this._OS;
    }

    _getEventOSVersion() {
        return this._OS_VERSION;
    }
}

module.exports = EventFactory;