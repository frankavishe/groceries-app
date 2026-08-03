import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'providers/core_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  final catalogCacheBox = await Hive.openBox<String>('catalog_cache');
  final cartBox = await Hive.openBox<String>('cart');

  runApp(
    ProviderScope(
      overrides: [
        catalogCacheBoxProvider.overrideWithValue(catalogCacheBox),
        cartBoxProvider.overrideWithValue(cartBox),
      ],
      child: const GroceriesApp(),
    ),
  );
}
