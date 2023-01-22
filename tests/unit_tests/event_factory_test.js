'use strict';
require('./00_init.js');
const sinon = global.sinon;
const _ = require('lodash');
const expect = global.expect;
const EventFactory = require('../../lib/event_factory.js');
const faker = require('faker');
const uuidv4 = require('uuidv4').default;
const uuidv5 = require('uuidv5');

describe('Event creation tests', function() {

    let eventFactory;
    let _whichAlertSpy;
    let _clearIrrelevantFieldsSpy;

    let mockEventType = 'MOCK_EVENT';
    let mockPayload = {
        A: 'a',
        B: 'b'
    };

    let mockPreviousEvent = {
        NAME: 'MOCK_EVENT_1',
        ID: uuidv4(),
        INITIAL_EVENT_ID: uuidv4(),
        TIMESTAMP: Date.now() - 1000,
        payload: {
            K: 'k',
            J: 'j'
        },
        GROUP_ID: 'NO_ID'
    };

    let mockHouseholdId = 'K';
    let mockDeviceId = 'J';
    let constObject = {
        OS: 'A',
        OS_VERSION: '18.04',
        APP_NAME: 'BL',
        APP_VERSION: '0.0.2'
    }

    beforeEach(() => {
        eventFactory = new EventFactory(constObject);
        _whichAlertSpy = sinon.spy(eventFactory, '_whichAlert');
        _clearIrrelevantFieldsSpy = sinon.spy(eventFactory, '_clearIrrelevantFields');
        sinon.spy(eventFactory, '_isTrigger');
        sinon.spy(eventFactory, '_getEventSourceType');
        sinon.spy(eventFactory, '_getEventSourceVersion');
        sinon.spy(eventFactory, '_getEventOS');
        sinon.spy(eventFactory, '_getEventOSVersion');
    });

    it('Event version is expected to be 1.0', () => {
        let externalEvent = eventFactory.create(mockEventType, mockPayload, { GROUP_ID: 'NO_ID'});
        expect(externalEvent.VERSION).to.be.eq('1.0');
    });

    it('Clear irrelevant fields test', () => {
        let valueOnlyFields = eventFactory._clearIrrelevantFields({
            a: null,
            b: undefined,
            c: 'value',
            d: false
        });
        expect(_.has(valueOnlyFields, 'a')).to.be.false;
        expect(_.has(valueOnlyFields, 'b')).to.be.false;
        expect(_.has(valueOnlyFields, 'c')).to.be.true;
        expect(valueOnlyFields.c).to.be.eq('value');
        expect(_.has(valueOnlyFields, 'd')).to.be.false;
    });

    it('Event immutability test', () => {
        let externalEvent = eventFactory.create(mockEventType, mockPayload, { GROUP_ID: 'NO_ID'});
        expectChangersToThrow(externalEvent);
    });

    it('create new event test', () => {
        let mockEventContext = { GROUP_ID: 'NO_ID'};
        let externalEvent = eventFactory.create(mockEventType, mockPayload, mockEventContext);
        expect(externalEvent.INITIAL_EVENT_ID).to.be.eq(externalEvent.ID);
        expectCommonFields(externalEvent);
        expectIsErrorWarnFields(externalEvent);
        expectAdditionalExternalEventFields(externalEvent);
    });

    it('create based on preceding event test', () => {
        let externalEvent = eventFactory.create(mockEventType, mockPayload, mockPreviousEvent);
        expect(externalEvent.INITIAL_EVENT_ID).to.be.not.eq(externalEvent.ID);
        expect(externalEvent.INITIAL_EVENT_ID).to.be.eq(mockPreviousEvent.INITIAL_EVENT_ID);

        expectCommonFields(externalEvent, mockPreviousEvent);
        expectIsErrorWarnFields(externalEvent);
        expectAdditionalExternalEventFields(externalEvent, mockPreviousEvent);
    });

    it('Sequential created events same root id test', () => {
        let firstInternalClientEvent = eventFactory.create('FIRST_EVENT', undefined, { GROUP_ID: 'NO_ID'});
        let precedingEvent = firstInternalClientEvent;
        for (var i = 0; i < 10; i++) {
            let eventName = 'EVENT_' + i.toString();
            let anotherInternalClientEvent = eventFactory.create(eventName, undefined, precedingEvent);
            expect(anotherInternalClientEvent.INITIAL_EVENT_ID).to.be.eq(firstInternalClientEvent.ID);
            precedingEvent = anotherInternalClientEvent;
        }
    });

    it('_validateEventContextIds expected to throw on undefined', () => {
        expect(eventFactory._validateEventContextIds).to.throw();
    });

    it('_validateEventContextIds expected to throw when no IDs are passed', () => {
        expect(() => eventFactory._validateEventContextIds({})).to.throw();
    });

    it('_createEventContext is expected to merge given IDs with OS properties', () => {
        let mockEventContext = {
            USER_ID: 'USER_ID',
            DEVICE_ID: 'DEVICE_ID',
            GROUP_ID: 'GROUP_ID',
            INITIAL_EVENT_ID: 'INITIAL_EVENT_ID'
        }
        let event = eventFactory._createEventContext(mockEventContext);
        expect(event.USER_ID).to.be.eq('USER_ID');
        expect(event.DEVICE_ID).to.be.eq('DEVICE_ID');
        expect(event.GROUP_ID).to.be.eq('GROUP_ID');
        expect(event.INITIAL_EVENT_ID).to.be.eq('INITIAL_EVENT_ID');
        expect(event.SOURCE_TYPE).to.be.eq(constObject.APP_NAME);
        expect(event.SOURCE_VERSION).to.be.eq(constObject.APP_VERSION);
        expect(event.OS).to.be.eq(constObject.OS);
        expect(event.OS_VERSION).to.be.eq(constObject.OS_VERSION);
    });

    it('Creating a new event from a new event context is expected to have given IDs', () => {
        let mockEventContext = {
            USER_ID: 'USER_ID',
            DEVICE_ID: 'DEVICE_ID',
            GROUP_ID: 'GROUP_ID',
        }
        sinon.spy(eventFactory,'_createEventContext');
        let event = eventFactory.create('MOCK_EVENT', undefined, mockEventContext);
        expect(eventFactory._createEventContext.calledWith(mockEventContext)).to.be.true;
        expect(event.USER_ID).to.be.eq('USER_ID');
        expect(event.DEVICE_ID).to.be.eq('DEVICE_ID');
        expect(event.GROUP_ID).to.be.eq('GROUP_ID');
        expect(event.INITIAL_EVENT_ID).to.be.eq(event.ID);
    });

    function expectCommonFields(generatedEvent, precedingEvent) {
        expect(generatedEvent.NAME).to.be.eq(mockEventType);
        expect(generatedEvent.PAYLOAD).to.be.deep.eq(mockPayload);
        expect(generatedEvent.ID).to.be.not.undefined;
        let eventTimestamp = generatedEvent.TIMESTAMP;
        expect(Number.isInteger(eventTimestamp)).to.be.true;
        expect(_clearIrrelevantFieldsSpy.calledOnce).to.be.true;
    }

    function expectIsErrorWarnFields(generatedEvent) {
        expect(_whichAlertSpy.calledOnce).to.be.true;
        expect(_whichAlertSpy.calledWith(generatedEvent.NAME)).to.be.true;
    }

    function expectAdditionalExternalEventFields(generatedEvent, mockPreviousEvent) {
        expect(eventFactory._isTrigger.calledOnce).to.be.true;
        // expected to be undefined because all irrelevant values are cleared.
        if (mockPreviousEvent === undefined) {
            expect(generatedEvent.IS_TRIGGER).to.be.true;
        } else {
            expect(generatedEvent.IS_TRIGGER).to.be.undefined;
            expect(eventFactory._isTrigger.calledWith(mockPreviousEvent)).to.be.true;
        }

        expect(generatedEvent.VERSION).to.be.eq(eventFactory._EVENT_VERSION);

        expect(eventFactory._getEventSourceType.calledOnce).to.be.true;
        expect(generatedEvent.SOURCE_TYPE).to.be.not.undefined;

        expect(eventFactory._getEventSourceVersion.calledOnce).to.be.true;
        expect(generatedEvent.SOURCE_VERSION).to.be.not.undefined;

        expect(eventFactory._getEventOS.calledOnce).to.be.true;
        expect(generatedEvent.OS).to.be.not.undefined;

        expect(eventFactory._getEventOSVersion.calledOnce).to.be.true;
        expect(generatedEvent.OS_VERSION).to.be.not.undefined;
    }

    function expectChangersToThrow(generatedImmutableEvent) {
        let fakeEventId = 'hey';
        let fakePayloadValue = 'ho';
        let mockChanger = function() {
            generatedImmutableEvent.EVENT_ID = fakeEventId;
        };
        let mockPayloadChanger = function() {
            generatedImmutableEvent.PAYLOAD.A = fakePayloadValue;
        };
        try {
            mockChanger();
            throw new Error('Expected mockChanger to fail!');
        } catch (e) {
            if (e.name != 'TypeError') {
                throw new Error('Expected mockChanger to fail!');
            }
        }

        try {
            mockPayloadChanger();
            throw new Error('Expected mockPayloadChanger to fail!');
        } catch (e) {
            if (e.name != 'TypeError') {
                throw new Error('Expected mockPayloadChanger to fail!');
            }
        }
        expect(generatedImmutableEvent.ID).to.be.not.eq(fakeEventId);
        expect(generatedImmutableEvent.PAYLOAD.A).to.be.not.eq(fakePayloadValue);
    }
});

describe('uuidv5 tests -->', function() {
    it('uuidv5 is expected to return equal UUIDs when given the same UUID + Event Name', () => {
        let precedingEventId = uuidv4();
        let mockEventName = "MOCK_EVENT";
        let first = uuidv5(precedingEventId, mockEventName);
        let second = uuidv5(precedingEventId, mockEventName);
        expect(first).to.be.eq(second);
    });

    it('uuidv5 is expected to return different UUIDs when given a different UUID with same Event Name', () => {
        let firstPrecedingEventId = uuidv4();
        let secondPrecedingEventId = uuidv4();
        let mockEventName = "MOCK_EVENT";
        let first = uuidv5(firstPrecedingEventId, mockEventName);
        let second = uuidv5(secondPrecedingEventId, mockEventName);
        expect(first).to.not.be.eq(second);
    });

    it('uuidv5 is expected to return different UUID when given the same UUID with different Event Name', () => {
        let precedingEventId = uuidv4();
        let mockEventName = "MOCK_EVENT";
        let anotherMockEventName = "ANOTHER_MOCK_EVENT";
        let first = uuidv5(precedingEventId, mockEventName);
        let second = uuidv5(precedingEventId, anotherMockEventName);
        expect(first).to.not.be.eq(second);
    });
});

describe('Event ID idempotent tests -->', function() {

    let eventFactory;

    let constObject = {
        OS: 'A',
        OS_VERSION: '18.04',
        APP_NAME: 'BL',
        APP_VERSION: '0.0.2'
    }

    beforeEach(() => {
        eventFactory = new EventFactory(constObject);
    });

    it('expect two initial events to not have different INITIAL_EVENT_ID', () => {
        let eventA = eventFactory.create('EVENT_A', {}, {GROUP_ID: 'A'});
        let eventB = eventFactory.create('EVENT_B', {}, {GROUP_ID: 'A'});
        expect(eventA.ID).to.be.not.eq(eventB.ID);
        expect(eventA.INITIAL_EVENT_ID).to.be.not.eq(eventB.INITIAL_EVENT_ID);
    });

    it('expect that an event with the same Context, the same Name and the same Payload to will always has the same ID', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', { hello: 'world'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        for (let i = 0 ; i < 100 ; i++) {
            let eventB = eventFactory.create('EVENT_A', { hello: 'world'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
            expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
            expect(eventA.ID).to.be.eq(eventB.ID);
        }
    });

    it('expect that an event with the same Context, the same Name and empty Payload to will always has the same ID', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', {}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        for (let i = 0 ; i < 100 ; i++) {
            let eventB = eventFactory.create('EVENT_A', {}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
            expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
            expect(eventA.ID).to.be.eq(eventB.ID);
        }
    });

    it('expect that an event with the same Context, the same Name and undefined Payload to will always has the same ID', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', undefined, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        for (let i = 0; i < 100 ; i++ ) {
            let eventB = eventFactory.create('EVENT_A', undefined, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
            expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
            expect(eventA.ID).to.be.eq(eventB.ID);
        }
    });

    it('expect that two generated events with same Context, same Name but different Payload to have different IDs', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', {containerId: 'A'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        let eventB = eventFactory.create('EVENT_A', {containerId: 'B'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
        expect(eventA.ID).to.be.not.eq(eventB.ID);
    });

    it('expect that two generated events with different contexts to have different IDs', () => {
        let eventA = eventFactory.create('EVENT_A', {containerId: 'A'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: uuidv4()});
        let eventB = eventFactory.create('EVENT_A', {containerId: 'A'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: uuidv4()});
        expect(eventA.INITIAL_EVENT_ID).to.be.not.eq(eventB.INITIAL_EVENT_ID);
        expect(eventA.ID).to.be.not.eq(eventB.ID);
    });

    it('expect that two generated events with the same Context but different Name to have different IDs', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', undefined, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        let eventB = eventFactory.create('EVENT_B', undefined, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
        expect(eventA.ID).to.be.not.eq(eventB.ID);
    });

    it('expect that two generated events with the same Context, same Payload but different Name to have different IDs', () => {
        let initialEventId = uuidv4();
        let eventA = eventFactory.create('EVENT_A', {containerId: 'A'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        let eventB = eventFactory.create('EVENT_B', {containerId: 'A'}, {GROUP_ID: 'A', INITIAL_EVENT_ID: initialEventId});
        expect(eventA.INITIAL_EVENT_ID).to.be.eq(eventB.INITIAL_EVENT_ID);
        expect(eventA.ID).to.be.not.eq(eventB.ID);
    });
});

describe('Payload parsing tests ->', function() {

    let eventFactory;

    let mockEventType = 'MOCK_EVENT';
    let mockPayload = {
        A: 'a',
        B: 'b'
    };

    beforeEach(() => {
        eventFactory = new EventFactory();
        eventFactory._validateEventContextIds = function() {return true};
        eventFactory.householdId = 'j';
        eventFactory.deviceId = 'k';
        sinon.spy(eventFactory, '_parsePayload');
    });

    it('_parsePayload called when creating external event', () => {
        let generatedEvent = eventFactory.create(mockEventType, mockPayload, {USER_ID:'USER_ID'});
        expect(eventFactory._parsePayload.calledOnce).to.be.true;
        expect(eventFactory._parsePayload.calledWith(mockPayload)).to.be.true;
    });

    it('No change to non error payloads test', () => {
        let parsedPayload = eventFactory._parsePayload(mockPayload);
        expect(parsedPayload).to.be.deep.eq(mockPayload);
    });

    it('Parse error payload test', () => {
        let mockError = new Error('Error Payload');
        let parsedPayload = eventFactory._parsePayload(mockError);
        expect(parsedPayload).to.be.not.deep.eq(mockPayload);
        expect(parsedPayload.message).to.be.eq(mockError.message);
    });

    it('Parse error node payload test', () => {
        let mockError = new Error('Error Payload');
        for (let errorNodeName of ['error', 'e', 'err']) {
            let payloadWithErrorAndData = {
                data: 'a'
            };
            payloadWithErrorAndData[errorNodeName] = mockError;
            let parsedPayload = eventFactory._parsePayload(payloadWithErrorAndData);
            expect(parsedPayload).to.be.not.deep.eq(mockPayload);
            expect(parsedPayload.message).to.be.undefined;
            expect(parsedPayload.data).to.be.eq('a');
            expect(parsedPayload[errorNodeName].message).to.be.eq(mockError.message);
        }

    });
});

describe('Consts tests ->', function() {

    let eventFactory;
    let constObject;
    beforeEach(() => {
        eventFactory = new EventFactory();
        constObject = {
            OS: 'A',
            OS_VERSION: '18.04',
            APP_NAME: 'BL',
            APP_VERSION: 'aaaa'
        }
    });

    it('_init() calls _initEventContextConsts test', () => {
        sinon.spy(eventFactory, '_initEventContextConsts');
        eventFactory._init();
        expect(eventFactory._initEventContextConsts.called).to.be.true;
    });

    it('_initEventContextConsts expects to fill up required const fields', () => {
        eventFactory._initEventContextConsts(constObject);
        expect(eventFactory._OS).to.be.eq(constObject.OS);
        expect(eventFactory._OS_VERSION).to.be.eq(constObject.OS_VERSION);
        expect(eventFactory._APP_NAME).to.be.eq(constObject.APP_NAME);
        expect(eventFactory._APP_VERSION).to.be.eq(constObject.APP_VERSION);
        expect(eventFactory._EVENT_VERSION).to.be.not.undefined;
    });

    it('_getEventOS expects to return _OS when exists', () => {
        eventFactory._OS = 'A';
        expect(eventFactory._getEventOS()).to.be.eq('A');
    });

    it('getEventsOS expects to return undefined when _OS not exists', () => {
        expect(eventFactory._getEventOS()).to.be.undefined;
    })

    it('_getEventOSVersion expects to return _OS_VERSION when exists', () => {
        eventFactory._OS_VERSION = '1.0.0';
        expect(eventFactory._getEventOSVersion()).to.be.eq('1.0.0');
    });

    it('_getEventOSVersion expects to return undefined when _OS_VERSION not exists', () => {
        expect(eventFactory._getEventOSVersion()).to.be.undefined;
    });

    it('_getEventSourceType expects to return _APP_NAME when exists', () => {
        eventFactory._APP_NAME = 'BL';
        expect(eventFactory._getEventSourceType()).to.be.eq('BL');
    });

    it('_getEventSourceType expects to return undefined when _APP_NAME not exists', () => {
        expect(eventFactory._getEventSourceType()).to.be.undefined;
    });

    it('_getEventSourceVersion expects to return _APP_VERSION when exists', () => {
        eventFactory._APP_VERSION = 'aaaa';
        expect(eventFactory._getEventSourceVersion()).to.be.eq('aaaa');
    });

    it('_getEventSourceVersion expects to return -1 when _APP_NAME not exists', () => {
        expect(eventFactory._getEventSourceVersion()).to.be.eq('-1');
    });
});

describe('_isTrigger tests -> ', function() {
    let eventFactory;

    beforeEach(() => {
        eventFactory = new EventFactory();
    });

    it('_isTrigger is expected to be false when called with an event', () => {
        expect(eventFactory._isTrigger({
            NAME: 'HELLO'
        })).to.be.false;
    });

    it('_isTrigger is expected to be true when called with undefined', () => {
        expect(eventFactory._isTrigger(undefined)).to.be.true;
    });

});

describe('Create event id tests -> ', () => {

    let eventFactory;

    beforeEach(() => {
        eventFactory = new EventFactory();
    });

    it('toString test', () => {
        let number = 11111;
        let anotherNumber = 2222222;
        let text = 'abcd';
        let anotherText = 'efg';
        let concatedString = eventFactory.toString(number, anotherNumber, text, anotherText);
        expect(concatedString).to.be.eq('111112222222abcdefg');
    });
});

describe('Error/Warning tests -> ', () => {
    let eventFactory;

    beforeEach(() => {
        eventFactory = new EventFactory();
    });

    it('Error event true test', () => {
        expect(eventFactory._isErrorEvent('ERR_MOCK_EVENT')).to.be.true;
    });

    it('Error event false test', () => {
        expect(eventFactory._isErrorEvent('MOCK_EVENT')).to.be.false;
    });

    it('Warning event true test', () => {
        expect(eventFactory._isWarningEvent('WARN_EVENT')).to.be.true;
    });

    it('Warning event false test', () => {
        expect(eventFactory._isWarningEvent('MOCK_EVENT')).to.be.false;
    });

    it('which alert error test', () => {
        sinon.spy(eventFactory, '_isErrorEvent');
        expect(eventFactory._whichAlert('ERR_MOCK_EVENT')).to.be.eq('ERR');
        expect(eventFactory._isErrorEvent.calledOnce).to.be.true;
    });

    it('which alert warn test', () => {
        sinon.spy(eventFactory, '_isErrorEvent');
        sinon.spy(eventFactory, '_isWarningEvent');
        expect(eventFactory._whichAlert('WARN_MOCK_EVENT')).to.be.eq('WARN');
        expect(eventFactory._isErrorEvent.calledOnce).to.be.true;
        expect(eventFactory._isWarningEvent.calledOnce).to.be.true;
    });

    it('which alert null test', () => {
        sinon.spy(eventFactory, '_isErrorEvent');
        sinon.spy(eventFactory, '_isWarningEvent');
        expect(eventFactory._whichAlert('MOCK_EVENT')).to.be.null;
        expect(eventFactory._isErrorEvent.calledOnce).to.be.true;
        expect(eventFactory._isWarningEvent.calledOnce).to.be.true;
    });

});