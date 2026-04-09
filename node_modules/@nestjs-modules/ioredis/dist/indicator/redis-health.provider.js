"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisHealthIndicatorProvider = void 0;
const ioredis_1 = require("ioredis");
const redis_constants_1 = require("../redis.constants");
exports.redisHealthIndicatorProvider = {
    provide: redis_constants_1.REDIS_HEALTH_INDICATOR,
    useFactory: () => new ioredis_1.default(),
};
