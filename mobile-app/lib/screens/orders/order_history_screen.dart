import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/formatting.dart';
import '../../models/order.dart';
import '../../providers/orders_provider.dart';
import '../../widgets/logout_button.dart';
import 'order_detail_screen.dart';

// Req 13: order-history screen backed by GET /orders.
class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  late Future<List<Order>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(ordersRepositoryProvider).listOrders();
  }

  Future<void> _refresh() async {
    final future = ref.read(ordersRepositoryProvider).listOrders();
    setState(() => _future = future);
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My orders'),
        actions: const [LogoutButton()],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Order>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              final message = snapshot.error is ApiException
                  ? (snapshot.error as ApiException).message
                  : 'Could not load orders.';
              return ListView(
                children: [
                  const SizedBox(height: 80),
                  Center(child: Text(message, textAlign: TextAlign.center)),
                ],
              );
            }
            final orders = snapshot.data ?? [];
            if (orders.isEmpty) {
              return ListView(
                children: const [
                  SizedBox(height: 80),
                  Center(child: Text('No orders yet.')),
                ],
              );
            }
            return ListView.separated(
              itemCount: orders.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final order = orders[index];
                return ListTile(
                  title: Text('Order #${order.id.substring(0, 8)}'),
                  subtitle: Text(
                    '${order.status.label} · ${order.items.length} item(s)',
                  ),
                  trailing: Text(formatTzs(order.totalAmount)),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => OrderDetailScreen(orderId: order.id),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
