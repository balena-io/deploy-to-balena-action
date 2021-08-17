import * as core from '@actions/core';

import { run } from './action';

run().catch((e) => {
	core.setFailed(e.message);
});
