import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password into an argon2id string', async () => {
    const hash = await service.hash('S3cur3Pass!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('S3cur3Pass!');
    await expect(service.verify(hash, 'S3cur3Pass!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('S3cur3Pass!');
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
  });
});
