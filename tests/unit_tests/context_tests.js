'use strict';
require('./00_init.js');
const sinon = global.sinon;
const _ = require('lodash');
const expect = global.expect;
const ContextFactory = require('../../lib/context_factory.js');
const Context = require('../../lib/context.js');
const EventFactory = require('../../lib/event_factory.js');
const LocalPubSub = require('../../lib/local_pub_sub.js');
const MockContextFactory = require('../../lib/mock_context_factory');

describe('context tests ->', function() {

    let contextFactory;
    let eventFactory;
    let localPubSub;
    beforeEach(() => {
        localPubSub = new LocalPubSub();
        eventFactory = new EventFactory();
        contextFactory = new ContextFactory(eventFactory, localPubSub);
    });

    it('Creating context expects to include (decorate) EVENT from factory without payload', async () => {
        let mockEventName = 'MOCK_EVENT';
        sinon.spy(eventFactory, 'create');
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        expect(mockContext.EVENT).to.be.not.undefined;
        expect(mockContext.EVENT.ID).to.be.not.undefined;
        expect(mockContext.EVENT.PAYLOAD).to.be.undefined;
        expect(eventFactory.create.calledOnce).to.be.true;
        expect(eventFactory.create.calledWith(mockEventName)).to.be.true;
    });

    it('Creating context expects to include (decorate) EVENT from factory with payload', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockPayload = {
            hello: 'world'
        }
        sinon.spy(eventFactory, 'create');
        let mockContext = await contextFactory.create(mockEventName, mockPayload, {GROUP_ID: 'NO_ID'});
        expect(mockContext.EVENT).to.be.not.undefined;
        expect(mockContext.EVENT.ID).to.be.not.undefined;
        expect(mockContext.EVENT.PAYLOAD).to.be.not.undefined;
        expect(mockContext.EVENT.PAYLOAD).to.be.deep.eq(mockPayload);
        expect(eventFactory.create.calledOnce).to.be.true;
        expect(eventFactory.create.calledWith(mockEventName, mockPayload)).to.be.true;
    });

    it('Calling emitEvent expects to call publish of iPubSub', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        sinon.spy(mockContext._contextFactory._eventFactory, 'create');
        sinon.spy(localPubSub, 'publish');
        await mockContext.emitEvent(anotherMockEventName);
        expect(localPubSub.publish.calledOnce).to.be.true;
        expect(mockContext._contextFactory._eventFactory.create.calledOnce).to.be.true;
        expect(mockContext._contextFactory._eventFactory.create.calledWith(anotherMockEventName)).to.be.true;
    });

    it('Calling emitEvent expect to generate a new event with a new name', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        let anotherMockContext = await mockContext.emitEvent(anotherMockEventName);
        expect(anotherMockContext).to.be.instanceOf(Context);
        expect(anotherMockContext.EVENT.NAME).to.be.eq(anotherMockEventName);
    });

    it('Calling emitEvent expect to generate a new event with a new name and a new payload', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        sinon.spy(localPubSub, 'publish');
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        sinon.spy(mockContext._contextFactory._eventFactory, 'create');
        let mockPayload = {
            hello: 'world'
        }
        await mockContext.emitEvent(anotherMockEventName, mockPayload);
        expect(localPubSub.publish.calledOnce).to.be.true;
        expect(mockContext._contextFactory._eventFactory.create.calledOnce).to.be.true;
        expect(mockContext._contextFactory._eventFactory.create.calledWith(anotherMockEventName, mockPayload)).to.be.true;
    });

    it('Calling emitEvent expects to call factory with the event inside the context', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        sinon.spy(mockContext._contextFactory._eventFactory, 'create');
        await mockContext.emitEvent(anotherMockEventName);
        expect(mockContext._contextFactory._eventFactory.create.calledOnce).to.be.true;
        expect(mockContext._contextFactory._eventFactory.create.calledWith(anotherMockEventName, undefined, mockContext.EVENT)).to.be.true;
    });

    it('Calling emitEvent expect a new event to be emitted', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        sinon.spy(localPubSub, 'publish');
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        await mockContext.emitEvent(anotherMockEventName);
        expect(localPubSub.publish.calledOnce).to.be.true;
        expect(localPubSub.publish.args[0][1].NAME).to.be.not.undefined;
    });

    it('Calling emitEvent expect emitted event to share the same INITIAL_EVENT_ID as original context', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        sinon.spy(localPubSub, 'publish');
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        await mockContext.emitEvent(anotherMockEventName);
        let expectedEventRootId = mockContext.EVENT.ID;
        expect(localPubSub.publish.args[0][1].INITIAL_EVENT_ID).to.be.eq(expectedEventRootId);
    });

    it('Calling emitEvent calls emit with new event name', async () => {
        let mockEventName = 'MOCK_EVENT';
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        sinon.spy(localPubSub, 'publish');
        let anotherMockEventName = 'ANOTHER_MOCK_EVENT';
        await mockContext.emitEvent(anotherMockEventName);
        expect(localPubSub.publish.args[0][0]).to.be.eq(anotherMockEventName);
    });

    it('Creating a context from an existing EVENT expects to include an event', () => {
        let mockEvent = {
            NAME: 'A',
            PAYLOAD: {
                hello: 'world'
            }
        };
        let ctx = contextFactory.from(mockEvent);
        expect(ctx.EVENT).to.be.not.undefined;
        expect(ctx.EVENT).to.be.deep.eq(mockEvent);
    });

    it('Creating a context from an existing EVENT expects event to be immutable', () => {
        let mockEvent = {
            NAME: 'A',
            PAYLOAD: {
                hello: 'world'
            }
        };
        let ctx = contextFactory.from(mockEvent);
        expectChangersToThrow(ctx.EVENT);
    });

    it('Creationg of new event expect an event to be published', async () => {
        let mockEventName = 'MOCK_EVENT';
        sinon.spy(contextFactory._iPubSub, 'publish');
        let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
        expect(contextFactory._iPubSub.publish.calledOnce).to.be.true;
        expect(contextFactory._iPubSub.publish.args[0][0]).to.be.eq(mockEventName);
        expect(contextFactory._iPubSub.publish.args[0][1].NAME).to.be.eq(mockEventName);
    })

    it('Context Factory expects to throw error with name ContextParsingError when fails to create a context', async () => {
        contextFactory._eventFactory.create = sinon.stub().throws('BAD JSON');
        try {
            await contextFactory.create('MOCK_EVENT', undefined, {GROUP_ID: 'NO_ID'});
        }
        catch(e) {
            expect(e.name).to.be.eq('ContextParsingError');
            expect(e.cause().name).to.be.eq('BAD JSON');
            return;
        }
        expect(true).to.be.false;
    });

    it('Context Factory create expect to throw an error when fails to create a context',() => {
        contextFactory._eventFactory.create = sinon.stub().throws('BAD JSON');
        expect(contextFactory.create('MOCK_EVENT')).to.be.rejectedWith(Error);
    });

    it('_mergeContexts is expected to return the context of the original event, added DEVICE_ID', () => {
        let mockPayload = {
            hello: 'world'
        }
        let ctx = MockContextFactory.create('MOCK_EVENT', mockPayload, {GROUP_ID:'BACKEND'});
        let mergedCtx = ctx._mergeContexts({
            DEVICE_ID: 'hello'
        });
        expect(mergedCtx.INITIAL_EVENT_ID).to.be.eq(ctx.EVENT.INITIAL_EVENT_ID);
        expect(mergedCtx.DEVICE_ID).to.be.eq('hello');
    });

    it('_mergeContexts is expected to return the original event when input is undefined', () => {
        let mockPayload = {
            hello: 'world'
        }
        let ctx = MockContextFactory.create('MOCK_EVENT', mockPayload, {GROUP_ID:'BACKEND'});
        let mergedCtx = ctx._mergeContexts();
        expect(mergedCtx).to.be.deep.eq(ctx.EVENT);
    });
})

// TODO: I failed to pass this function to 00_init.js should be done one day
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