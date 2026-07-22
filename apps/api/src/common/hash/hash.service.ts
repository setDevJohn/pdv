import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// bcryptjs (implementação pura em JS do bcrypt) em vez do pacote nativo `bcrypt`:
// mesmos hashes/algoritmo, mas sem exigir toolchain de compilação nativa na imagem
// Docker (node:20-alpine). Usado tanto para senha de usuário quanto para código de
// gerente (ver docs/06-prompts-apoio.md §6.2).
const SALT_ROUNDS = 12;

@Injectable()
export class HashService {
  hash(valor: string): Promise<string> {
    return bcrypt.hash(valor, SALT_ROUNDS);
  }

  compare(valor: string, hash: string): Promise<boolean> {
    return bcrypt.compare(valor, hash);
  }
}
