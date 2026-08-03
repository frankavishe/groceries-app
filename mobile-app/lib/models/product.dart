// Mirrors backend/src/products/products.mapper.ts's PublicProduct.
class Product {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String unit;
  final int stockQuantity;
  final bool inStock;
  final String? imageUrl;
  final int? categoryId;
  final bool isAvailable;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.unit,
    required this.stockQuantity,
    required this.inStock,
    required this.imageUrl,
    required this.categoryId,
    required this.isAvailable,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    price: (json['price'] as num).toDouble(),
    unit: json['unit'] as String,
    stockQuantity: json['stock_quantity'] as int,
    inStock: json['in_stock'] as bool,
    imageUrl: json['image_url'] as String?,
    categoryId: json['category_id'] as int?,
    isAvailable: json['is_available'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'price': price,
    'unit': unit,
    'stock_quantity': stockQuantity,
    'in_stock': inStock,
    'image_url': imageUrl,
    'category_id': categoryId,
    'is_available': isAvailable,
  };
}
