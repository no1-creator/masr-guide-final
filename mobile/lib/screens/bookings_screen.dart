import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'account_screen.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});
  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  Future<List<Booking>>? _future;

  void _reload() {
    final st = context.read<AppState>();
    if (st.isLoggedIn) setState(() => _future = st.myBookings());
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    if (!st.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Trips')),
        body: _SignedOut(onLogin: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()))),
      );
    }
    _future ??= st.myBookings();
    return Scaffold(
      appBar: AppBar(title: const Text('My Trips')),
      body: RefreshIndicator(
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<Booking>>(
          future: _future,
          builder: (c, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) return ErrorState('${snap.error}', onRetry: _reload);
            final list = snap.data ?? [];
            if (list.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 120),
                Icon(Icons.card_travel_rounded, size: 48, color: AppColors.text2),
                SizedBox(height: 12),
                Center(child: Text('No bookings yet', style: TextStyle(color: AppColors.text2))),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (c, i) => _BookingTile(list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _BookingTile extends StatelessWidget {
  final Booking b;
  const _BookingTile(this.b);
  Color get _statusColor => switch (b.status.toLowerCase()) {
        'confirmed' || 'paid' || 'completed' => AppColors.green,
        'cancelled' || 'canceled' => AppColors.red,
        _ => AppColors.gold,
      };
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadius),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(b.serviceTitle.isEmpty ? 'Booking' : b.serviceTitle, style: const TextStyle(fontWeight: FontWeight.w700))),
            Pill(b.status, color: _statusColor),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.confirmation_number_outlined, size: 15, color: AppColors.text2),
            const SizedBox(width: 4),
            Text(b.ref, style: const TextStyle(color: AppColors.text2, fontSize: 13)),
            const Spacer(),
            if (b.date.isNotEmpty) ...[
              const Icon(Icons.event_rounded, size: 15, color: AppColors.text2),
              const SizedBox(width: 4),
              Text(b.date, style: const TextStyle(color: AppColors.text2, fontSize: 13)),
            ],
          ]),
          if (b.amount > 0) ...[
            const SizedBox(height: 8),
            Text('${b.amount.toStringAsFixed(0)} ${b.currency}', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.blue)),
          ],
        ],
      ),
    );
  }
}

class _SignedOut extends StatelessWidget {
  final VoidCallback onLogin;
  const _SignedOut({required this.onLogin});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline_rounded, size: 44, color: AppColors.text2),
            const SizedBox(height: 12),
            const Text('Sign in to view your trips', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onLogin, child: const Text('Sign in')),
          ],
        ),
      ),
    );
  }
}
