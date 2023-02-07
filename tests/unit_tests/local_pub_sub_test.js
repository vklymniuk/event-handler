'use strict';
require('./bootstrap.js');

var sinon = global.sinon;
var _ = require('lodash');
var expect = global.expect;

const EventHandler = require('../../lib/event_handler.js');
const LocalPubSub = require('../../lib/local_pub_sub.js');
const Bluebird = require('bluebird');
const Context = require('../../lib/context');

describe('Local pub sub test -> ', () => {

    let localPubSub;

    beforeEach(() => {
        localPubSub = new LocalPubSub();
    });

    it('Expect LocalPubSub to act as a wrapper for the event emitter', async () => {
        let eventHandler = new EventHandler(localPubSub);
        let isEvent = false;
        let mockFunction = sinon.stub().callsFake(async (event) => {
            await Bluebird.delay(1);
            isEvent = _.has(event, 'NAME');
        });
        sinon.spy(localPubSub._eventEmitter, 'emit')
        sinon.spy(localPubSub._eventEmitter, 'on');
        localPubSub.subscribe('MOCK_EVENT', mockFunction);
        await eventHandler._contextFactory.create('MOCK_EVENT', undefined, {GROUP_ID: 'NO_ID'});
        await Bluebird.delay(2);
        expect(isEvent).to.be.true;
        expect(mockFunction.calledOnce).to.be.true;
        expect(localPubSub._eventEmitter.on.calledOnce).to.be.true;
        expect(localPubSub._eventEmitter.emit.calledOnce).to.be.true;
    });

    it('LocalPubSub expects to implement iPubSub functions', () => {
        expect(localPubSub.subscribe).to.be.not.undefined;
        expect(localPubSub.publish).to.be.not.undefined;
    });

    it('Register on ANY event handler test', async () => {
        let eventHandler = new EventHandler(localPubSub);
        let mockEventName = 'MOCK_EVENT';
        let isEvent = false;
        let mockFunction = sinon.stub().callsFake(async (event) => {
            await Bluebird.delay(1);
            isEvent = _.has(event, 'NAME');
        });

        localPubSub.subscribe('ANY', mockFunction);
        await eventHandler._contextFactory.create(
            mockEventName, 
            undefined, 
            {GROUP_ID: 'NO_ID'}
        );
        await Bluebird.delay(2);
        expect(isEvent).to.be.true;
        expect(mockFunction.calledOnce).to.be.true;
    });


    it('Two EventHandlers expectes to pass Events through the local pub sub', async () => {
        let bl_1 = new BL1(localPubSub);
        let bl_2 = new BL2(localPubSub);
        sinon.spy(bl_1, 'handleStarted');
        sinon.spy(bl_2, 'handleEnded');
        await bl_1._contextFactory.create('STARTED', undefined, {GROUP_ID: 'NO_ID'});
        expect(bl_1.called).to.be.true;
        expect(bl_2.called).to.be.true;
    });

    it('onContext expects to invoke callback with context', async () => {
        let mockContext = {
            EVENT: {
                NAME: 'MOCK_EVENT',
            },
            RESPONSE: {},
        }

        let cb = sinon.stub().resolves();
        localPubSub.subscribe(mockContext.EVENT.NAME, cb);
        await localPubSub.onContext(mockContext);
        expect(cb.calledOnce).to.be.true;
        expect(cb.calledWith(mockContext)).to.be.true;
    });

    class BL1 extends EventHandler {

        _initEventHandlers() {
            this.registerEventHandler(
                'STARTED', 
                this.handleStarted.bind(this)
            );
        }

        handleStarted(ctx) {
            this.called = true;
            ctx.emitEvent('ENDED');
        }
    }

    class BL2 extends EventHandler {
        _initEventHandlers() {
            this.registerEventHandler(
                'ENDED', 
                this.handleEnded.bind(this)
            );
        }

        handleEnded() {
            this.called = true;
            ctx.emitEvent('DONE');
        }
    }
});