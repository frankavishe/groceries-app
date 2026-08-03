import 'product.dart';

// Persisted to Hive as {productId, quantity, priceSnapshot} per
// specs/mobile-app/design.md's CartBox description. name/unit/imageUrl are
// carried along too so the cart can render fully offline without a fresh
// product fetch — price/stock is still always re-verified server-side at
// checkout (Req 8), never trusted from this snapshot.
class CartItem {
  final String productId;
  final String name;
  final String unit;
  final String? imageUrl;
  final double priceSnapshot;
  final int quantity;

  const CartItem({
    required this.productId,
    required this.name,
    required this.unit,
    required this.imageUrl,
    required this.priceSnapshot,
    required this.quantity,
  });

  factory CartItem.fromProduct(Product product, {int quantity = 1}) =>
      CartItem(
        productId: product.id,
        name: product.name,
        unit: product.unit,
        imageUrl: product.imageUrl,
        priceSnapshot: product.price,
        quantity: quantity,
      );

  CartItem copyWith({int? quantity}) => CartItem(
    productId: productId,
    name: name,
    unit: unit,
    imageUrl: imageUrl,
    priceSnapshot: priceSnapshot,
    quantity: quantity ?? this.quantity,
  );

  double get subtotal => priceSnapshot * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    productId: json['productId'] as String,
    name: json['name'] as String,
    unit: json['unit'] as String,
    imageUrl: json['imageUrl'] as String?,
    priceSnapshot: (json['priceSnapshot'] as num).toDouble(),
    quantity: json['quantity'] as int,
  );

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'name': name,
    'unit': unit,
    'imageUrl': imageUrl,
    'priceSnapshot': priceSnapshot,
    'quantity': quantity,
  };
}
