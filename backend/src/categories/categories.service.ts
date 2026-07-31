import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UPLOAD_SERVICE } from '../uploads/upload.port';
import type { UploadPort } from '../uploads/upload.port';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @Inject(UPLOAD_SERVICE) private readonly uploadService: UploadPort,
  ) {}

  findAllActive(): Promise<Category[]> {
    return this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOneOrFail(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create({
      name: dto.name,
      iconUrl: dto.icon_url ?? null,
    });
    return this.categoriesRepository.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOneOrFail(id);
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.icon_url !== undefined) category.iconUrl = dto.icon_url;
    if (dto.is_active !== undefined) category.isActive = dto.is_active;
    return this.categoriesRepository.save(category);
  }

  async uploadIcon(
    id: number,
    file: { buffer: Buffer; mimeType: string },
  ): Promise<Category> {
    const category = await this.findOneOrFail(id);
    const url = await this.uploadService.upload(file, `categories/${id}`);
    category.iconUrl = url;
    return this.categoriesRepository.save(category);
  }
}
