import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class QueryOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  // Not in the spec PDF's field list — needed by
  // specs/admin-web/requirements.md Req 6 (order list filterable by status).
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
