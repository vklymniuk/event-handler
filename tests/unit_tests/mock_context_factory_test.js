'use strict';
require('./bootstrap.js');
const MockContextFactory = require('../../lib/mock_context_factory');
const co = require('co');
const Bluebird = require('bluebird');
const _ = require('lodash');

const Context = require('../../lib/context');
describe('Mock Context Factory tests -> ', function() {

    it('create expects to create context', () => {
        let ctx = MockContextFactory.create('MOCK_EVENT', {hello:"world"}, {GROUP_ID: 'NO_ID'});
        expect(ctx).to.be.instanceOf(Context);
        expect(ctx.EVENT.NAME).to.be.eq('MOCK_EVENT');
        expect(ctx.EVENT.PAYLOAD.hello).to.be.eq('world');
        expect(ctx.EVENT.GROUP_ID).to.be.eq('NO_ID');
    });

    it('Calling emitEvent creates another context', () => {
        let ctx = MockContextFactory.create('MOCK_EVENT', {hello:"world"}, {GROUP_ID: 'NO_ID'});
        let anotherCtx = ctx.emitEvent('ANOTHER_EVENT', {another:"world"});
        expect(anotherCtx.EVENT.NAME).to.be.eq('ANOTHER_EVENT');
        expect(anotherCtx.EVENT.PAYLOAD.another).to.be.eq('world');
        expect(ctx.EVENT.NAME).to.be.eq('MOCK_EVENT');
        expect(ctx.EVENT.PAYLOAD.hello).to.be.eq('world');
        expect(ctx.EVENT.GROUP_ID).to.be.eq('NO_ID');
    });

    it('Calling emitRequest calls sessionHandler', async () => {
        let ctx = MockContextFactory.create('MOCK_EVENT', {hello:"world"}, {GROUP_ID: 'NO_ID'});
        let unlocked = false;
        co(async () => {
            await ctx.emitRequest('REQUESTED');
            unlocked = true;
        });
        await Bluebird.delay(100);
        let locks = ctx._sessionHandler._sessionHandlerApi._locks;
        let lockId = _.keys(locks)[0];
        ctx._sessionHandler.respond(lockId);
        await Bluebird.delay(100);
        expect(unlocked).to.be.true;
    });
});