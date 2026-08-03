import 'dart:convert';

import 'package:hive/hive.dart';

import '../core/api_client.dart';
import '../models/category.dart';
import '../models/product.dart';

// Req 3, 7: public catalog reads, with the last successful fetch cached to
// Hive so browsing keeps working offline (specs/mobile-app/design.md
// "Offline Handling"). No JWT required — these are public endpoints.
class CatalogRepository {
  static const _productsKey = 'products';
  static const _categoriesKey = 'categories';

  final ApiClient apiClient;
  final Box<String> cacheBox;

  CatalogRepository({required this.apiClient, required this.cacheBox});

  Future<List<Category>> fetchCategories() async {
    final response = await apiClient.get('/categories') as List<dynamic>;
    final categories = response
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList();
    await cacheBox.put(
      _categoriesKey,
      jsonEncode(categories.map((c) => c.toJson()).toList()),
    );
    return categories;
  }

  List<Category> readCachedCategories() {
    final raw = cacheBox.get(_categoriesKey);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> fetchProducts({String? search, int? categoryId}) async {
    final query = <String, String>{
      'pageSize': '100',
      if (search != null && search.isNotEmpty) 'search': search,
      if (categoryId != null) 'category_id': categoryId.toString(),
    };
    final response = await apiClient.get('/products', query: query)
        as Map<String, dynamic>;
    final data = response['data'] as List<dynamic>;
    final products = data
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();

    // Only cache the unfiltered listing — that's the one used as the offline
    // fallback for browsing, per design.md.
    if (search == null && categoryId == null) {
      await cacheBox.put(
        _productsKey,
        jsonEncode(products.map((p) => p.toJson()).toList()),
      );
    }
    return products;
  }

  List<Product> readCachedProducts() {
    final raw = cacheBox.get(_productsKey);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }
}
