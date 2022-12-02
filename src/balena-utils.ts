import * as core from '@actions/core';
import * as balena from 'balena-sdk';

let sdk: ReturnType<typeof balena.getSdk> | null = null;

export async function init(endpoint: string, token: string) {
	core.info(`Initializing SDK for https://api.${endpoint})`);
	// Specify API endpoint
	sdk = balena.getSdk({
		apiUrl: `https://api.${endpoint})}/`,
	});
	// Authenticate client with token
	await sdk.auth.loginWithToken(token);
}

export async function setupDevice(fleet: string, release_id: string, tag_key: string = 'test_with_balena'): Promise<string> {
	if (!sdk) {
		throw new Error('balena SDK has not been initialized');
	}

	// get an available device for testing: tagged, not running a draft release and online
	let availableDevice = await sdk.models.device.getAll({
		$select: 'uuid',
		$top: 1,
		$filter: {
			belongs_to__application: {
				$any: {
					$alias: 'bta',
					$expr: {
						bta: {
							slug: fleet
						}
					}
				}
			},
			device_tag: {
				$any: {
					$alias: 't',
					$expr: {
						t: {
							tag_key: tag_key
						}
					}
				}
			},
			$or: [
				{
					is_running__release: {
						$any: {
							$alias: 't',
							$expr: {
								t: {
									is_final: false,
								},
							}
						},
					},
				},
				{
					is_running__release: null,
				}
			],
			is_online: false
		},
	})

	core.info(`Acquired device ${availableDevice[0]['device_name']} for testing draft release ${release_id})`);

	await sdk.models.device.pinToRelease(availableDevice[0]['uuid'], release_id);

	await new Promise<void>((resolve, reject) => {
		let wait: number = 5000;
		const waitForReady = setInterval(
			async () => {
				if (await checkIfRunningRelease(availableDevice[0]['uuid'], release_id)) {
					clearInterval(waitForReady);
					resolve();
				}

				if (!await checkOnline(availableDevice[0]['uuid'])) {
					clearInterval(waitForReady);
					reject("test device is offline...");
				}

				wait += 1000;
			},
			wait
		)
	})

	core.info(`Device ${availableDevice[0]['device_name']} ready for testing`);

	return availableDevice[0]['uuid'];
}

export async function teardownDevice(device: string) {
	if (!sdk) {
		throw new Error('balena SDK has not been initialized');
	}

	core.info(`Tearing down ${device}; returning to application release tracking`);
	// return device back to application release tracking
	await sdk.models.device.trackApplicationRelease(device);
}

async function checkOnline(device: string): Promise<boolean> {
	if (!sdk) {
		throw new Error('balena SDK has not been initialized');
	}

	return await sdk.models.device.isOnline(device);
}

async function checkIfRunningRelease(device: string, release: string): Promise<boolean> {
	if (!sdk) {
		throw new Error('balena SDK has not been initialized');
	}

	let state = await sdk.models.device.getAll({
		$top: 1,
		$expand: ['is_running__release'],
		$select: ['is_online'],
		$filter: {
			uuid: device,
			$and: [
				{
					is_running__release: {
						commit: release
					},
				},
				{
					is_running__release: {
						status: 'success'
					},
				},
			]
		},
	})

	if (state[0]['is_online'] !== true) {
		throw new Error(`Device ${device} appears to be offline...`);
	}

	return (state.length !== 0);
}

