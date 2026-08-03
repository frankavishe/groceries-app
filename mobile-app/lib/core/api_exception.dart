import 'dart:convert';
import 'package:http/http.dart' as http;

// Mirrors backend/src/common/exceptions/api-exception.ts's response shape
// ({statusCode, error, message, details?}) so screens can branch on the
// machine-readable `error` code instead of parsing `message` text.
class ApiException implements Exception {
  final int statusCode;
  final String error;
  final String message;
  final dynamic details;

  ApiException({
    required this.statusCode,
    required this.error,
    required this.message,
    this.details,
  });

  factory ApiException.network() => ApiException(
    statusCode: 0,
    error: 'NETWORK_ERROR',
    message: 'No connection to the server. Check your network and try again.',
  );

  factory ApiException.fromResponse(http.Response response) {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return ApiException(
        statusCode: response.statusCode,
        error: (body['error'] as String?) ?? 'UNKNOWN_ERROR',
        message: (body['message'] as String?) ?? 'Something went wrong.',
        details: body['details'],
      );
    } catch (_) {
      return ApiException(
        statusCode: response.statusCode,
        error: 'UNKNOWN_ERROR',
        message: response.body.isNotEmpty
            ? response.body
            : 'Something went wrong.',
      );
    }
  }

  @override
  String toString() => 'ApiException($statusCode, $error, $message)';
}
