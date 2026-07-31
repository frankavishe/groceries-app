import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  icon_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
