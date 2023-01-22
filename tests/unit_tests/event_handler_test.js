'use strict';
require('./00_init.js');
var _ = require('lodash');
var expect = global.expect;
const Bluebird = require('bluebird');
const EventHandler = require('../../lib/event_handler.js');
const Context = require('../../lib/context.js');
const LocalPubSub = require('../../lib/local_pub_sub.js');

describe('EventHandler class tests -> ', function() {

    let eventHandler;
    let mockEventName = 'MOCK_EVENT';
    let localPubSub;
    beforeEach(() => {
        localPubSub = new LocalPubSub();
        eventHandler = new EventHandler(localPubSub);
    });

    it('Register event handler executes function test', async () => {
        let called = false;
        let mockFunction = async function() {
            await Bluebird.delay(1);
            called = true;
        };
        eventHandler.registerEventHandler(mockEventName, mockFunction);
        await eventHandler._contextFactory.create(mockEventName, undefined, { GROUP_ID: 'NO_ID'});
        await Bluebird.delay(2);
        expect(called).to.be.true;
    });

    it('Register event handler function execution expects a context', async () => {
        let isContext = false;
        let mockFunction = async function(ctx) {
            await Bluebird.delay(1);
            isContext = ctx instanceof Context;
        };
        eventHandler.registerEventHandler(mockEventName, mockFunction);
        await eventHandler._contextFactory.create(mockEventName, undefined, { GROUP_ID: 'NO_ID'});
        await Bluebird.delay(2);
        expect(isContext).to.be.true;
    });

    it('Error thrown are expected to emit new ERR_UNHANDLED events through the context', async () => {
        let errorUnhandledEventName = 'ERR_UNHANDLED';
        let mockFunction = async function() {
            await Bluebird.delay(1);
            throw new Error('IGNORE THIS TEST ERROR - NOTHING TO SEE HERE!');
        };
        let called = false;
        eventHandler.registerEventHandler(errorUnhandledEventName, (ctx) => {
            called = true;
            called = ctx.EVENT.NAME === 'ERR_UNHANDLED';
            called = ctx.EVENT.PAYLOAD.name === 'Error';
        });
        eventHandler.registerEventHandler(mockEventName, mockFunction);
        let context = await eventHandler._contextFactory.create(mockEventName, undefined, { GROUP_ID: 'NO_ID'});
        sinon.spy(context, 'emitEvent');
        await Bluebird.delay(2);
        expect(called).to.be.true;
    });

    it('A secondary registered event handler is expected to be triggerd through a context (chained handlers on same EventHandler)', async () => {
        let firstMockFunction = sinon.stub().callsFake(async (ctx) => {
            return ctx.emitEvent('REACT');
        });
        eventHandler.registerEventHandler('ACT', firstMockFunction);
        let secondMockFunction = sinon.stub().resolves();
        eventHandler.registerEventHandler('REACT', secondMockFunction);
        await eventHandler._contextFactory.create('ACT', undefined, { GROUP_ID: 'NO_ID'});
        expect(secondMockFunction.calledOnce).to.be.true;
    });

    it('Register on ANY expects to invoke an event handlner function', async () => {
        let eventHandler = new EventHandler(localPubSub);
        let isContext = false;
        let mockFunction = sinon.stub().callsFake(async (eventName, ctx) => {
            await Bluebird.delay(1);
            isContext = ctx instanceof Context;
        });
        eventHandler.registerEventHandler('ANY', mockFunction);
        await eventHandler._contextFactory.create('EVENT_A', undefined, { GROUP_ID: 'NO_ID'});
        expect(mockFunction.calledOnce).to.be.true;
        expect(mockFunction.firstCall.args[0].EVENT.NAME).to.be.eq('EVENT_A');
        await eventHandler._contextFactory.create('EVENT_B', undefined, { GROUP_ID: 'NO_ID'});
        expect(mockFunction.callCount).to.be.eq(2);
        expect(mockFunction.secondCall.args[0].EVENT.NAME).to.be.eq('EVENT_B');
    });

    it('emitInitialEventSync expected to create a new context and invoke function', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockPayload = {hello:"world"};
        localPubSub.onContext = sinon.stub();
        sinon.spy(eventHandler._contextFactory, 'create');
        await eventHandler.emitInitialEventSync(mockEventName, mockPayload, {GROUP_ID: 'NO_ID'});
        expect(eventHandler._contextFactory.create.calledOnce).to.be.true;
        expect(eventHandler._contextFactory.create.calledWith(mockEventName,mockPayload)).to.be.true;
        expect(localPubSub.onContext.calledOnce).to.be.true;
        expect(localPubSub.onContext.firstCall.args[0]).to.be.instanceof(Context);
    });

    it('emitInitialEventSync expected to return ctx.RESPONSE', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockPayload = {hello:"world"};
        let mockBody = {
            hello: 'world'
        }
        let mockResponse = {
            body: mockBody,
            statusCode: 200
        }
        localPubSub.onContext = sinon.stub().callsFake((ctx) => {
            ctx.RESPONSE = mockResponse;
        });
        let result = await eventHandler.emitInitialEventSync(mockEventName, mockPayload, {GROUP_ID: 'NO_ID'});
        expect(result.statusCode).to.be.eq(200);
        expect(result.body).to.be.eq(JSON.stringify(mockBody));
    });

    it('emitInitialEventSync expected to return 500 with error when onContext throws', async () => {
        let err = new Error('FAILED');
        localPubSub.onContext = sinon.stub().throws(err);
        let mockEventName = 'MOCK_EVENT';
        let mockPayload = {hello:"world"};
        let result = await eventHandler.emitInitialEventSync(mockEventName, mockPayload, {GROUP_ID: 'NO_ID'});
        expect(result.statusCode).to.be.eq(500);
        let error = JSON.parse(result.body);
        expect(error.message).to.be.eq('FAILED');
    });

    it('emitInitialEventSync to return 500 with error when registered function fails', async () => {
        let mockErrorMessage = 'MAJOR_FAILURE';
        let errFunc = sinon.stub().throws(mockErrorMessage);
        eventHandler.registerEventHandler('FAILED_EVENT', errFunc);
        let response = await eventHandler.emitInitialEventSync('FAILED_EVENT', undefined, {GROUP_ID: 'NO_ID'});
        expect(response.statusCode).to.be.eq(500);
        expect(response.body).to.have.string(mockErrorMessage);
    });
});

describe('EventHandler logging tests ->', function() {

    let mockEventHandler;
    let mockLogger;
    let localPubSub;
    beforeEach(() => {
        localPubSub = new LocalPubSub();
        mockEventHandler = new MockEventHandler(localPubSub);
        mockLogger = getMockLogger();
        mockEventHandler._log = mockLogger;
    });

    it('Optional logger error test', async () => {
        let mockLogger = getMockLogger();
        mockEventHandler._log = mockLogger;
        mockEventHandler.registerEventHandler('A', async function() {
            throw new Error('Error');
        });
        await mockEventHandler._contextFactory.create('A', undefined, { GROUP_ID: 'NO_ID'});
        await Bluebird.delay(5);
        expect(mockLogger.error.calledOnce).to.be.true;
    });


    it('Function name and class verbose test', async () => {
        sinon.spy(mockEventHandler, '_verboseExecucting');
        sinon.spy(mockEventHandler, '_verboseExited');

        await mockEventHandler._contextFactory.create('MOCK_EVENT', undefined, { GROUP_ID: 'NO_ID'});
        await Bluebird.delay(5);

        expect(mockEventHandler._verboseExecucting.calledOnce).to.be.true;
        expect(mockEventHandler._verboseExited.calledOnce).to.be.true;
        expect(mockEventHandler._verboseExecucting.calledWith('MOCK_EVENT', 'MockEventHandler', 'bound mockFunction')).to.be.true;
        expect(mockEventHandler._verboseExited.calledWith('MOCK_EVENT', 'MockEventHandler', 'bound mockFunction')).to.be.true;
    });


    class MockEventHandler extends EventHandler {
        constructor(iPubSub) {
            super(iPubSub);
            this.registerEventHandler('MOCK_EVENT', this.mockFunction.bind(this));
        }
        async mockFunction() {
            return true;
        }
    };
});

function getMockLogger() {
    return {
        error: sinon.stub(),
        verbose: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub()
    }
}