import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../models/order.dart';
import '../../providers/cart_provider.dart';
import '../../providers/orders_provider.dart';
import 'order_confirmation_screen.dart';

enum _PendingUiState { waiting, timedOut, cancelled, error }

// Req 11-12: polls GET /orders/:id every 3s for up to 2 minutes. On timeout,
// this is NOT treated as failure — an MNO callback (or, here, the stub's
// delayed settlement) can still arrive after the client gives up, per
// specs/mobile-app/design.md "Payments UX".
class PaymentPendingScreen extends ConsumerStatefulWidget {
  final String orderId;

  const PaymentPendingScreen({super.key, required this.orderId});

  @override
  ConsumerState<PaymentPendingScreen> createState() => _PaymentPendingScreenState();
}

class _PaymentPendingScreenState extends ConsumerState<PaymentPendingScreen> {
  static const _pollInterval = Duration(seconds: 3);
  static const _timeout = Duration(minutes: 2);

  Timer? _poller;
  int _elapsedSeconds = 0;
  _PendingUiState _uiState = _PendingUiState.waiting;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  @override
  void dispose() {
    _poller?.cancel();
    super.dispose();
  }

  void _startPolling() {
    setState(() {
      _uiState = _PendingUiState.waiting;
      _error = null;
    });
    _elapsedSeconds = 0;
    _poller?.cancel();
    _poller = Timer.periodic(_pollInterval, (_) => _poll());
  }

  Future<void> _poll() async {
    _elapsedSeconds += _pollInterval.inSeconds;
    try {
      final order = await ref.read(ordersRepositoryProvider).getOrder(widget.orderId);
      if (!mounted) return;

      if (order.status == OrderStatus.paid) {
        _poller?.cancel();
        await ref.read(cartControllerProvider.notifier).clear();
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => OrderConfirmationScreen(order: order)),
        );
        return;
      }

      if (order.status == OrderStatus.cancelled) {
        _poller?.cancel();
        if (mounted) setState(() => _uiState = _PendingUiState.cancelled);
        return;
      }

      if (_elapsedSeconds >= _timeout.inSeconds) {
        _poller?.cancel();
        if (mounted) setState(() => _uiState = _PendingUiState.timedOut);
      }
    } on ApiException catch (e) {
      // Transient network hiccups don't end the wait early; only give up
      // once the overall timeout is reached.
      if (_elapsedSeconds >= _timeout.inSeconds) {
        _poller?.cancel();
        if (mounted) {
          setState(() {
            _uiState = _PendingUiState.error;
            _error = e.message;
          });
        }
      }
    }
  }

  // Req 12: retry re-initiates payment for the same still-PENDING order
  // without creating a new order (no re-reserving stock).
  Future<void> _retry() async {
    setState(() {
      _uiState = _PendingUiState.waiting;
      _error = null;
    });
    try {
      await ref.read(ordersRepositoryProvider).initiateStubPayment(widget.orderId);
      _startPolling();
    } on ApiException catch (e) {
      setState(() {
        _uiState = _PendingUiState.error;
        _error = e.message;
      });
    }
  }

  void _backToShopping() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: _buildContent(context),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildContent(BuildContext context) {
    switch (_uiState) {
      case _PendingUiState.waiting:
        return const [
          CircularProgressIndicator(),
          SizedBox(height: 24),
          Text(
            'Waiting for payment confirmation on your phone...',
            textAlign: TextAlign.center,
          ),
        ];
      case _PendingUiState.timedOut:
        return [
          const Icon(Icons.hourglass_empty, size: 48),
          const SizedBox(height: 16),
          const Text(
            "This is taking longer than expected. Your payment may still go "
            'through — check Order History shortly, or try again.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          FilledButton(onPressed: _retry, child: const Text('Try again')),
          const SizedBox(height: 8),
          TextButton(onPressed: _backToShopping, child: const Text('Back to shopping')),
        ];
      case _PendingUiState.cancelled:
        return [
          const Icon(Icons.cancel_outlined, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          const Text('This order was cancelled and its stock released.', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          FilledButton(onPressed: _backToShopping, child: const Text('Back to shopping')),
        ];
      case _PendingUiState.error:
        return [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(_error ?? 'Something went wrong.', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          FilledButton(onPressed: _retry, child: const Text('Try again')),
        ];
    }
  }
}
