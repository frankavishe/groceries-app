// Mirrors backend/src/payments/payments.mapper.ts's PublicPaymentTransaction.
enum PaymentStatus { initiated, pending, successful, failed }

PaymentStatus paymentStatusFromString(String value) {
  switch (value) {
    case 'INITIATED':
      return PaymentStatus.initiated;
    case 'PENDING':
      return PaymentStatus.pending;
    case 'SUCCESSFUL':
      return PaymentStatus.successful;
    case 'FAILED':
      return PaymentStatus.failed;
    default:
      throw ArgumentError('Unknown payment status: $value');
  }
}

class PaymentTransaction {
  final String id;
  final String orderId;
  final String provider;
  final PaymentStatus status;

  const PaymentTransaction({
    required this.id,
    required this.orderId,
    required this.provider,
    required this.status,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) =>
      PaymentTransaction(
        id: json['id'] as String,
        orderId: json['order_id'] as String,
        provider: json['provider'] as String,
        status: paymentStatusFromString(json['status'] as String),
      );
}
