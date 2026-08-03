import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/formatting.dart';
import '../../providers/cart_provider.dart';
import '../../providers/core_providers.dart';
import '../checkout/checkout_screen.dart';

// Req 6-8: cart manipulation works fully offline; only the checkout button
// requires connectivity (Req 9 needs POST /orders).
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartControllerProvider);
    final controller = ref.read(cartControllerProvider.notifier);
    final isOnline = ref.watch(isOnlineProvider).value ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: items.isEmpty
          ? const Center(child: Text('Your cart is empty.'))
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, _) => const Divider(),
              itemBuilder: (context, index) {
                final item = items[index];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: item.imageUrl != null
                      ? Image.network(
                          item.imageUrl!,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              const Icon(Icons.shopping_basket_outlined),
                        )
                      : const Icon(Icons.shopping_basket_outlined),
                  title: Text(item.name),
                  subtitle: Text(
                    '${formatTzs(item.priceSnapshot)} / ${item.unit}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: () => controller.setQuantity(
                          item.productId,
                          item.quantity - 1,
                        ),
                      ),
                      Text('${item.quantity}'),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => controller.setQuantity(
                          item.productId,
                          item.quantity + 1,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => controller.removeProduct(item.productId),
                      ),
                    ],
                  ),
                );
              },
            ),
      bottomNavigationBar: items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isOnline)
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text(
                          'Checkout needs a connection. Reconnect to continue.',
                          style: TextStyle(color: Colors.red, fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          formatTzs(controller.total),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: !isOnline
                            ? null
                            : () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const CheckoutScreen(),
                                ),
                              ),
                        child: const Text('Proceed to checkout'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
