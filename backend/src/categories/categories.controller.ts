import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { imageUploadOptions } from '../uploads/image-upload.options';
import { UserRole } from '../users/entities/user.entity';
import { CategoriesService } from './categories.service';
import { toPublicCategory } from './categories.mapper';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAllActive();
    return categories.map(toPublicCategory);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateCategoryDto) {
    return toPublicCategory(await this.categoriesService.create(dto));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return toPublicCategory(await this.categoriesService.update(id, dto));
  }

  // Beyond the spec PDF's fields for POST /categories — see
  // specs/categories/design.md's shared-upload note and ISSUE-014.
  @Post(':id/icon')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadIcon(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const category = await this.categoriesService.uploadIcon(id, {
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
    return toPublicCategory(category);
  }
}
