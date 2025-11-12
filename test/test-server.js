import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Spawns the server CLI with the provided arguments and captures stdout/stderr.
 */
function runCli(args = []) {
  const serverPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath, ...args], {
      env: {
        ...process.env,
        // Ensure tests do not accidentally try to talk to the Openprovider API.
        OPENPROVIDER_USERNAME: process.env.OPENPROVIDER_USERNAME ?? '',
        OPENPROVIDER_PASSWORD: process.env.OPENPROVIDER_PASSWORD ?? '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));

    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`CLI exited with code ${code}. Stdout: ${stdout}\nStderr: ${stderr}`);
        return reject(error);
      }

      resolve({ stdout, stderr });
    });
  });
}

async function main() {
  console.log('Verifying Openprovider MCP CLI help output...');
  const { stdout } = await runCli(['--help']);

  assert.match(stdout, /Openprovider MCP Server/, 'Help output should include the server title');
  assert.match(stdout, /--help/, 'Help output should mention the --help flag');
  assert.match(stdout, /OPENPROVIDER_USERNAME/, 'Help output should mention the required environment variables');

  console.log('CLI help text looks good.');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exitCode = 1;
});
