import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'booking_sheet.dart';

class ServiceDetailScreen extends StatefulWidget {
  final int serviceId;
  const ServiceDetailScreen({super.key, required this.serviceId});
  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  Service? _service;
  List<Review> _reviews = [];
  String? _error;
  bool _loading = true;
  int _img = 0;
  final _pc = PageController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final st = context.read<AppState>();
      final data = await st.serviceDetail(widget.serviceId);
      final reviews = await st.reviews(widget.serviceId);
      setState(() {
        _service = Service.fromJson(data);
        _reviews = reviews;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null) return Scaffold(appBar: AppBar(), body: ErrorState(_error!, onRetry: _load));
    final s = _service!;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                children: [
                  PageView.builder(
                    controller: _pc,
                    onPageChanged: (i) => setState(() => _img = i),
                    itemCount: s.images.isEmpty ? 1 : s.images.length,
                    itemBuilder: (c, i) => NetImage(s.images.isEmpty ? s.cover : s.images[i]),
                  ),
                  if (s.images.length > 1)
                    Positioned(
                      bottom: 12,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(s.images.length, (i) {
                          final active = i == _img;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: active ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(color: active ? Colors.white : Colors.white70, borderRadius: BorderRadius.circular(999)),
                          );
                        }),
                      ),
                    ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    if (s.featured) const Pill('Featured', color: AppColors.gold),
                    if (s.featured) const SizedBox(width: 8),
                    RatingStars(s.rating, count: s.reviewsCount),
                  ]),
                  const SizedBox(height: 10),
                  Text(s.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1.2)),
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.place_outlined, size: 16, color: AppColors.text2),
                    const SizedBox(width: 3),
                    Text(s.location, style: const TextStyle(color: AppColors.text2)),
                    if (s.duration.isNotEmpty) ...[
                      const SizedBox(width: 12),
                      const Icon(Icons.schedule_rounded, size: 16, color: AppColors.text2),
                      const SizedBox(width: 3),
                      Text(s.duration, style: const TextStyle(color: AppColors.text2)),
                    ],
                  ]),
                  const Divider(height: 28),
                  const Text('About', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 6),
                  Text(s.description, style: const TextStyle(height: 1.5, color: AppColors.text)),
                  if (s.cancelPolicy.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(kRadius)),
                      child: Row(children: [
                        const Icon(Icons.shield_outlined, color: AppColors.blue, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(s.cancelPolicy, style: const TextStyle(fontSize: 13))),
                      ]),
                    ),
                  ],
                  if (_reviews.isNotEmpty) ...[
                    const Divider(height: 28),
                    const Text('Reviews', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    const SizedBox(height: 8),
                    ..._reviews.map((r) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Text(r.author, style: const TextStyle(fontWeight: FontWeight.w600)),
                                const Spacer(),
                                RatingStars(r.rating),
                              ]),
                              const SizedBox(height: 2),
                              Text(r.comment, style: const TextStyle(color: AppColors.text2, fontSize: 13)),
                            ],
                          ),
                        )),
                  ],
                  const SizedBox(height: 90),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('From', style: TextStyle(color: AppColors.text2, fontSize: 12)),
                Text('${s.price.toStringAsFixed(0)} ${s.currency}',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 20, color: AppColors.blue)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: () => showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
                  builder: (_) => BookingSheet(service: s),
                ),
                child: const Text('Book now'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
