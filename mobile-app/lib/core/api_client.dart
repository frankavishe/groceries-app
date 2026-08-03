import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'config.dart';
import 'secure_storage.dart';

// Thin JSON/JWT wrapper around http.Client, shared by every repository.
// Every mobile-app request hits the NestJS API directly (Android emulator via
// 10.0.2.2, see config.dart) — no server-side proxy like admin-web has.
class ApiClient {
  final String baseUrl;
  final SecureStorage secureStorage;

  ApiClient({String? baseUrl, required this.secureStorage})
    : baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, {Object? body}) =>
      _send('POST', path, body: body);

  Future<dynamic> patch(String path, {Object? body}) =>
      _send('PATCH', path, body: body);

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
  }) async {
    var uri = Uri.parse('$baseUrl$path');
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(queryParameters: query);
    }

    final token = await secureStorage.readToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
          break;
        case 'PATCH':
          response = await http.patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          );
          break;
        default:
          throw UnsupportedError('Unsupported method $method');
      }
    } on SocketException {
      throw ApiException.network();
    } on HttpException {
      throw ApiException.network();
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }
    throw ApiException.fromResponse(response);
  }
}
