import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart' show Service;
import '../state.dart';
import '../theme.dart';
import '../widgets/service_card.dart';
import 'service_detail_screen.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final List<Service> favs = s.favoriteServices;
    return Scaffold(
      appBar: AppBar(title: const Text('Saved')),
      body: favs.isEmpty
          ? const _EmptyWishlist()
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 260,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.72,
              ),
              itemCount: favs.length,
              itemBuilder: (c, i) => ServiceCard(
                service: favs[i],
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: favs[i].id)),
                ),
              ),
            ),
    );
  }
}

class _EmptyWishlist extends StatelessWidget {
  const _EmptyWishlist();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.favorite_border_rounded, size: 44, color: AppColors.text2),
            const SizedBox(height: 12),
            Text('No saved items yet', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            const Text(
              'Tap the heart on any service to save it here for later.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.text2, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}
