import 'dart:convert';
import 'package:flutter/foundation.dart' hide Category;
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'models.dart';
import 'defaults.dart';

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

  // Built-in default catalog so the UI is always full - even offline.
  // Live data from the backend/dashboard overrides it when reachable.
  List<Category> categories =
      defaultCategories.map((e) => Category.fromJson(Map<String, dynamic>.from(e))).toList();
  List<Banner> banners =
      defaultBanners.map((e) => Banner.fromJson(Map<String, dynamic>.from(e))).toList();
  List<Service> services =
      defaultServices.map((e) => Service.fromJson(Map<String, dynamic>.from(e))).toList();
  bool servicesLoading = false;
  String? servicesError;

  // Offers = featured/highlighted services (managed from the dashboard).
  List<Service> offers = defaultServices
      .where((e) => e['featured'] == true)
      .map((e) => Service.fromJson(Map<String, dynamic>.from(e)))
      .toList();

  // Saved / wishlist service ids (persisted on device).
  Set<int> favIds = <int>{};

  bool offline = false;

  String selectedCat = 'all';
  String query = '';
  Sort sort = Sort.relevance;

  AppUser? user;
  String? token;
  bool get isLoggedIn => user != null;

  bool isFav(int id) => favIds.contains(id);

  Future<void> toggleFav(int id) async {
    if (!favIds.add(id)) favIds.remove(id);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('favs', jsonEncode(favIds.toList()));
    } catch (_) {}
    notifyListeners();
  }

  List<Service> get favoriteServices {
    final map = <int, Service>{};
    for (final e in defaultServices) {
      final s = Service.fromJson(Map<String, dynamic>.from(e));
      map[s.id] = s;
    }
    for (final s in offers) {
      map[s.id] = s;
    }
    for (final s in services) {
      map[s.id] = s;
    }
    return map.values.where((s) => favIds.contains(s.id)).toList();
  }

  Category _catFromJson(Map<String, dynamic> e) {
    final labels = e['labels'];
    final name = e['name'] ??
        (labels is Map ? labels['en'] : null) ??
        e['name_en'] ??
        e['title'] ??
        e['key'];
    return Category.fromJson({...e, 'name': name});
  }

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
      final favRaw = prefs.getString('favs');
      if (favRaw != null) {
        final list = jsonDecode(favRaw);
        if (list is List) favIds = list.map((e) => (e as num).toInt()).toSet();
      }
    } catch (_) {}
    try {
      final results = await Future.wait([api.categories(), api.banners()]);
      final cats = (results[0] as List)
          .map((e) => _catFromJson(Map<String, dynamic>.from(e)))
          .toList();
      final bans = (results[1] as List)
          .map((e) => Banner.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      if (cats.isNotEmpty) categories = cats;
      if (bans.isNotEmpty) banners = bans;
      offline = false;
      await loadServices();
    } catch (e) {
      offline = true;
      _loadDefaultServices();
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
      services = (list as List)
          .map((e) => Service.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      final f = services.where((s) => s.featured).toList();
      if (selectedCat == 'all' && f.isNotEmpty) offers = f;
      offline = false;
    } catch (e) {
      offline = true;
      _loadDefaultServices();
    } finally {
      servicesLoading = false;
      notifyListeners();
    }
  }

  void _loadDefaultServices() {
    final all = defaultServices
        .map((e) => Service.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final f = all.where((s) => s.featured).toList();
    if (f.isNotEmpty) offers = f;
    var list = List<Service>.from(all);
    if (selectedCat != 'all') {
      final cat = catByKey(selectedCat);
      list = list.where((s) => cat != null && s.categoryId == cat.id).toList();
    }
    if (query.isNotEmpty) {
      final q = query.toLowerCase();
      list = list
          .where((s) =>
              s.title.toLowerCase().contains(q) ||
              s.location.toLowerCase().contains(q) ||
              s.description.toLowerCase().contains(q))
          .toList();
    }
    switch (sort) {
      case Sort.priceAsc:
        list.sort((a, b) => a.price.compareTo(b.price));
        break;
      case Sort.priceDesc:
        list.sort((a, b) => b.price.compareTo(a.price));
        break;
      case Sort.rating:
        list.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      default:
        break;
    }
    services = list;
    servicesError = null;
    servicesLoading = false;
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

  Future<Map<String, dynamic>> serviceDetail(int id) async {
    try {
      return await api.service(id);
    } catch (e) {
      for (final s in defaultServices) {
        if (s['id'] == id) return Map<String, dynamic>.from(s);
      }
      rethrow;
    }
  }

  Future<List<Review>> reviews(int id) async {
    try {
      final list = await api.reviews(id) as List;
      return list.map((e) => Review.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      return defaultReviews
          .map((e) => Review.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (token != null) await prefs.setString('token', token!);
    if (user != null) await prefs.setString('user', jsonEncode(user!.toJson()));
  }

  void _setSession(Map<String, dynamic> res) {
  token = '${res['token']}';
  api.token = token;
  user = AppUser.fromJson(Map<String, dynamic>.from(res['user']));
}

Future<void> login(String email, String password) async {
  _setSession(await api.login(email, password));
  await _persist();
  notifyListeners();
}

Future<void> register(String name, String email, String password, String role) async {
  _setSession(await api.register({'name': name, 'email': email, 'password': password, 'role': role}));
  await _persist();
  notifyListeners();
}

// Phone + OTP
Future<Map<String, dynamic>> requestOtp(String phone) => api.otpRequest(phone);
Future<void> verifyOtp(String phone, String code, {String? name}) async {
  _setSession(await api.otpVerify(phone, code, name: name));
  await _persist();
  notifyListeners();
}

// Social sign-in
Future<void> loginWithGoogle(String idToken) async {
  _setSession(await api.googleAuth(idToken));
  await _persist();
  notifyListeners();
}

Future<void> loginWithApple(String identityToken, {String? name}) async {
  _setSession(await api.appleAuth(identityToken, name: name));
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
      (await api.bookings() as List).map((e) => Booking.fromJson(Map<String, dynamic>.from(e))).toList();
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
