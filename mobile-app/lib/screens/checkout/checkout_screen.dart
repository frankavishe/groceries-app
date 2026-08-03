import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/formatting.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import 'payment_provider_select_screen.dart';

// Req 9: POST /orders with the current cart contents; 409 insufficient-stock
// is shown per-item rather than as a generic error.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _submitting = false;
  String? _error;

  Future<void> _placeOrder() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final cartItems = ref.read(cartControllerProvider);
    try {
      final order = await ref
          .read(ordersRepositoryProvider)
          .createOrder(cartItems);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => PaymentProviderSelectScreen(order: order)),
      );
    } on ApiException catch (e) {
      setState(() => _error = _describeError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _describeError(ApiException e) {
    if (e.error == 'INSUFFICIENT_STOCK') {
      final items = (e.details is Map) ? e.details['items'] as List<dynamic>? : null;
      if (items != null && items.isNotEmpty) {
        final names = items
            .map((i) => '${i['product_id']} (wanted ${i['requested']}, only ${i['available']} left)')
            .join('\n');
        return 'Some items are no longer available in the quantity you selected:\n$names';
      }
    }
    return e.message;
  }

  @override
  Widget build(BuildContext context) {
    final cartItems = ref.watch(cartControllerProvider);
    final cartController = ref.read(cartControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ListView.separated(
                itemCount: cartItems.length,
                separatorBuilder: (_, _) => const Divider(),
                itemBuilder: (context, index) {
                  final item = cartItems[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.name),
                    subtitle: Text('${item.quantity} x ${formatTzs(item.priceSnapshot)}'),
                    trailing: Text(formatTzs(item.subtotal)),
                  );
                },
              ),
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal'),
                Text(formatTzs(cartController.total)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Delivery fee is added by the server at order time.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _submitting ? null : _placeOrder,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Place order'),
            ),
          ],
        ),
      ),
    );
  }
}
