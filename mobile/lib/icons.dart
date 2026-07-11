import 'package:flutter/material.dart';

/// Maps backend category keys to modern Material icons (mirrors the web
/// Lucide icon set as closely as the Material set allows).
IconData categoryIcon(String key) {
  switch (key) {
    case 'all':
      return Icons.grid_view_rounded;
    case 'airport':
      return Icons.flight_rounded;
    case 'visa':
      return Icons.description_rounded;
    case 'transfers':
      return Icons.directions_car_rounded;
    case 'hotels':
      return Icons.hotel_rounded;
    case 'internal-trips':
      return Icons.explore_rounded;
    case 'tours':
      return Icons.account_balance_rounded;
    case 'nile-cruise':
      return Icons.directions_boat_rounded;
    case 'diving':
      return Icons.waves_rounded;
    case 'safari':
      return Icons.terrain_rounded;
    case 'carrental':
      return Icons.vpn_key_rounded;
    case 'guide':
      return Icons.person_pin_rounded;
    case 'sim':
      return Icons.sim_card_rounded;
    case 'dining':
      return Icons.restaurant_rounded;
    case 'shopping':
      return Icons.shopping_bag_rounded;
    case 'spa':
      return Icons.spa_rounded;
    case 'events':
      return Icons.confirmation_number_rounded;
    case 'insurance':
      return Icons.verified_user_rounded;
    case 'departure':
      return Icons.luggage_rounded;
    default:
      return Icons.local_activity_rounded;
  }
}
