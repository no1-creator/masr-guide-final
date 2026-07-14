import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart' as m;
import '../theme.dart';
import 'common.dart';

class BannerSlider extends StatefulWidget {
  final List<m.Banner> banners;
  final void Function(m.Banner) onTap;
  final double height;
  final int intervalSeconds;
  const BannerSlider({
    super.key,
    required this.banners,
    required this.onTap,
    this.height = 170,
    this.intervalSeconds = 4,
  });
  @override
  State<BannerSlider> createState() => _BannerSliderState();
}

class _BannerSliderState extends State<BannerSlider> {
  final _controller = PageController();
  int _page = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.banners.length > 1) {
      _timer = Timer.periodic(Duration(seconds: widget.intervalSeconds), (_) {
        if (!mounted || !_controller.hasClients) return;
        _page = (_page + 1) % widget.banners.length;
        _controller.animateToPage(_page, duration: const Duration(milliseconds: 450), curve: Curves.easeInOut);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.banners.isEmpty) return const SizedBox.shrink();
    return Column(
      children: [
        SizedBox(
          height: widget.height,
          child: PageView.builder(
            controller: _controller,
            onPageChanged: (i) => setState(() => _page = i),
            itemCount: widget.banners.length,
            itemBuilder: (c, i) {
              final b = widget.banners[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: InkWell(
                  onTap: () => widget.onTap(b),
                  borderRadius: BorderRadius.circular(kRadius),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(kRadius),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        NetImage(b.image),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Colors.black.withOpacity(0.55), Colors.transparent],
                            ),
                          ),
                        ),
                        if (b.title.isNotEmpty)
                          Positioned(
                            left: 14,
                            right: 14,
                            bottom: 14,
                            child: Text(b.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(widget.banners.length, (i) {
            final active = i == _page;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: active ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: active ? AppColors.blue : AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            );
          }),
        ),
      ],
    );
  }
}
