"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisConnection = exports.getRedisConnectionToken = exports.getRedisOptionsToken = void 0;
const ioredis_1 = require("ioredis");
const redis_constants_1 = require("./redis.constants");
function getRedisOptionsToken(connection) {
    return `${connection || redis_constants_1.REDIS_MODULE_CONNECTION}_${redis_constants_1.REDIS_MODULE_OPTIONS_TOKEN}`;
}
exports.getRedisOptionsToken = getRedisOptionsToken;
function getRedisConnectionToken(connection) {
    return `${connection || redis_constants_1.REDIS_MODULE_CONNECTION}_${redis_constants_1.REDIS_MODULE_CONNECTION_TOKEN}`;
}
exports.getRedisConnectionToken = getRedisConnectionToken;
function createRedisConnection(options) {
    const { type, options: commonOptions = {} } = options;
    switch (type) {
        case 'cluster':
            return new ioredis_1.default.Cluster(options.nodes, commonOptions);
        case 'single':
            const { url, options: { port, host } = {} } = options;
            const connectionOptions = Object.assign(Object.assign({}, commonOptions), { port, host });
            return url ? new ioredis_1.default(url, connectionOptions) : new ioredis_1.default(connectionOptions);
        default:
            throw new Error('Invalid configuration');
    }
}
exports.createRedisConnection = createRedisConnection;
