module.exports = {
    bail: true, // Exit test script on first error
    exit: true, // Force Mocha to exit after tests complete
    recursive: true, // Look for tests in subdirectories
    require: [
        // Files to execute before running suites
        'ts-node/register/transpile-only',
        'tests/config/fixtures.ts',
    ],
    spec: ['tests/**/*.spec.ts'],
    timeout: '30000',
};
