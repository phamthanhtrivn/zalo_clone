import { type HealthCheckStatus } from './health-check-result.interface';
import { type HealthIndicatorResult } from '../health-indicator';
export declare function getHealthCheckSchema(status: HealthCheckStatus): {
    type: string;
    properties: {
        status: {
            type: string;
            example: HealthCheckStatus;
        };
        info: {
            nullable: boolean;
            type: string;
            example: HealthIndicatorResult;
            additionalProperties: {
                type: string;
                properties: {
                    status: {
                        type: string;
                    };
                };
                additionalProperties: {
                    type: string;
                };
            };
        };
        error: {
            nullable: boolean;
            type: string;
            example: HealthIndicatorResult;
            additionalProperties: {
                type: string;
                properties: {
                    status: {
                        type: string;
                    };
                };
                additionalProperties: {
                    type: string;
                };
            };
        };
        details: {
            type: string;
            example: HealthIndicatorResult;
            additionalProperties: {
                type: string;
                properties: {
                    status: {
                        type: string;
                    };
                };
                additionalProperties: {
                    type: string;
                };
            };
        };
    };
};
