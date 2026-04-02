declare interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(options?: { prefix?: string }): Promise<Map<string, T>>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  deleteAlarm(): Promise<void>;
}

declare interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(closure: () => Promise<T>): Promise<T>;
}

declare interface DurableObjectStub {
  fetch(input: RequestInfo | URL | string, init?: RequestInit): Promise<Response>;
}

declare interface DurableObjectId {}

declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare abstract class DurableObject<Env = unknown> {
  protected readonly ctx: DurableObjectState;
  protected readonly env: Env;
  constructor(ctx: DurableObjectState, env: Env);
  alarm?(): Promise<void>;
}

declare module "cloudflare:workers" {
  export { DurableObject };
}

declare interface Queue<Body = unknown> {
  send(message: Body): Promise<void>;
}

declare interface Message<Body = unknown> {
  readonly body: Body;
  ack(): void;
  retry(): void;
}

declare interface MessageBatch<Body = unknown> {
  readonly messages: Message<Body>[];
  readonly queue: string;
}

declare interface D1Result {
  meta?: { changes?: number };
}

declare interface D1ExecResult {
  count: number;
  duration: number;
}

declare interface D1AllResult<T> {
  results?: T[];
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1AllResult<T>>;
}

declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
}

declare interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpEtag?: string;
}

declare interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<void>;
}
