import '../core/api_client.dart';
import '../models/cart_item.dart';
import '../models/order.dart';

class OrdersRepository {
  final ApiClient apiClient;

  OrdersRepository({required this.apiClient});

  // Req 9: server re-derives price/stock from the DB — the cart's
  // priceSnapshot is never sent, only product_id + quantity.
  Future<Order> createOrder(List<CartItem> items) async {
    final response =
        await apiClient.post(
              '/orders',
              body: {
                'items': items
                    .map(
                      (i) => {
                        'product_id': i.productId,
                        'quantity': i.quantity,
                      },
                    )
                    .toList(),
              },
            )
            as Map<String, dynamic>;
    return Order.fromJson(response);
  }

  // M6 stub payment (see backend/src/orders/orders.service.ts
  // initiateStubPayment) — not the real payments engine.
  Future<Order> initiateStubPayment(String orderId) async {
    final response =
        await apiClient.post('/orders/$orderId/stub-pay') as Map<String, dynamic>;
    return Order.fromJson(response);
  }

  Future<Order> getOrder(String orderId) async {
    final response = await apiClient.get('/orders/$orderId') as Map<String, dynamic>;
    return Order.fromJson(response);
  }

  Future<List<Order>> listOrders() async {
    final response = await apiClient.get('/orders') as Map<String, dynamic>;
    final data = response['data'] as List<dynamic>;
    return data.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }
}
