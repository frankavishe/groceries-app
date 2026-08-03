import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/catalog_provider.dart';
import '../../widgets/connectivity_banner.dart';
import '../../widgets/logout_button.dart';
import '../../widgets/product_card.dart';

// Req 3-5, 7: search bar (debounced), category filter chips, product grid,
// offline browsing off the cached catalog.
class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  // Req 4: query on typing, but debounced rather than on every keystroke.
  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      ref.read(catalogControllerProvider.notifier).setSearch(value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(catalogControllerProvider);
    final controller = ref.read(catalogControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Groceries'),
        actions: const [LogoutButton()],
      ),
      body: Column(
        children: [
          ConnectivityBanner(usingCache: state.usingCache),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search products',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: const Text('All'),
                    selected: state.selectedCategoryId == null,
                    onSelected: (_) => controller.selectCategory(null),
                  ),
                ),
                for (final category in state.categories)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(category.name),
                      selected: state.selectedCategoryId == category.id,
                      onSelected: (_) => controller.selectCategory(category.id),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.refresh,
              child: _buildBody(state),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(CatalogState state) {
    if (state.loading && state.products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.error != null && state.products.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 80),
          Icon(Icons.error_outline, size: 48, color: Colors.grey.shade500),
          const SizedBox(height: 12),
          Center(child: Text(state.error!, textAlign: TextAlign.center)),
        ],
      );
    }
    if (state.products.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 80),
          Center(child: Text('No products found.')),
        ],
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.68,
      ),
      itemCount: state.products.length,
      itemBuilder: (context, index) => ProductCard(product: state.products[index]),
    );
  }
}
