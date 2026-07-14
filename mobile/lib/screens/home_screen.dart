import 'package:flutter/material.dart' hide Category;
import 'package:provider/provider.dart';
import '../state.dart';
import '../models.dart';
import '../theme.dart';
import '../icons.dart';
import '../widgets/common.dart';
import '../widgets/service_card.dart';
import '../widgets/banner_slider.dart';
import 'service_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openService(int id) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => ServiceDetailScreen(serviceId: id)));
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    if (s.bootLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (s.bootError != null) {
      return Scaffold(body: ErrorState(s.bootError!, onRetry: () => context.read<AppState>().boot()));
    }
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadServices(),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              titleSpacing: 16,
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.travel_explore_rounded, color: AppColors.blue, size: 20),
                  ),
                  const SizedBox(width: 8),
                  const Text('Masr Guide', style: TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: TextField(
                  controller: _searchCtrl,
                  textInputAction: TextInputAction.search,
                  onSubmitted: (v) => context.read<AppState>().setQuery(v.trim()),
                  decoration: InputDecoration(
                    hintText: 'Search tours, transfers, hotels...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchCtrl.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.close_rounded),
                            onPressed: () {
                              _searchCtrl.clear();
                              context.read<AppState>().setQuery('');
                            },
                          ),
                  ),
                ),
              ),
            ),
            if (s.banners.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: BannerSlider(
                    banners: s.banners,
                    onTap: (b) {
                      if (b.serviceId != null) _openService(b.serviceId!);
                    },
                  ),
                ),
              ),
            SliverToBoxAdapter(child: _CategoryBar(onOpen: () {})),
            if (s.banners.length > 1) ...[
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text('Special offers',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: BannerSlider(
                    banners: s.banners.reversed.toList(),
                    height: 130,
                    intervalSeconds: 6,
                    onTap: (b) {
                      if (b.serviceId != null) _openService(b.serviceId!);
                    },
                  ),
                ),
              ),
            ],
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      s.selectedCat == 'all' ? 'All services' : (s.catByKey(s.selectedCat)?.name ?? 'Services'),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                    ),
                    _SortButton(),
                  ],
                ),
              ),
            ),
            if (s.servicesLoading)
              const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator())))
            else if (s.servicesError != null)
              SliverToBoxAdapter(child: ErrorState(s.servicesError!, onRetry: () => context.read<AppState>().loadServices()))
            else if (s.services.isEmpty)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: Text('No services found', style: TextStyle(color: AppColors.text2))),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 260,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (c, i) => ServiceCard(service: s.services[i], onTap: () => _openService(s.services[i].id)),
                    childCount: s.services.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CategoryBar extends StatelessWidget {
  final VoidCallback onOpen;
  const _CategoryBar({required this.onOpen});
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    final List<String> keys = ['all'];
    final List<String> names = ['All'];
    for (final Category c in s.categories) {
      keys.add(c.key);
      names.add(c.name);
    }
    return SizedBox(
      height: 84,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: keys.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final String key = keys[i];
          final String name = names[i];
          final active = s.selectedCat == key;
          return GestureDetector(
            onTap: () => context.read<AppState>().setCategory(key),
            child: SizedBox(
              width: 68,
              child: Column(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: active ? AppColors.blue : AppColors.soft,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: active ? AppColors.blue : AppColors.border),
                    ),
                    child: Icon(categoryIcon(key), color: active ? Colors.white : AppColors.blue, size: 24),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: active ? AppColors.blue : AppColors.text2, fontWeight: active ? FontWeight.w700 : FontWeight.w500),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SortButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppState>();
    return PopupMenuButton<Sort>(
      initialValue: s.sort,
      onSelected: (v) => context.read<AppState>().setSort(v),
      itemBuilder: (c) => Sort.values.map((e) => PopupMenuItem<Sort>(value: e, child: Text(e.label))).toList(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.tune_rounded, size: 18, color: AppColors.blue),
          const SizedBox(width: 4),
          Text(s.sort.label, style: const TextStyle(color: AppColors.blue, fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
