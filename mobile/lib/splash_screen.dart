import 'package:flutter/material.dart';
import 'theme.dart';

/// Animated RaGo opening splash — mirrors the website splash.
class SplashScreen extends StatefulWidget {
  final Widget next;
  const SplashScreen({super.key, required this.next});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _wordFade;
  late final Animation<double> _wordScale;
  late final Animation<double> _lineWidth;
  late final Animation<double> _tagFade;
  late final Animation<double> _glow;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000));
    _wordFade = CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.5, curve: Curves.easeOut));
    _wordScale = Tween<double>(begin: 0.7, end: 1.0)
        .animate(CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.5, curve: Curves.easeOutBack)));
    _lineWidth = CurvedAnimation(parent: _c, curve: const Interval(0.45, 0.75, curve: Curves.easeOut));
    _tagFade = CurvedAnimation(parent: _c, curve: const Interval(0.6, 0.9, curve: Curves.easeOut));
    _glow = CurvedAnimation(parent: _c, curve: Curves.easeInOut);
    _c.forward();
    Future.delayed(const Duration(milliseconds: 2700), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 500),
          pageBuilder: (_, a, __) => FadeTransition(opacity: a, child: widget.next),
        ),
      );
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.blue,
      body: Center(
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, _) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 190,
                      height: 190,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(colors: [
                          AppColors.orange.withOpacity(0.30 * _glow.value),
                          Colors.transparent,
                        ]),
                      ),
                    ),
                    Opacity(
                      opacity: _wordFade.value,
                      child: Transform.scale(
                        scale: _wordScale.value,
                        child: RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 54, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            children: [
                              TextSpan(text: 'Ra', style: TextStyle(color: AppColors.cream)),
                              TextSpan(text: 'Go', style: TextStyle(color: AppColors.orange)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  width: 150 * _lineWidth.value,
                  height: 3,
                  decoration: BoxDecoration(
                    color: AppColors.gold,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 12),
                Opacity(
                  opacity: _tagFade.value,
                  child: const Text(
                    'TOURISM · DEALS & SERVICES',
                    style: TextStyle(color: AppColors.cream, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 2.5),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
