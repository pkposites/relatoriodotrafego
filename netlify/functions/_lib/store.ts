/**
 * Armazenamento chave-valor com escrita condicional (idempotência e
 * concorrência otimista). Produção: Netlify Blobs. Testes: memória.
 */
export interface KV {
  getJSON<T>(key: string): Promise<{ value: T; etag: string } | null>;
  /** Grava. onlyIfNew: só se a chave não existir. ifMatch: só se a versão não mudou. Retorna se gravou. */
  setJSON(key: string, value: unknown, opts?: { onlyIfNew?: boolean; ifMatch?: string }): Promise<boolean>;
  getBytes(key: string): Promise<Uint8Array | null>;
  setBytes(key: string, bytes: Uint8Array): Promise<void>;
}

export class MemoryKV implements KV {
  private data = new Map<string, { v: string; etag: string }>();
  private n = 0;
  async getJSON<T>(key: string) {
    const e = this.data.get(key);
    return e ? { value: JSON.parse(e.v) as T, etag: e.etag } : null;
  }
  async setJSON(key: string, value: unknown, opts: { onlyIfNew?: boolean; ifMatch?: string } = {}) {
    const cur = this.data.get(key);
    if (opts.onlyIfNew && cur) return false;
    if (opts.ifMatch && cur?.etag !== opts.ifMatch) return false;
    this.data.set(key, { v: JSON.stringify(value), etag: `e${++this.n}` });
    return true;
  }
  async getBytes(key: string) {
    const e = this.data.get(key);
    return e ? new Uint8Array(Buffer.from(e.v, 'base64')) : null;
  }
  async setBytes(key: string, bytes: Uint8Array) {
    this.data.set(key, { v: Buffer.from(bytes).toString('base64'), etag: `e${++this.n}` });
  }
}

/** Netlify Blobs. Disponível apenas dentro das funções implantadas na Netlify. */
export async function blobsKV(storeName: string): Promise<KV> {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: storeName, consistency: 'strong' });
  return {
    async getJSON<T>(key: string) {
      const r = await store.getWithMetadata(key, { type: 'json' });
      return r ? { value: r.data as T, etag: r.etag ?? '' } : null;
    },
    async setJSON(key: string, value: unknown, opts: { onlyIfNew?: boolean; ifMatch?: string } = {}) {
      const options = opts.onlyIfNew ? { onlyIfNew: true } : opts.ifMatch ? { onlyIfMatch: opts.ifMatch } : {};
      const r = await store.setJSON(key, value, options);
      return r.modified;
    },
    async getBytes(key: string) {
      const r = await store.get(key, { type: 'arrayBuffer' });
      return r ? new Uint8Array(r) : null;
    },
    async setBytes(key: string, bytes: Uint8Array) {
      await store.set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    },
  };
}
