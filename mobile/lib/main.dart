import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'state.dart';
import 'theme.dart';
import 'splash_screen.dart';
import 'screens/home_screen.dart';
import 'screens/wishlist_screen.dart';
import 'screens/offers_screen.dart';
import 'screens/bookings_screen.dart';
import 'screens/account_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState()..boot(),
      child: const RaGoApp(),
    ),
  );
}

class RaGoApp extends StatelessWidget {
  const RaGoApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RaGo',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      theme: buildTheme(),
      home: const SplashScreen(next: RootNav()),
    );
  }
}

class RootNav extends StatefulWidget {
  const RootNav({super.key});
  @override
  State<RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<RootNav> {
  int _index = 0;
  final _tabs = const [
    HomeScreen(),
    WishlistScreen(),
    OffersScreen(),
    BookingsScreen(),
    AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore_rounded), label: 'Explore'),
          NavigationDestination(icon: Icon(Icons.favorite_border_rounded), selectedIcon: Icon(Icons.favorite_rounded), label: 'Saved'),
          NavigationDestination(icon: Icon(Icons.local_offer_outlined), selectedIcon: Icon(Icons.local_offer_rounded), label: 'Offers'),
          NavigationDestination(icon: Icon(Icons.confirmation_number_outlined), selectedIcon: Icon(Icons.confirmation_number_rounded), label: 'My Trips'),
          NavigationDestination(icon: Icon(Icons.person_outline_rounded), selectedIcon: Icon(Icons.person_rounded), label: 'Account'),
        ],
      ),
    );
  }
}
