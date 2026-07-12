import 'dart:convert';
import 'package:flutter/foundation.dart' hide Category;
import 'api.dart';
import 'models.dart';

enum Sort { relevance, priceAsc, priceDesc, rating, newest }

extension SortParam on Sort {
  String? get param => switch (this) {
        Sort.relevance => null,
        Sort.priceAsc => 'price_asc',
        Sort.priceDesc => 'price_desc',
        Sort.rating => 'rating',
        Sort.newest => 'newest',
      };
  String get label => switch (this) {
        Sort.relevance => 'Recommended',
        Sort.priceAsc => 'Price: Low to High',
        Sort.priceDesc => 'Price: High to Low',
        Sort.rating => 'Top rated',
        Sort.newest => 'Newest',
      };
}

class AppState extends ChangeNotifier {
  final ApiClient api = ApiClient();

  bool bootLoading = true;
  String? bootError;

  List<Category> categories = [];
  List<Banner> banners = [];
  List<Service> services = [];
  bool servicesLoading = false;
  String? servicesError;

  String selectedCat = 'all';
  String query = '';
  Sort sort = Sort.relevance;

  AppUser? user;
  String? token;
  bool get isLoggedIn => user != null;

  Future<void> boot() async {
    bootLoading = true;
    bootError = null;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      token = prefs.getString('token');
      final u = prefs.getString('user');
      if (token != null && u != null) {
        api.token = token;
        user = AppUser.fromJson(Map<String, dynamic>.from(jsonDecode(u)));
      }
      final results = await Future.wait([api.categories(), api.banners()]);
      categories = (results[0]).map((e) => Category.fromJson(Map<String, dynamic>.from(e))).toList();
      banners = (results[1]).map((e) => Banner.fromJson(Map<String, dynamic>.from(e))).toList();
      await loadServices();
    } catch (e) {
      bootError = '$e';
    } finally {
      bootLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadServices() async {
    servicesLoading = true;
    servicesError = null;
    notifyListeners();
    try {
      final list = await api.services(
        cat: selectedCat == 'all' ? null : selectedCat,
        q: query.isEmpty ? null : query,
        sort: sort.param,
      );
      services = list.map((e) => Service.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      servicesError = '$e';
      services = [];
    } finally {
      servicesLoading = false;
      notifyListeners();
    }
  }

  void setCategory(String key) {
    selectedCat = key;
    loadServices();
  }

  void setQuery(String q) {
    query = q;
    loadServices();
  }

  void setSort(Sort s) {
    sort = s;
    loadServices();
  }

  Future<Map<String, dynamic>> serviceDetail(int id) => api.service(id);
  Future<List<Review>> reviews(int id) async =>
      (await api.reviews(id)).map((e) => Review.fromJson(Map<String, dynamic>.from(e))).toList();

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (token != null) await prefs.setString('token', token!);
    if (user != null) await prefs.setString('user', jsonEncode(user!.toJson()));
  }

  Future<void> login(String email, String password) async {
    final res = await api.login(email, password);
    token = '${res['token']}';
    api.token = token;
    user = AppUser.fromJson(Map<String, dynamic>.from(res['user']));
    await _persist();
    notifyListeners();
  }

  Future<void> register(String name, String email, String password, String role) async {
    final res = await api.register({'name': name, 'email': email, 'password': password, 'role': role});
    token = '${res['token']}';
    api.token = token;
    user = AppUser.fromJson(Map<String, dynamic>.from(res['user']));
    await _persist();
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    token = null;
    user = null;
    api.token = null;
    notifyListeners();
  }

  Future<Booking> book({required int serviceId, required String date, int pax = 1, String? name, String? phone}) async {
    final res = await api.createBooking({
      'service_id': serviceId,
      'date': date,
      'pax': pax,
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
    });
    return Booking.fromJson(res);
  }

  Future<List<Booking>> myBookings() async =>
      (await api.bookings()).map((e) => Booking.fromJson(Map<String, dynamic>.from(e))).toList();
  Future<Wallet> wallet() async => Wallet.fromJson(await api.walletMe());
  Future<Map<String, dynamic>> affiliate() async => api.affiliateMe();
  Future<Map<String, dynamic>> adminOverview() async => api.adminOverview();

  Category? catByKey(String key) {
    for (final c in categories) {
      if (c.key == key) return c;
    }
    return null;
  }
}
