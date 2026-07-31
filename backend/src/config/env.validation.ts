import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  JWT_SECRET: Joi.string().required(),
  // Seconds. Default 86400 = 24h (see ISSUE-009 — confirm before Phase 11 hardening).
  JWT_ACCESS_TOKEN_TTL: Joi.number().default(86400),

  // Not yet required — wired up in later phases (auth/OTP, image upload, payments).
  AFRICAS_TALKING_USERNAME: Joi.string().allow('').optional(),
  AFRICAS_TALKING_API_KEY: Joi.string().allow('').optional(),
  AWS_REGION: Joi.string().allow('').optional(),
  AWS_S3_BUCKET: Joi.string().allow('').optional(),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
  MPESA_API_KEY: Joi.string().allow('').optional(),
  MIXX_YAS_API_KEY: Joi.string().allow('').optional(),
  AIRTEL_MONEY_API_KEY: Joi.string().allow('').optional(),
});
