import Redis from 'ioredis';
import { RedisModuleOptions } from './redis.interfaces';
export declare function getRedisOptionsToken(connection?: string): string;
export declare function getRedisConnectionToken(connection?: string): string;
export declare function createRedisConnection(options: RedisModuleOptions): import("ioredis/built/cluster").default | Redis;
