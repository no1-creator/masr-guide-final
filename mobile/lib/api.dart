import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => 'ApiException($status): $message';
}

/// Thin REST client for the Masr Guide backend.
/// Sends `Authorization: Bearer <token>` exactly like the web app.
class ApiClient {
  String? token;
  ApiClient({this.token});

  String get _base => Config.apiBase.endsWith('/')
      ? Config.apiBase.substring(0, Config.apiBase.length - 1)
      : Config.apiBase;

  Map<String, String> _headers() => {
        'Content-Type': 'application/json',
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final q = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && '$v'.isNotEmpty) q[k] = '$v';
    });
    return Uri.parse('$_base$path').replace(queryParameters: q.isEmpty ? null : q);
  }

  dynamic _decode(http.Response r) {
    final body = r.body.isEmpty ? null : jsonDecode(r.body);
    if (r.statusCode >= 200 && r.statusCode < 300) return body;
    final msg = (body is Map && body['error'] != null) ? '${body['error']}' : 'HTTP ${r.statusCode}';
    throw ApiException(r.statusCode, msg);
  }

  Future<dynamic> get(String path, [Map<String, dynamic>? query]) async =>
      _decode(await http.get(_uri(path, query), headers: _headers()));

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async =>
      _decode(await http.post(_uri(path), headers: _headers(), body: jsonEncode(body ?? {})));

  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async =>
      _decode(await http.put(_uri(path), headers: _headers(), body: jsonEncode(body ?? {})));

  Future<dynamic> delete(String path) async =>
      _decode(await http.delete(_uri(path), headers: _headers()));

  // ---- Endpoints (same as the web control panel / API) ----
  Future<List> categories() async => await get('/api/categories') as List;
  Future<List> banners({bool all = false}) async => await get('/api/banners', {if (all) 'all': '1'}) as List;
  Future<List> services({String? cat, String? q, String? city, String? sort, bool featured = false}) async =>
      await get('/api/services', {
        'cat': cat,
        'q': q,
        'city': city,
        'sort': sort,
        if (featured) 'featured': '1',
      }) as List;
  Future<Map<String, dynamic>> service(int id) async =>
      Map<String, dynamic>.from(await get('/api/services/$id') as Map);
  Future<List> reviews(int serviceId) async => await get('/api/reviews', {'service_id': serviceId}) as List;

  Future<Map<String, dynamic>> login(String email, String password) async =>
      Map<String, dynamic>.from(await post('/api/auth/login', {'email': email, 'password': password}) as Map);
  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await post('/api/auth/register', data) as Map);

  // ---- New: phone OTP + social sign-in ----
  Future<Map<String, dynamic>> otpRequest(String phone) async =>
      Map<String, dynamic>.from(await post('/api/auth/otp/request', {'phone': phone}) as Map);
  Future<Map<String, dynamic>> otpVerify(String phone, String code, {String? name}) async =>
      Map<String, dynamic>.from(await post('/api/auth/otp/verify', {
        'phone': phone,
        'code': code,
        if (name != null && name.isNotEmpty) 'name': name,
      }) as Map);
  Future<Map<String, dynamic>> googleAuth(String idToken) async =>
      Map<String, dynamic>.from(await post('/api/auth/google', {'id_token': idToken}) as Map);
  Future<Map<String, dynamic>> appleAuth(String identityToken, {String? name}) async =>
      Map<String, dynamic>.from(await post('/api/auth/apple', {
        'identity_token': identityToken,
        if (name != null && name.isNotEmpty) 'name': name,
      }) as Map);

  Future<List> bookings() async => await get('/api/bookings') as List;
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> data) async =>
      Map<String, dynamic>.from(await post('/api/bookings', data) as Map);

  Future<Map<String, dynamic>> walletMe() async =>
      Map<String, dynamic>.from(await get('/api/wallets/me') as Map);
  Future<Map<String, dynamic>> affiliateMe() async =>
      Map<String, dynamic>.from(await get('/api/affiliates/me') as Map);
  Future<Map<String, dynamic>> adminOverview() async =>
      Map<String, dynamic>.from(await get('/api/admin/overview') as Map);
  Future<Map<String, dynamic>> vendorMe() async =>
      Map<String, dynamic>.from(await get('/api/vendors/me') as Map);
}
