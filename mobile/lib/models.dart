import 'config.dart';

String _abs(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  final base = Config.apiBase.endsWith('/')
      ? Config.apiBase.substring(0, Config.apiBase.length - 1)
      : Config.apiBase;
  return path.startsWith('/') ? '$base$path' : '$base/$path';
}

num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

class Category {
  final int id;
  final String key;
  final String name;
  final String icon;
  Category({required this.id, required this.key, required this.name, required this.icon});
  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: _num(j['id']).toInt(),
        key: '${j['key'] ?? ''}',
        name: '${j['name'] ?? j['name_en'] ?? j['title'] ?? j['key'] ?? ''}',
        icon: '${j['icon'] ?? j['key'] ?? ''}',
      );
}

class Banner {
  final int id;
  final String image;
  final String title;
  final String? link;
  final int? serviceId;
  Banner({required this.id, required this.image, required this.title, this.link, this.serviceId});
  factory Banner.fromJson(Map<String, dynamic> j) => Banner(
        id: _num(j['id']).toInt(),
        image: _abs('${j['image'] ?? j['cover'] ?? j['img'] ?? ''}'),
        title: '${j['title'] ?? j['caption'] ?? ''}',
        link: j['link']?.toString(),
        serviceId: j['service_id'] == null ? null : _num(j['service_id']).toInt(),
      );
}

class Service {
  final int id;
  final int vendorId;
  final int categoryId;
  final String title;
  final String location;
  final String description;
  final num price;
  final String currency;
  final String duration;
  final num rating;
  final int reviewsCount;
  final bool featured;
  final String cancelPolicy;
  final String status;
  final String cover;
  final List<String> images;
  final Map<String, dynamic> raw;
  Service({
    required this.id,
    required this.vendorId,
    required this.categoryId,
    required this.title,
    required this.location,
    required this.description,
    required this.price,
    required this.currency,
    required this.duration,
    required this.rating,
    required this.reviewsCount,
    required this.featured,
    required this.cancelPolicy,
    required this.status,
    required this.cover,
    required this.images,
    required this.raw,
  });
  factory Service.fromJson(Map<String, dynamic> j) {
    final imgs = (j['images'] as List?)?.map((e) => _abs('$e')).where((e) => e.isNotEmpty).toList() ?? [];
    final cover = _abs('${j['cover'] ?? (imgs.isNotEmpty ? j['images'][0] : '')}');
    return Service(
      id: _num(j['id']).toInt(),
      vendorId: _num(j['vendor_id']).toInt(),
      categoryId: _num(j['category_id']).toInt(),
      title: '${j['title'] ?? ''}',
      location: '${j['location'] ?? ''}',
      description: '${j['description'] ?? ''}',
      price: _num(j['price']),
      currency: '${j['currency'] ?? 'EGP'}',
      duration: '${j['duration'] ?? ''}',
      rating: _num(j['rating']),
      reviewsCount: _num(j['reviews_count']).toInt(),
      featured: j['featured'] == true || j['featured'] == 1,
      cancelPolicy: '${j['cancel_policy'] ?? ''}',
      status: '${j['status'] ?? ''}',
      cover: cover,
      images: imgs.isNotEmpty ? imgs : (cover.isNotEmpty ? [cover] : []),
      raw: j,
    );
  }
}

class Review {
  final String author;
  final num rating;
  final String comment;
  final String date;
  Review({required this.author, required this.rating, required this.comment, required this.date});
  factory Review.fromJson(Map<String, dynamic> j) => Review(
        author: '${j['author'] ?? j['name'] ?? 'Guest'}',
        rating: _num(j['rating']),
        comment: '${j['comment'] ?? j['text'] ?? ''}',
        date: '${j['created_at'] ?? j['date'] ?? ''}',
      );
}

class AppUser {
  final int id;
  final String name;
  final String email;
  final String role;
  AppUser({required this.id, required this.name, required this.email, required this.role});
  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: _num(j['id']).toInt(),
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        role: '${j['role'] ?? 'customer'}',
      );
  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'email': email, 'role': role};
}

class Booking {
  final int id;
  final String ref;
  final String serviceTitle;
  final String status;
  final num amount;
  final String currency;
  final String date;
  Booking({required this.id, required this.ref, required this.serviceTitle, required this.status, required this.amount, required this.currency, required this.date});
  factory Booking.fromJson(Map<String, dynamic> j) => Booking(
        id: _num(j['id']).toInt(),
        ref: '${j['ref'] ?? j['reference'] ?? ''}',
        serviceTitle: '${j['service_title'] ?? j['title'] ?? j['service'] ?? ''}',
        status: '${j['status'] ?? 'pending'}',
        amount: _num(j['amount'] ?? j['total'] ?? j['price']),
        currency: '${j['currency'] ?? 'EGP'}',
        date: '${j['date'] ?? j['created_at'] ?? j['travel_date'] ?? ''}',
      );
}

class WalletTx {
  final String label;
  final num amount;
  final String date;
  WalletTx({required this.label, required this.amount, required this.date});
  factory WalletTx.fromJson(Map<String, dynamic> j) => WalletTx(
        label: '${j['label'] ?? j['type'] ?? j['note'] ?? 'Transaction'}',
        amount: _num(j['amount']),
        date: '${j['created_at'] ?? j['date'] ?? ''}',
      );
}

class Wallet {
  final num balance;
  final String currency;
  final List<WalletTx> transactions;
  Wallet({required this.balance, required this.currency, required this.transactions});
  factory Wallet.fromJson(Map<String, dynamic> j) => Wallet(
        balance: _num(j['balance']),
        currency: '${j['currency'] ?? 'EGP'}',
        transactions: (j['transactions'] as List?)?.map((e) => WalletTx.fromJson(Map<String, dynamic>.from(e))).toList() ?? [],
      );
}
