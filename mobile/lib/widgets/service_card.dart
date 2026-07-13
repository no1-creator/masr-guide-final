import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';
import 'common.dart';

class ServiceCard extends StatelessWidget {
  final Service service;
  final VoidCallback onTap;
  const ServiceCard({super.key, required this.service, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final fav = context.watch<AppState>().isFav(service.id);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(kRadius),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(kRadius),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(aspectRatio: 16 / 10, child: NetImage(service.cover)),
                if (service.featured)
                  const Positioned(top: 8, left: 8, child: Pill('Featured', color: AppColors.gold)),
                Positioned(
                  top: 6,
                  right: 6,
                  child: Material(
                    color: Colors.white,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => context.read<AppState>().toggleFav(service.id),
                      child: Padding(
                        padding: const EdgeInsets.all(5),
                        child: Icon(
                          fav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          size: 18,
                          color: fav ? AppColors.red : AppColors.text2,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(service.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.2)),
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.place_outlined, size: 13, color: AppColors.text2),
                    const SizedBox(width: 2),
                    Expanded(child: Text(service.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.text2, fontSize: 12))),
                  ]),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      RatingStars(service.rating, count: service.reviewsCount),
                      Text('${service.price.toStringAsFixed(0)} ${service.currency}',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.blue, fontSize: 14)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
