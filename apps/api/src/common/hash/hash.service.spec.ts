import { HashService } from './hash.service';

describe('HashService', () => {
  const service = new HashService();

  it('gera um hash diferente do valor original', async () => {
    const hash = await service.hash('senha123');
    expect(hash).not.toBe('senha123');
  });

  it('confirma que o valor correto bate com o hash', async () => {
    const hash = await service.hash('senha123');
    await expect(service.compare('senha123', hash)).resolves.toBe(true);
  });

  it('rejeita um valor incorreto', async () => {
    const hash = await service.hash('senha123');
    await expect(service.compare('senha-errada', hash)).resolves.toBe(false);
  });
});
