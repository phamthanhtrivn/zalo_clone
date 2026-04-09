"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisHealthIndicator = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const ioredis_1 = require("ioredis");
const redis_constants_1 = require("../redis.constants");
let RedisHealthIndicator = class RedisHealthIndicator extends terminus_1.HealthIndicator {
    constructor(redis) {
        super();
        this.redis = redis;
    }
    isHealthy(key) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                yield this.redis.ping();
                return this.getStatus(key, true);
            }
            catch (error) {
                throw new terminus_1.HealthCheckError('Redis check failed', this.getStatus(key, false, { message: error.message }));
            }
        });
    }
};
exports.RedisHealthIndicator = RedisHealthIndicator;
exports.RedisHealthIndicator = RedisHealthIndicator = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(redis_constants_1.REDIS_HEALTH_INDICATOR)),
    tslib_1.__metadata("design:paramtypes", [ioredis_1.default])
], RedisHealthIndicator);
