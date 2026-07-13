import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart' show Service;
import '../state.dart';
import '../theme.dart';
import '../widgets/service_card.dart';
import 'service_detail_screen.dart';

class OffersScreen extends StatelessWidget {
  const OffersScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final List<Service> offers = s.offers;
    return Scaffold(
      appBar: AppBar(title: const Text('Offers')),
      body: offers.isEmpty
          ? const _EmptyOffers()
          : CustomScrollView(
              slivers: [
                const SliverToBoxAdapter(child: _OffersHeader()),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 260,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (c, i) => ServiceCard(
                        service: offers[i],
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                ServiceDetailScreen(serviceId: offers[i].id),
                          ),
                        ),
                      ),
                      childCount: offers.length,
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _OffersHeader extends StatelessWidget {
  const _OffersHeader();
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.blueSoft,
        borderRadius: BorderRadius.circular(kRadius),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_offer_rounded,
              color: AppColors.blue, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Special offers & top picks',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Hand-picked featured trips from top-rated providers.',
                  style: TextStyle(color: AppColors.text2, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyOffers extends StatelessWidget {
  const _EmptyOffers();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.local_offer_outlined,
                size: 44, color: AppColors.text2),
            const SizedBox(height: 12),
            Text('No offers right now',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            const Text(
              'Check back soon for featured trips and special deals.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.text2, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
