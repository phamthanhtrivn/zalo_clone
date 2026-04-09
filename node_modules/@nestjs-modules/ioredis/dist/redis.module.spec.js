"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ioredis_1 = require("ioredis");
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const redis_module_1 = require("./redis.module");
const redis_utils_1 = require("./redis.utils");
const redis_decorators_1 = require("./redis.decorators");
describe('RedisModule', () => {
    it('Instance Redis', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const module = yield testing_1.Test.createTestingModule({
            imports: [redis_module_1.RedisModule.forRoot({
                    type: 'single',
                    options: {
                        host: '127.0.0.1',
                        port: 6379,
                        password: '123456',
                    }
                })],
        }).compile();
        const app = module.createNestApplication();
        yield app.init();
        const redisModule = module.get(redis_module_1.RedisModule);
        expect(redisModule).toBeInstanceOf(redis_module_1.RedisModule);
        yield app.close();
    }));
    it('Instance Redis client provider', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const defaultConnection = 'default';
        const module = yield testing_1.Test.createTestingModule({
            imports: [redis_module_1.RedisModule.forRoot({
                    type: 'single',
                    options: {
                        host: '127.0.0.1',
                        port: 6379,
                        password: '123456',
                    }
                })],
        }).compile();
        const app = module.createNestApplication();
        yield app.init();
        const redisClient = module.get((0, redis_utils_1.getRedisConnectionToken)(defaultConnection));
        const redisClientTest = module.get((0, redis_utils_1.getRedisConnectionToken)(defaultConnection));
        expect(redisClient).toBeInstanceOf(ioredis_1.default);
        expect(redisClientTest).toBeInstanceOf(ioredis_1.default);
        yield app.close();
    }));
    it('inject redis connection', () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        let TestProvider = class TestProvider {
            constructor(redis) {
                this.redis = redis;
            }
            getClient() {
                return this.redis;
            }
        };
        TestProvider = tslib_1.__decorate([
            (0, common_1.Injectable)(),
            tslib_1.__param(0, (0, redis_decorators_1.InjectRedis)()),
            tslib_1.__metadata("design:paramtypes", [ioredis_1.default])
        ], TestProvider);
        const module = yield testing_1.Test.createTestingModule({
            imports: [redis_module_1.RedisModule.forRoot({
                    type: 'single',
                    options: {
                        host: '127.0.0.1',
                        port: 6379,
                        password: '123456',
                    }
                })],
            providers: [TestProvider],
        }).compile();
        const app = module.createNestApplication();
        yield app.init();
        const provider = module.get(TestProvider);
        expect(provider.getClient()).toBeInstanceOf(ioredis_1.default);
        yield app.close();
    }));
});
