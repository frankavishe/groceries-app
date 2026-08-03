// Mirrors backend/src/orders/orders.mapper.ts's PublicOrder/PublicOrderItem.
class OrderItem {
  final String productId;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  const OrderItem({
    required this.productId,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
    productId: json['product_id'] as String,
    quantity: json['quantity'] as int,
    unitPrice: (json['unit_price'] as num).toDouble(),
    subtotal: (json['subtotal'] as num).toDouble(),
  );
}

// Keep in sync with backend/src/orders/entities/order.entity.ts's OrderStatus.
enum OrderStatus { pending, paid, processing, dispatched, delivered, cancelled }

OrderStatus orderStatusFromString(String value) {
  switch (value) {
    case 'PENDING':
      return OrderStatus.pending;
    case 'PAID':
      return OrderStatus.paid;
    case 'PROCESSING':
      return OrderStatus.processing;
    case 'DISPATCHED':
      return OrderStatus.dispatched;
    case 'DELIVERED':
      return OrderStatus.delivered;
    case 'CANCELLED':
      return OrderStatus.cancelled;
    default:
      throw ArgumentError('Unknown order status: $value');
  }
}

extension OrderStatusLabel on OrderStatus {
  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.paid:
        return 'Paid';
      case OrderStatus.processing:
        return 'Processing';
      case OrderStatus.dispatched:
        return 'Dispatched';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }
}

class Order {
  final String id;
  final String? userId;
  final OrderStatus status;
  final double totalAmount;
  final double deliveryFee;
  final List<OrderItem> items;
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.userId,
    required this.status,
    required this.totalAmount,
    required this.deliveryFee,
    required this.items,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String,
    userId: json['user_id'] as String?,
    status: orderStatusFromString(json['status'] as String),
    totalAmount: (json['total_amount'] as num).toDouble(),
    deliveryFee: (json['delivery_fee'] as num).toDouble(),
    items: (json['items'] as List<dynamic>)
        .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
        .toList(),
    createdAt: DateTime.parse(json['created_at'] as String),
  );
}
