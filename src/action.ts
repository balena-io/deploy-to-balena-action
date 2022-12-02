import { spawn } from 'child_process';
import * as core from '@actions/core';


export async function test(device: string, command: string, timeout: number) {
    const test = spawn(
        command,
        {
            shell: true,
            stdio: 'inherit',
            env: {
                DEVICE_UUID: device,
                BALENA_TOKEN: process.env.BALENA_TOKEN
            },
            timeout: timeout
        },
    );


    await new Promise<void>((resolve, reject) => {
        test.on('exit', (code) => {
            core.info(`Tests Finished, exit code ${code}`)
            if (code === 0) {
                resolve()
            } else {
                reject(`Exited with non-zero code ${code}`)
            }
        })
    })
}
