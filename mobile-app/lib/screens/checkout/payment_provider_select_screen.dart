import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../models/order.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payments_provider.dart';
import 'payment_pending_screen.dart';

// Backend enum values (backend/src/payments/entities/payment-transaction.entity.ts).
enum MobileMoneyProvider { mpesa, mixxByYas, airtelMoney }

extension on MobileMoneyProvider {
  String get label {
    switch (this) {
      case MobileMoneyProvider.mpesa:
        return 'M-Pesa';
      case MobileMoneyProvider.mixxByYas:
        return 'Mixx by Yas';
      case MobileMoneyProvider.airtelMoney:
        return 'Airtel Money';
    }
  }

  String get apiValue {
    switch (this) {
      case MobileMoneyProvider.mpesa:
        return 'MPESA';
      case MobileMoneyProvider.mixxByYas:
        return 'MIXX_BY_YAS';
      case MobileMoneyProvider.airtelMoney:
        return 'AIRTEL_MONEY';
    }
  }
}

// Req 10: select a provider + phone number, then initiate payment via
// POST /payments/initiate (specs/payments/requirements.md Req 1). Only M-Pesa
// has a working adapter as of M8 (specs/payments/design.md's Per-Provider
// Notes) — selecting Mixx by Yas/Airtel Money still submits like a real
// attempt and surfaces the backend's PROVIDER_NOT_SUPPORTED error, rather
// than hiding those options until M9.
class PaymentProviderSelectScreen extends ConsumerStatefulWidget {
  final Order order;

  const PaymentProviderSelectScreen({super.key, required this.order});

  @override
  ConsumerState<PaymentProviderSelectScreen> createState() =>
      _PaymentProviderSelectScreenState();
}

class _PaymentProviderSelectScreenState
    extends ConsumerState<PaymentProviderSelectScreen> {
  MobileMoneyProvider _provider = MobileMoneyProvider.mpesa;
  final _phoneController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).user;
    if (user != null) _phoneController.text = user.phoneNumber;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (_phoneController.text.trim().isEmpty) {
      setState(() => _error = 'Enter the phone number to receive the USSD prompt.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    final phoneNumber = _phoneController.text.trim();
    try {
      await ref.read(paymentsRepositoryProvider).initiatePayment(
        orderId: widget.order.id,
        provider: _provider.apiValue,
        phoneNumber: phoneNumber,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => PaymentPendingScreen(
            orderId: widget.order.id,
            provider: _provider.apiValue,
            phoneNumber: phoneNumber,
          ),
        ),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pay for order')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Choose a mobile money provider'),
            RadioGroup<MobileMoneyProvider>(
              groupValue: _provider,
              onChanged: (value) => setState(() => _provider = value!),
              child: Column(
                children: [
                  for (final provider in MobileMoneyProvider.values)
                    RadioListTile<MobileMoneyProvider>(
                      title: Text(provider.label),
                      value: provider,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone number to receive USSD prompt',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _submitting ? null : _pay,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Pay'),
            ),
          ],
        ),
      ),
    );
  }
}
