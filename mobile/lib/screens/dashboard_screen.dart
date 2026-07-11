import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Read-only mobile view of the control-panel data (same API/DB).
/// Full management stays in the web control panel.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Future<Map<String, dynamic>>? _future;
  late String _role;

  @override
  void initState() {
    super.initState();
    final st = context.read<AppState>();
    _role = (st.user?.role ?? 'customer').toLowerCase();
    _future = _role == 'admin' ? st.adminOverview() : st.api.vendorMe();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_role == 'admin' ? 'Admin overview' : 'My business')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (c, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErrorState('${snap.error}', onRetry: () {
              final st = context.read<AppState>();
              setState(() => _future = _role == 'admin' ? st.adminOverview() : st.api.vendorMe());
            });
          }
          final d = snap.data ?? {};
          final stats = _role == 'admin'
              ? [
                  ('Vendors', d['vendors'], Icons.storefront_rounded),
                  ('Services', d['services'], Icons.local_activity_rounded),
                  ('Affiliates', d['affiliates'], Icons.groups_rounded),
                  ('Bookings', d['bookings'], Icons.confirmation_number_rounded),
                  ('Revenue', d['revenue'], Icons.payments_rounded),
                  ('Platform commission', d['platform_commission'], Icons.percent_rounded),
                ]
              : [
                  ('Services', d['services_count'] ?? d['services'], Icons.local_activity_rounded),
                  ('Bookings', d['bookings_count'] ?? d['bookings'], Icons.confirmation_number_rounded),
                  ('Revenue', d['revenue'], Icons.payments_rounded),
                  ('Rating', d['rating'], Icons.star_rounded),
                ];
          final recent = (d['recent_bookings'] as List?) ?? const [];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: stats
                    .where((e) => e.$2 != null)
                    .map((e) => _StatCard(label: e.$1, value: '${e.$2}', icon: e.$3))
                    .toList(),
              ),
              if (recent.isNotEmpty) ...[
                const SizedBox(height: 20),
                const Text('Recent bookings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 10),
                ...recent.map((b) {
                  final m = Map<String, dynamic>.from(b);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(kRadius), border: Border.all(color: AppColors.border)),
                    child: Row(children: [
                      Expanded(child: Text('${m['service_title'] ?? m['title'] ?? m['ref'] ?? 'Booking'}', style: const TextStyle(fontWeight: FontWeight.w600))),
                      Pill('${m['status'] ?? ''}', color: AppColors.gold),
                    ]),
                  );
                }),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(kRadius)),
                child: const Row(children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.blue, size: 18),
                  SizedBox(width: 8),
                  Expanded(child: Text('Full management (add/edit services, approvals, banners, payouts) is available in the web control panel.', style: TextStyle(fontSize: 13))),
                ]),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _StatCard({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(kRadius), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: AppColors.blue, size: 22),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
          Text(label, style: const TextStyle(color: AppColors.text2, fontSize: 12)),
        ],
      ),
    );
  }
}
