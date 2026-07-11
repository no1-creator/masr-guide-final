import 'package:flutter/material.dart';
import '../theme.dart';

class NetImage extends StatelessWidget {
  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  const NetImage(this.url, {super.key, this.width, this.height, this.fit = BoxFit.cover});
  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) {
      return Container(
        width: width,
        height: height,
        color: AppColors.blueSoft,
        child: const Icon(Icons.image_outlined, color: AppColors.blue),
      );
    }
    return Image.network(
      url,
      width: width,
      height: height,
      fit: fit,
      loadingBuilder: (c, child, p) => p == null
          ? child
          : Container(
              width: width,
              height: height,
              color: AppColors.soft,
              child: const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))),
            ),
      errorBuilder: (c, e, s) => Container(
        width: width,
        height: height,
        color: AppColors.blueSoft,
        child: const Icon(Icons.broken_image_outlined, color: AppColors.blue),
      ),
    );
  }
}

class RatingStars extends StatelessWidget {
  final num rating;
  final int count;
  const RatingStars(this.rating, {super.key, this.count = 0});
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.star_rounded, size: 16, color: AppColors.gold),
        const SizedBox(width: 3),
        Text(rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        if (count > 0) ...[
          const SizedBox(width: 4),
          Text('($count)', style: const TextStyle(color: AppColors.text2, fontSize: 12)),
        ],
      ],
    );
  }
}

String money(num v, String currency) => '${currency == 'EGP' ? '' : ''}${v.toStringAsFixed(0)} $currency';

class Pill extends StatelessWidget {
  final String text;
  final Color color;
  const Pill(this.text, {super.key, this.color = AppColors.blue});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorState(this.message, {super.key, this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 40, color: AppColors.text2),
            const SizedBox(height: 12),
            Text('Could not connect', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.text2, fontSize: 13)),
            const SizedBox(height: 16),
            if (onRetry != null) OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
