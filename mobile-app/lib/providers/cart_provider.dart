import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/cart_repository.dart';
import '../models/cart_item.dart';
import '../models/product.dart';
import 'core_providers.dart';

final cartRepositoryProvider = Provider<CartRepository>(
  (ref) => CartRepository(box: ref.watch(cartBoxProvider)),
);

final cartControllerProvider =
    StateNotifierProvider<CartController, List<CartItem>>(
      (ref) => CartController(ref.watch(cartRepositoryProvider)),
    );

// Req 6-8: every mutation persists to Hive immediately; cart manipulation
// works fully offline since it's local-only until checkout.
class CartController extends StateNotifier<List<CartItem>> {
  final CartRepository _repository;

  CartController(this._repository) : super(const []) {
    state = _repository.read();
  }

  Future<void> _persist() => _repository.write(state);

  Future<void> addProduct(Product product, {int quantity = 1}) async {
    final index = state.indexWhere((i) => i.productId == product.id);
    if (index == -1) {
      state = [...state, CartItem.fromProduct(product, quantity: quantity)];
    } else {
      final existing = state[index];
      final updated = existing.copyWith(quantity: existing.quantity + quantity);
      state = [
        for (var i = 0; i < state.length; i++) i == index ? updated : state[i],
      ];
    }
    await _persist();
  }

  Future<void> setQuantity(String productId, int quantity) async {
    if (quantity <= 0) {
      return removeProduct(productId);
    }
    state = [
      for (final item in state)
        item.productId == productId ? item.copyWith(quantity: quantity) : item,
    ];
    await _persist();
  }

  Future<void> removeProduct(String productId) async {
    state = state.where((i) => i.productId != productId).toList();
    await _persist();
  }

  Future<void> clear() async {
    state = const [];
    await _persist();
  }

  double get total => state.fold(0, (sum, item) => sum + item.subtotal);

  int get itemCount => state.fold(0, (sum, item) => sum + item.quantity);
}
