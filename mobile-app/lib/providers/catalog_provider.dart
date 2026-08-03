import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_exception.dart';
import '../data/catalog_repository.dart';
import '../models/category.dart';
import '../models/product.dart';
import 'core_providers.dart';

class CatalogState {
  final List<Category> categories;
  final List<Product> products;
  final int? selectedCategoryId;
  final String search;
  final bool loading;
  final bool usingCache;
  final String? error;

  const CatalogState({
    this.categories = const [],
    this.products = const [],
    this.selectedCategoryId,
    this.search = '',
    this.loading = false,
    this.usingCache = false,
    this.error,
  });

  CatalogState copyWith({
    List<Category>? categories,
    List<Product>? products,
    int? selectedCategoryId,
    bool clearCategory = false,
    String? search,
    bool? loading,
    bool? usingCache,
    String? error,
    bool clearError = false,
  }) {
    return CatalogState(
      categories: categories ?? this.categories,
      products: products ?? this.products,
      selectedCategoryId: clearCategory
          ? null
          : (selectedCategoryId ?? this.selectedCategoryId),
      search: search ?? this.search,
      loading: loading ?? this.loading,
      usingCache: usingCache ?? this.usingCache,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(
    apiClient: ref.watch(apiClientProvider),
    cacheBox: ref.watch(catalogCacheBoxProvider),
  ),
);

final catalogControllerProvider =
    StateNotifierProvider<CatalogController, CatalogState>(
      (ref) => CatalogController(ref.watch(catalogRepositoryProvider)),
    );

class CatalogController extends StateNotifier<CatalogState> {
  final CatalogRepository _repository;

  CatalogController(this._repository) : super(const CatalogState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final categories = await _repository.fetchCategories();
      final products = await _repository.fetchProducts(
        search: state.search.isEmpty ? null : state.search,
        categoryId: state.selectedCategoryId,
      );
      state = state.copyWith(
        categories: categories,
        products: products,
        loading: false,
        usingCache: false,
      );
    } on ApiException catch (e) {
      final cachedCategories = _repository.readCachedCategories();
      final cachedProducts = _applyLocalFilter(
        _repository.readCachedProducts(),
      );
      final hasCache = cachedCategories.isNotEmpty || cachedProducts.isNotEmpty;
      state = state.copyWith(
        categories: hasCache ? cachedCategories : state.categories,
        products: hasCache ? cachedProducts : state.products,
        loading: false,
        usingCache: hasCache,
        error: hasCache ? null : e.message,
        clearError: hasCache,
      );
    }
  }

  List<Product> _applyLocalFilter(List<Product> products) {
    var filtered = products;
    if (state.selectedCategoryId != null) {
      filtered = filtered
          .where((p) => p.categoryId == state.selectedCategoryId)
          .toList();
    }
    if (state.search.isNotEmpty) {
      final q = state.search.toLowerCase();
      filtered = filtered.where((p) => p.name.toLowerCase().contains(q)).toList();
    }
    return filtered;
  }

  void setSearch(String query) {
    state = state.copyWith(search: query);
    refresh();
  }

  void selectCategory(int? categoryId) {
    state = state.copyWith(
      selectedCategoryId: categoryId,
      clearCategory: categoryId == null,
    );
    refresh();
  }
}
