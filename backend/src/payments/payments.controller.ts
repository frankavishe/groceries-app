import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/entities/user.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  initiate(@Req() req: AuthenticatedRequest, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(req.user, dto);
  }

  // Req 5: a webhook from the MNO, not a logged-in user — no JwtAuthGuard.
  // Trust comes from adapter.verifyCallback's signature check inside the
  // service, not from our own auth layer.
  // specs/hardening/design.md's Rate Limiting section: more generous than
  // auth.controller.ts's override since legitimate MNO retries (idempotent,
  // see constitution invariant 2) must not be starved, but it's still
  // public and unauthenticated so it needs a ceiling.
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('callback/:provider')
  @HttpCode(HttpStatus.OK)
  handleCallback(@Param('provider') provider: string, @Req() req: Request) {
    return this.paymentsService.handleCallback(provider, {
      headers: req.headers,
      body: req.body,
    });
  }

  // Declared before ':orderId/status' so 'transactions'/'summary' aren't
  // swallowed as an :orderId value, same reasoning as products.controller's
  // literal-before-param route ordering.
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findTransactions(@Query() query: QueryTransactionsDto) {
    return this.paymentsService.findTransactions(query);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getSummary() {
    return this.paymentsService.getSummary();
  }

  @Get(':orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  getStatus(
    @Req() req: AuthenticatedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.paymentsService.getStatus(orderId, req.user);
  }
}
