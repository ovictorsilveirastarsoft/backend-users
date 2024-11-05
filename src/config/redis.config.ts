import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const getRedisConfig = (
  configService: ConfigService,
): CacheModuleOptions => ({
  store: redisStore,
  url: configService.get('REDIS_URL'),
  ttl: 300, // 5 minutes
});
