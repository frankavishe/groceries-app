import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UPLOAD_SERVICE } from '../uploads/upload.port';
import type { UploadPort } from '../uploads/upload.port';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PublicProduct, toPublicProduct } from './products.mapper';

export interface PaginatedProducts {
  data: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @Inject(UPLOAD_SERVICE) private readonly uploadService: UploadPort,
  ) {}

  async findAll(query: QueryProductsDto): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .where('product.is_available = true');

    if (query.search) {
      qb.andWhere('product.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.category_id !== undefined) {
      qb.andWhere('product.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    qb.orderBy('product.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map(toPublicProduct),
      total,
      page,
      pageSize,
    };
  }

  // Admin-only counterpart to findAll: the public listing filters out
  // is_available=false products (storefront rule), but the admin management
  // view (specs/admin-web/requirements.md Req 4) needs to see and re-activate
  // deactivated products too — see specs/admin-web/design.md's extension note.
  async findAllForAdmin(query: QueryProductsDto): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.productsRepository.createQueryBuilder('product');

    if (query.search) {
      qb.andWhere('product.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.category_id !== undefined) {
      qb.andWhere('product.category_id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    qb.orderBy('product.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map(toPublicProduct),
      total,
      page,
      pageSize,
    };
  }

  async findOneOrFail(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      unit: dto.unit,
      categoryId: dto.category_id ?? null,
      stockQuantity: dto.stock_quantity ?? 0,
    });
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneOrFail(id);
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.unit !== undefined) product.unit = dto.unit;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id;
    if (dto.stock_quantity !== undefined)
      product.stockQuantity = dto.stock_quantity;
    if (dto.is_available !== undefined) product.isAvailable = dto.is_available;
    return this.productsRepository.save(product);
  }

  findLowStock(threshold: number): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.is_available = true')
      .andWhere('product.stock_quantity <= :threshold', { threshold })
      .orderBy('product.stock_quantity', 'ASC')
      .getMany();
  }

  async uploadImage(
    id: string,
    file: { buffer: Buffer; mimeType: string },
  ): Promise<Product> {
    const product = await this.findOneOrFail(id);
    const url = await this.uploadService.upload(file, `products/${id}`);
    product.imageUrl = url;
    return this.productsRepository.save(product);
  }
}
