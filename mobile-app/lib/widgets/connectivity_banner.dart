import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/core_providers.dart';

// Req 7: indicates stale/offline data while still letting the user browse.
class ConnectivityBanner extends ConsumerWidget {
  final bool usingCache;

  const ConnectivityBanner({super.key, this.usingCache = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider).value ?? true;
    if (isOnline && !usingCache) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: Colors.amber.shade700,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Text(
        isOnline
            ? 'Showing recently loaded results.'
            : "You're offline — showing previously loaded products.",
        style: const TextStyle(color: Colors.black87, fontSize: 12),
        textAlign: TextAlign.center,
      ),
    );
  }
}
