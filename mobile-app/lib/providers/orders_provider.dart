import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/orders_repository.dart';
import 'core_providers.dart';

final ordersRepositoryProvider = Provider<OrdersRepository>(
  (ref) => OrdersRepository(apiClient: ref.watch(apiClientProvider)),
);
