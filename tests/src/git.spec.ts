import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';
import * as execHelper from '@actions/exec';

import * as git from '../../src/git';

describe('src/git', () => {
	let execStub: SinonStub;

	before(() => {
		execStub = stub(execHelper, 'exec');
	});

	beforeEach(() => {
		execStub.resolves(0); // Make exec calls succeed
	});

	afterEach(() => {
		execStub.reset();
	});

	after(() => {
		execStub.restore();
	});

	describe('fetch', async () => {
		it('passes correct arguments to exec', async () => {
			await git.fetch();
			expect(execStub).to.have.been.calledWith('git', ['fetch'], {
				silent: true,
			});
		});

		it('throws an error when fetch returns non 0 exit code', async () => {
			execStub.resolves(1);
			await expect(git.fetch()).to.eventually.be.rejectedWith(
				'Failed to fetch remote branches.',
			);
		});
	});

	describe('checkout', async () => {
		it('passes correct arguments to exec', async () => {
			await git.checkout('new-feature');
			expect(execStub).to.have.been.calledWith('git', [
				'checkout',
				'new-feature',
			]);
		});

		it('throws an error when checkout returns non 0 exit code', async () => {
			execStub.resolves(1);
			await expect(git.checkout('new-feature')).to.eventually.rejectedWith(
				'Failed to checkout new-feature branch/commit.',
			);
		});
	});
});
