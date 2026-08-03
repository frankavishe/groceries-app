import 'dart:convert';

import 'package:hive/hive.dart';

import '../models/cart_item.dart';

// Req 6: cart persisted to Hive so it survives app restart. Stored as a
// single JSON-encoded list under one key rather than Hive TypeAdapters — the
// cart is small and this avoids generated-code/build_runner machinery for a
// value this simple.
class CartRepository {
  static const _itemsKey = 'items';

  final Box<String> box;

  CartRepository({required this.box});

  List<CartItem> read() {
    final raw = box.get(_itemsKey);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> write(List<CartItem> items) {
    return box.put(_itemsKey, jsonEncode(items.map((e) => e.toJson()).toList()));
  }
}
