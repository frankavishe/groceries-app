import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '../common/exceptions/api-exception';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { MockMpesaAdapter } from './adapters/mpesa/mock-mpesa.adapter';
import {
  PaymentProviderAdapter,
  RawCallbackRequest,
} from './adapters/payment-provider.adapter';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentTransaction,
} from './entities/payment-transaction.entity';
import {
  PublicPaymentTransaction,
  toPublicPaymentTransaction,
} from './payments.mapper';

export interface PaginatedTransactions {
  data: PublicPaymentTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProviderSummary {
  provider: PaymentProvider;
  count: number;
  total_amount: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Req 1 / M8 scope ("one payment provider live"): only MPESA has a working
  // adapter. MIXX_BY_YAS/AIRTEL_MONEY are rejected as unsupported until M9
  // adds their adapters here, per specs/payments/tasks.md.
  private readonly adapters: Partial<
    Record<PaymentProvider, PaymentProviderAdapter>
  >;

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionsRepository: Repository<PaymentTransaction>,
    private readonly ordersService: OrdersService,
    mockMpesaAdapter: MockMpesaAdapter,
  ) {
    this.adapters = { [PaymentProvider.MPESA]: mockMpesaAdapter };
  }

  // Req 1-4: derive amount server-side, create an INITIATED row, delegate to
  // the provider adapter. A retry for the same still-PENDING order creates a
  // new row rather than reusing the failed one (Req 4) — there's no
  // dedup/upsert here by design.
  async initiate(
    user: JwtPayload,
    dto: InitiatePaymentDto,
  ): Promise<PublicPaymentTransaction> {
    const { order } = await this.ordersService.findOneForUser(
      dto.order_id,
      user,
    );

    if (order.status !== OrderStatus.PENDING) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_ORDER_STATUS',
        `Cannot initiate payment for an order in status ${order.status}.`,
      );
    }

    const adapter = this.adapters[dto.provider];
    if (!adapter) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'PROVIDER_NOT_SUPPORTED',
        `${dto.provider} is not yet available.`,
      );
    }

    let transaction = await this.transactionsRepository.save(
      this.transactionsRepository.create({
        orderId: order.id,
        provider: dto.provider,
        phoneNumber: dto.phone_number,
        amount: order.totalAmount,
        status: PaymentStatus.INITIATED,
      }),
    );

    try {
      const { checkoutRequestId, referenceId } = await adapter.initiate(
        order,
        dto.phone_number,
      );
      transaction.checkoutRequestId = checkoutRequestId;
      transaction.referenceId = referenceId;
      transaction = await this.transactionsRepository.save(transaction);
    } catch (err) {
      transaction.status = PaymentStatus.FAILED;
      await this.transactionsRepository.save(transaction);
      this.logger.error(`Adapter initiate failed for order ${order.id}`, err);
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        'PAYMENT_PROVIDER_ERROR',
        'Could not reach the payment provider. Please try again.',
      );
    }

    return toPublicPaymentTransaction(transaction);
  }

  // Req 5-10: verify before trusting, idempotent on (reference_id,
  // checkout_request_id), raw payload always stored, success cascades to
  // orders.status via OrdersService's own transition-table mechanism.
  async handleCallback(
    providerParam: string,
    request: RawCallbackRequest,
  ): Promise<{ received: true }> {
    const provider = this.resolveProviderParam(providerParam);
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new NotFoundException(`Unknown payment provider ${providerParam}`);
    }

    if (!adapter.verifyCallback(request)) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CALLBACK_SIGNATURE',
        'Callback signature verification failed.',
      );
    }

    const parsed = adapter.parseCallback(request);
    const transaction = await this.transactionsRepository.findOne({
      where: [
        { referenceId: parsed.referenceId },
        { checkoutRequestId: parsed.checkoutRequestId },
      ],
    });
    if (!transaction) {
      this.logger.warn(
        `Callback for unknown transaction (reference ${parsed.referenceId}, checkout ${parsed.checkoutRequestId})`,
      );
      throw new NotFoundException('No matching payment transaction.');
    }

    // Req 9: already-processed callbacks are acked without re-applying the
    // status cascade — MNOs retry, and a second delivery must not double-pay.
    const alreadyProcessed =
      transaction.status === PaymentStatus.SUCCESSFUL ||
      transaction.status === PaymentStatus.FAILED;
    if (alreadyProcessed) {
      transaction.responsePayload = parsed.raw;
      await this.transactionsRepository.save(transaction);
      return { received: true };
    }

    transaction.status =
      parsed.status === 'SUCCESSFUL'
        ? PaymentStatus.SUCCESSFUL
        : PaymentStatus.FAILED;
    transaction.responsePayload = parsed.raw;
    await this.transactionsRepository.save(transaction);

    if (transaction.status === PaymentStatus.SUCCESSFUL) {
      try {
        await this.ordersService.updateStatus(
          transaction.orderId,
          OrderStatus.PAID,
        );
      } catch (err) {
        // The payment itself succeeded from the provider's perspective — a
        // conflict on our side (e.g. the order was already cancelled by the
        // 20-minute expiry job before this callback arrived) is our problem
        // to reconcile manually, not something the MNO's webhook should see
        // as a failure worth retrying.
        this.logger.error(
          `Payment for order ${transaction.orderId} succeeded but the order-status cascade failed`,
          err,
        );
      }
    }

    return { received: true };
  }

  // Req 11: most recent attempt for the order, ownership-checked the same way
  // as GET /orders/:id (404 rather than 403 for a non-owner).
  async getStatus(
    orderId: string,
    user: JwtPayload,
  ): Promise<PublicPaymentTransaction> {
    await this.ordersService.findOneForUser(orderId, user);

    const transaction = await this.transactionsRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    if (!transaction) {
      throw new NotFoundException(
        `No payment attempt found for order ${orderId}`,
      );
    }
    return toPublicPaymentTransaction(transaction);
  }

  // Req 12
  async findTransactions(
    query: QueryTransactionsDto,
  ): Promise<PaginatedTransactions> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.transactionsRepository
      .createQueryBuilder('transaction')
      .orderBy('transaction.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.provider) {
      qb.andWhere('transaction.provider = :provider', {
        provider: query.provider,
      });
    }
    if (query.status) {
      qb.andWhere('transaction.status = :status', { status: query.status });
    }

    const [transactions, total] = await qb.getManyAndCount();
    return {
      data: transactions.map(toPublicPaymentTransaction),
      total,
      page,
      pageSize,
    };
  }

  // Req 13
  async getSummary(): Promise<ProviderSummary[]> {
    const rows = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .select('transaction.provider', 'provider')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total_amount')
      .groupBy('transaction.provider')
      .getRawMany<{
        provider: PaymentProvider;
        count: string;
        total_amount: string;
      }>();

    return rows.map((row) => ({
      provider: row.provider,
      count: Number(row.count),
      total_amount: Number(row.total_amount),
    }));
  }

  private resolveProviderParam(providerParam: string): PaymentProvider {
    const normalized = providerParam.toUpperCase();
    if (normalized === 'MPESA') return PaymentProvider.MPESA;
    if (normalized === 'MIXX_YAS' || normalized === 'MIXX_BY_YAS') {
      return PaymentProvider.MIXX_BY_YAS;
    }
    if (normalized === 'AIRTEL_MONEY' || normalized === 'AIRTEL') {
      return PaymentProvider.AIRTEL_MONEY;
    }
    throw new NotFoundException(`Unknown payment provider ${providerParam}`);
  }
}
