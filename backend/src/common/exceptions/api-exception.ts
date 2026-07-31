import { HttpException, HttpStatus } from '@nestjs/common';

// Machine-readable `error` codes so mobile/admin clients can branch on
// failure reason instead of parsing `message` text (see specs/auth/design.md).
export class ApiException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ statusCode: status, error: code, message }, status);
  }
}
