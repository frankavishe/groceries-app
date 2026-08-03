import '../core/api_client.dart';
import '../models/payment_transaction.dart';

class PaymentsRepository {
  final ApiClient apiClient;

  PaymentsRepository({required this.apiClient});

  // Req 10: provider is one of MPESA/MIXX_BY_YAS/AIRTEL_MONEY (backend enum
  // values); amount is never sent — the backend derives it from the order.
  Future<PaymentTransaction> initiatePayment({
    required String orderId,
    required String provider,
    required String phoneNumber,
  }) async {
    final response =
        await apiClient.post(
              '/payments/initiate',
              body: {
                'order_id': orderId,
                'provider': provider,
                'phone_number': phoneNumber,
              },
            )
            as Map<String, dynamic>;
    return PaymentTransaction.fromJson(response);
  }

  // Req 11: most recent payment attempt for the order.
  Future<PaymentTransaction> getPaymentStatus(String orderId) async {
    final response =
        await apiClient.get('/payments/$orderId/status') as Map<String, dynamic>;
    return PaymentTransaction.fromJson(response);
  }
}
