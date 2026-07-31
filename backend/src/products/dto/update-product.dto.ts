import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  unit?: string;

  @IsOptional()
  @IsInt()
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock_quantity?: number;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}
