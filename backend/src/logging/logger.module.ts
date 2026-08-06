import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

// specs/hardening/design.md's Structured Logging section (Req 5-6).
//
// Uses `forRootAsync` (not `forRoot`) so the config below — which reads
// `process.env.NODE_ENV` — only runs inside the deferred `useFactory`
// closure, not at this file's import/class-decoration time. Reading
// `process.env` directly at decoration time would race ConfigModule's
// dotenv loading, the same class of bug already documented in
// `src/realtime/orders.gateway.ts`'s CORS comment (`ADMIN_WEB_ORIGIN`).
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          // Silent under Jest (NODE_ENV=test, set automatically by the Jest
          // CLI) so e2e test output isn't drowned in request logs.
          level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
          // Pretty-printed locally; plain JSON otherwise (production's
          // CloudWatch Logs target, per specs/hardening/design.md's AWS
          // Deploy IaC section, parses JSON lines, not pretty output).
          transport:
            process.env.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          // Req 6: redacts the JWT (Authorization header, used by every
          // authenticated route), the admin-web session cookie,
          // RegisterDto/LoginDto's `password`, and VerifyOtpDto's `code`
          // (the OTP itself) from every request/response log line. Does
          // NOT touch auth/otp/console-otp-sender.ts, which intentionally
          // logs the OTP to the console in local dev — that's a different,
          // dev-only logger.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.code',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
