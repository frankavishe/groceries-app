import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateProductDto } from './dto/create-product.dto';
import { LowStockQueryDto } from './dto/low-stock-query.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toPublicProduct } from './products.mapper';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findLowStock(@Query() query: LowStockQueryDto) {
    const products = await this.productsService.findLowStock(
      query.threshold ?? 10,
    );
    return products.map(toPublicProduct);
  }

  // Beyond the spec PDF's endpoint list — the admin management view (Req 4)
  // needs to see deactivated (is_available=false) products too, which the
  // public GET /products intentionally excludes. See
  // specs/admin-web/design.md's extension note.
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllForAdmin(@Query() query: QueryProductsDto) {
    return this.productsService.findAllForAdmin(query);
  }

  // Also beyond the spec PDF — the admin edit view (Req 4) needs to fetch a
  // single product (incl. deactivated ones) by id; declared after the
  // 'admin'/'low-stock' literal routes above so they aren't shadowed by this
  // `:id` param route.
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return toPublicProduct(await this.productsService.findOneOrFail(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateProductDto) {
    return toPublicProduct(await this.productsService.create(dto));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return toPublicProduct(await this.productsService.update(id, dto));
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const product = await this.productsService.uploadImage(id, {
      buffer: file.buffer,
      mimeType: file.mimetype,
    });
    return toPublicProduct(product);
  }
}
