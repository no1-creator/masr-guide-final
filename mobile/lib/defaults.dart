// Built-in default catalog data.
// Shown instantly (even offline) and automatically replaced by live
// data from the backend/dashboard when the app can reach the server.

const List<Map<String, dynamic>> defaultCategories = [
  {'id': 1, 'key': 'airport', 'icon': 'plane', 'name': 'Airport Services'},
  {'id': 2, 'key': 'visa', 'icon': 'file', 'name': 'Visa & Entry'},
  {'id': 3, 'key': 'transfers', 'icon': 'car', 'name': 'Transfers'},
  {'id': 4, 'key': 'hotels', 'icon': 'bed', 'name': 'Hotels & Stays'},
  {'id': 5, 'key': 'internal-trips', 'icon': 'compass', 'name': 'Internal Trips'},
  {'id': 6, 'key': 'tours', 'icon': 'landmark', 'name': 'Tours & Sightseeing'},
  {'id': 7, 'key': 'nile-cruise', 'icon': 'ship', 'name': 'Nile Cruises'},
  {'id': 8, 'key': 'diving', 'icon': 'waves', 'name': 'Diving & Water Sports'},
  {'id': 9, 'key': 'safari', 'icon': 'mountain', 'name': 'Desert Safari'},
  {'id': 10, 'key': 'carrental', 'icon': 'key', 'name': 'Car Rental'},
  {'id': 11, 'key': 'guide', 'icon': 'user', 'name': 'Private Guides'},
  {'id': 12, 'key': 'sim', 'icon': 'phone', 'name': 'SIM & Internet'},
  {'id': 13, 'key': 'dining', 'icon': 'utensils', 'name': 'Dining'},
  {'id': 14, 'key': 'shopping', 'icon': 'bag', 'name': 'Shopping & Bazaars'},
  {'id': 15, 'key': 'spa', 'icon': 'sparkles', 'name': 'Spa & Wellness'},
  {'id': 16, 'key': 'events', 'icon': 'ticket', 'name': 'Events & Shows'},
  {'id': 17, 'key': 'insurance', 'icon': 'shield', 'name': 'Travel Insurance'},
  {'id': 18, 'key': 'departure', 'icon': 'luggage', 'name': 'Departure Assist'},
];

const List<Map<String, dynamic>> defaultBanners = [
  {'id': 1, 'image': 'https://picsum.photos/seed/mgpyramids/900/500', 'title': 'Discover the Pyramids of Giza', 'service_id': 1001},
  {'id': 2, 'image': 'https://picsum.photos/seed/mgnile/900/500', 'title': 'Luxury Nile Cruises - Luxor & Aswan', 'service_id': 1007},
  {'id': 3, 'image': 'https://picsum.photos/seed/mgredsea/900/500', 'title': 'Red Sea Diving Adventures', 'service_id': 1010},
];

Map<String, dynamic> _svc(
  int id,
  int categoryId,
  String title,
  String location,
  String duration,
  num price,
  num rating,
  int reviewsCount,
  bool featured,
  String description,
) {
  final seed = 'mg$id';
  return {
    'id': id,
    'vendor_id': 1,
    'category_id': categoryId,
    'title': title,
    'location': location,
    'description': description,
    'price': price,
    'currency': 'EGP',
    'duration': duration,
    'rating': rating,
    'reviews_count': reviewsCount,
    'featured': featured,
    'cancel_policy': 'Free cancellation up to 24 hours before start.',
    'status': 'approved',
    'cover': 'https://picsum.photos/seed/$seed/800/520',
    'images': [
      'https://picsum.photos/seed/${seed}a/800/520',
      'https://picsum.photos/seed/${seed}b/800/520',
    ],
  };
}

final List<Map<String, dynamic>> defaultServices = [
  _svc(1001, 6, 'Giza Pyramids & Sphinx Half-Day Tour', 'Cairo', '5 hours', 850, 4.8, 320, true, 'Explore the last standing wonder of the ancient world with an expert guide.'),
  _svc(1002, 6, 'Egyptian Museum & Old Cairo Tour', 'Cairo', '6 hours', 700, 4.7, 210, false, 'Walk through thousands of years of history including the royal mummies hall.'),
  _svc(1003, 5, 'Cairo to Luxor Flight + Day Tour', 'Luxor', '1 day', 4200, 4.9, 95, true, 'Fly to Luxor and visit Karnak, the Valley of the Kings and more in one day.'),
  _svc(1004, 5, 'Cairo to Alexandria Day Trip', 'Alexandria', '12 hours', 1500, 4.6, 140, false, 'Discover the Mediterranean pearl: the Citadel, Library and Catacombs.'),
  _svc(1005, 5, 'Hurghada to Cairo Overnight Trip', 'Hurghada', '2 days', 3200, 4.5, 60, false, 'A comfortable overnight journey to see the Pyramids and the Egyptian Museum.'),
  _svc(1006, 5, 'Sharm El-Sheikh to Luxor Excursion', 'Sharm El-Sheikh', '1 day', 3800, 4.6, 48, false, 'A full-day excursion from the Red Sea to the temples of Luxor.'),
  _svc(1007, 7, '4-Night Nile Cruise: Luxor to Aswan', 'Luxor', '4 nights', 9500, 4.9, 180, true, 'Sail the Nile in style with full board and guided temple visits.'),
  _svc(1008, 7, 'Dinner Nile Cruise with Show', 'Cairo', '3 hours', 950, 4.4, 220, false, 'Enjoy dinner, live music and a folklore show while cruising the Nile.'),
  _svc(1009, 1, 'Cairo Airport Fast-Track & Meet-and-Greet', 'Cairo', '1 hour', 600, 4.7, 130, false, 'Skip the lines with a personal representative from arrival to exit.'),
  _svc(1010, 8, 'Red Sea Diving Day (2 Dives)', 'Hurghada', '6 hours', 1800, 4.8, 260, true, 'Two guided dives over vibrant coral reefs with full equipment included.'),
  _svc(1011, 8, 'Snorkeling Trip to Giftun Island', 'Hurghada', '7 hours', 1200, 4.6, 175, false, 'A boat day trip to crystal clear waters with lunch on board.'),
  _svc(1012, 9, 'Desert Safari & Bedouin Dinner', 'Sharm El-Sheikh', '5 hours', 1400, 4.5, 150, false, 'Quad biking, camel ride and a traditional dinner under the stars.'),
  _svc(1013, 3, 'Private Airport Transfer (Sedan)', 'Cairo', '45 minutes', 450, 4.7, 300, false, 'Comfortable private transfer between the airport and your hotel.'),
  _svc(1014, 4, '5-Star Nile-View Hotel Night', 'Cairo', '1 night', 2600, 4.6, 90, false, 'A luxury stay with breakfast and stunning views over the Nile.'),
  _svc(1015, 11, 'Licensed Private Egyptologist Guide (Full Day)', 'Cairo', '8 hours', 1600, 4.9, 70, false, 'A certified guide to bring ancient Egypt to life, tailored to you.'),
  _svc(1016, 13, 'Nubian Dinner Experience', 'Aswan', '2 hours', 550, 4.5, 65, false, 'Authentic Nubian cuisine in a colorful riverside setting.'),
  _svc(1017, 10, 'Economy Car Rental (Per Day)', 'Cairo', 'per day', 900, 4.4, 55, false, 'A reliable economy car with insurance for exploring at your own pace.'),
  _svc(1018, 12, 'Tourist eSIM - 15GB Data', 'Nationwide', 'instant', 350, 4.6, 200, false, 'Stay connected the moment you land with instant mobile data.'),
  _svc(1019, 14, 'Khan El-Khalili Guided Shopping Tour', 'Cairo', '3 hours', 500, 4.3, 80, false, 'Explore the famous bazaar with a guide who knows the best stalls.'),
  _svc(1020, 15, 'Spa & Massage Package', 'Hurghada', '90 minutes', 800, 4.7, 60, false, 'Relax with a full-body massage and access to spa facilities.'),
  _svc(1021, 16, 'Sound & Light Show at the Pyramids', 'Cairo', '2 hours', 700, 4.5, 110, false, 'An unforgettable evening telling the story of ancient Egypt in lights.'),
  _svc(1022, 2, 'Egypt e-Visa Assistance', 'Online', '72 hours', 450, 4.6, 140, false, 'Fast and simple help to get your tourist e-visa approved.'),
  _svc(1023, 17, 'Travel Insurance (Per Week)', 'Nationwide', '7 days', 600, 4.4, 40, false, 'Medical and travel coverage for peace of mind during your trip.'),
  _svc(1024, 18, 'Departure Fast-Track & Lounge Access', 'Cairo', '2 hours', 650, 4.6, 50, false, 'A smooth departure with fast-track security and lounge access.'),
];

const List<Map<String, dynamic>> defaultReviews = [
  {'author': 'James W.', 'rating': 5, 'comment': 'Amazing experience, our guide was fantastic and very knowledgeable.', 'date': '2026-05-12'},
  {'author': 'Sofia R.', 'rating': 4.5, 'comment': 'Very well organized from start to finish. Highly recommend.', 'date': '2026-04-28'},
  {'author': 'Luca M.', 'rating': 5, 'comment': 'Unforgettable trip, everything was on time and smooth.', 'date': '2026-04-10'},
];
