import 'package:intl/intl.dart';

// All monetary amounts are TZS with no decimal subunit conversion, per
// specs/constitution.md Req 5 (Currency).
final _tzsFormat = NumberFormat.currency(
  locale: 'en_US',
  symbol: 'TZS ',
  decimalDigits: 0,
);

String formatTzs(num amount) => _tzsFormat.format(amount);
