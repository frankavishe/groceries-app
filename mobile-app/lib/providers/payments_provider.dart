import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/payments_repository.dart';
import 'core_providers.dart';

final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(apiClient: ref.watch(apiClientProvider)),
);
