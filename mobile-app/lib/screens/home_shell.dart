import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/cart_provider.dart';
import 'cart/cart_screen.dart';
import 'catalog/catalog_screen.dart';
import 'orders/order_history_screen.dart';

// Root screen after login: bottom-nav shell over Catalog / Cart / Orders.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _screens = [CatalogScreen(), CartScreen(), OrderHistoryScreen()];

  @override
  Widget build(BuildContext context) {
    final itemCount = ref.watch(
      cartControllerProvider.select(
        (items) => items.fold<int>(0, (sum, i) => sum + i.quantity),
      ),
    );

    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'Shop',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('$itemCount'),
              isLabelVisible: itemCount > 0,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: const Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
        ],
      ),
    );
  }
}
