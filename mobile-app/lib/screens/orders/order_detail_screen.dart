import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/formatting.dart';
import '../../models/order.dart';
import '../../providers/orders_provider.dart';

// Req 13: order-detail screen showing current status.
class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  late Future<Order> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(ordersRepositoryProvider).getOrder(widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order detail')),
      body: FutureBuilder<Order>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            final message = snapshot.error is ApiException
                ? (snapshot.error as ApiException).message
                : 'Could not load this order.';
            return Center(child: Text(message, textAlign: TextAlign.center));
          }
          final order = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Order #${order.id.substring(0, 8)}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Chip(label: Text(order.status.label)),
              const SizedBox(height: 16),
              const Text('Items', style: TextStyle(fontWeight: FontWeight.w600)),
              const Divider(),
              for (final item in order.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${item.quantity} x product #${item.productId.substring(0, 8)}',
                        ),
                      ),
                      Text(formatTzs(item.subtotal)),
                    ],
                  ),
                ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Delivery fee'),
                  Text(formatTzs(order.deliveryFee)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    formatTzs(order.totalAmount),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Placed ${order.createdAt.toLocal()}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          );
        },
      ),
    );
  }
}
