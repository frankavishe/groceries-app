import 'package:flutter/material.dart';

import '../../core/formatting.dart';
import '../../models/order.dart';
import '../orders/order_detail_screen.dart';

// Req 12: shown once payment succeeds and the cart has been cleared.
class OrderConfirmationScreen extends StatelessWidget {
  final Order order;

  const OrderConfirmationScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order confirmed'), automaticallyImplyLeading: false),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 64),
              const SizedBox(height: 16),
              const Text(
                'Payment successful!',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text('Order #${order.id.substring(0, 8)}'),
              Text(
                'Total: ${formatTzs(order.totalAmount)}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => OrderDetailScreen(orderId: order.id),
                  ),
                ),
                child: const Text('View order'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('Back to shopping'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
