import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsModule } from '../uploads/uploads.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), UploadsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
