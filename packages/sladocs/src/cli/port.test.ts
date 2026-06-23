import net from 'node:net';
import { describe, expect, it } from 'vitest';
import { getFreePort } from './port.js';

function listen(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject).once('listening', () => resolve(srv));
    srv.listen(port, '127.0.0.1');
  });
}

function close(srv: net.Server): Promise<void> {
  return new Promise((resolve) => srv.close(() => resolve()));
}

describe('getFreePort', () => {
  it('returns the start port when it is free', async () => {
    // Grab an ephemeral port and release it so it is (almost surely) free.
    const srv = await listen(0);
    const port = (srv.address() as net.AddressInfo).port;
    await close(srv);

    expect(await getFreePort(port, '127.0.0.1')).toBe(port);
  });

  it('skips an occupied port', async () => {
    const srv = await listen(0);
    const port = (srv.address() as net.AddressInfo).port;
    try {
      expect(await getFreePort(port, '127.0.0.1')).toBeGreaterThan(port);
    } finally {
      await close(srv);
    }
  });
});
