'use strict';

require('./00_init.js');

const ContextFactory = require('../../lib/context_factory.js');
const Context = require('../../lib/context.js');
const EventFactory = require('../../lib/event_factory.js');
const LocalPubSub = require('../../lib/local_pub_sub.js');
const MockContextFactory = require('../../lib/mock_context_factory');

const sinon = global.sinon;
const _ = require('lodash');
const expect = global.expect;

describe('Unit tests', function() {

    let contextFactory;
    let eventFactory;
    let localPubSub;

    beforeEach(() => {
            localPubSub = new LocalPubSub();
            eventFactory = new EventFactory();
            contextFactory = new ContextFactory(eventFactory, localPubSub);
    });

    it('TestCase #1', async () => {
            let mockEventName = 'MOCK_EVENT';
            sinon.spy(eventFactory, 'create');
            let mockContext = await contextFactory.create(mockEventName, undefined, {GROUP_ID: 'NO_ID'});
            expect(mockContext.EVENT).to.be.not.undefined;
            expect(mockContext.EVENT.ID).to.be.not.undefined;
            expect(mockContext.EVENT.PAYLOAD).to.be.undefined;
            expect(eventFactory.create.calledOnce).to.be.true;
            expect(eventFactory.create.calledWith(mockEventName)).to.be.true;
    })
});