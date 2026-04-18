// src/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private subClient: Redis;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
    });
    this.subClient = this.redisClient.duplicate();
  }

  // GET
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  // SET with options
  async set(
    key: string,
    value: string,
    mode?: 'EX',
    duration?: number,
  ): Promise<'OK'> {
    if (mode === 'EX' && duration) {
      return this.redisClient.set(key, value, 'EX', duration);
    }
    return this.redisClient.set(key, value);
  }

  // DELETE
  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  // TTL - remaining life time
  async ttl(key: string): Promise<number> {
    return this.redisClient.ttl(key);
  }

  getClient(): Redis {
    return this.redisClient;
  }

  createDuplicateClient(): Redis {
    return this.redisClient.duplicate()
  }

  async publish(channel: string, message: any) {
    return this.redisClient.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (payload: any) => void) {
    await this.subClient.subscribe(channel);
    this.subClient.on('message', (chan, message) => {
      if (chan === channel) {
        callback(JSON.parse(message));
      }
    });
  }
}
