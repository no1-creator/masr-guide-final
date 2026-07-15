import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../state.dart';
import '../theme.dart';

// =============================================================================
// Group Trips / "Create your journey" — mirrors the website feature.
//
// Data is loaded from the backend (GET /api/group-trips). When the endpoint is
// not reachable yet, the screen gracefully falls back to the built-in demo
// trips — exactly the same offline-first pattern the rest of the app uses.
// =============================================================================

num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

String usd(num v) => '\$${v.toStringAsFixed(0)}';

class GroupTrip {
  final String name;
  final num priceUsd;
  final int daysLeft;
  final int joined;
  final int minGroup;
  final bool vote;
  const GroupTrip({
    required this.name,
    required this.priceUsd,
    required this.daysLeft,
    required this.joined,
    this.minGroup = 10,
    this.vote = false,
  });

  double get progress {
    if (minGroup <= 0) return 0;
    final p = joined / minGroup;
    return p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  factory GroupTrip.fromJson(Map<String, dynamic> j) => GroupTrip(
        name: '${j['name'] ?? j['title'] ?? j['destination'] ?? ''}',
        priceUsd: _num(j['price_usd'] ?? j['price'] ?? j['usd'] ?? 0),
        daysLeft: _num(j['days_left'] ?? j['days'] ?? j['deadline_days'] ?? 0).toInt(),
        joined: _num(j['joined'] ?? j['members'] ?? j['count'] ?? 0).toInt(),
        minGroup: _num(j['min_group'] ?? j['min_people'] ?? 10).toInt(),
        vote: j['vote'] == true || j['voting'] == true || j['status'] == 'voting',
      );
}

// The same 10 trips shown on the website strip (USD, per person).
const List<GroupTrip> demoGroupTrips = [
  GroupTrip(name: 'Giza & the Pyramids', priceUsd: 50, daysLeft: 9, joined: 6),
  GroupTrip(name: 'Luxor — Valley of Kings', priceUsd: 65, daysLeft: 12, joined: 4),
  GroupTrip(name: 'Aswan & Abu Simbel', priceUsd: 75, daysLeft: 15, joined: 7, vote: true),
  GroupTrip(name: 'Hurghada Red Sea', priceUsd: 60, daysLeft: 10, joined: 5),
  GroupTrip(name: 'Sharm El-Sheikh', priceUsd: 70, daysLeft: 18, joined: 3),
  GroupTrip(name: 'White Desert Camp', priceUsd: 58, daysLeft: 7, joined: 8, vote: true),
  GroupTrip(name: 'Siwa Oasis', priceUsd: 80, daysLeft: 20, joined: 4),
  GroupTrip(name: 'Alexandria Day Tour', priceUsd: 45, daysLeft: 6, joined: 6),
  GroupTrip(name: 'Dahab & Blue Hole', priceUsd: 64, daysLeft: 14, joined: 5),
  GroupTrip(name: 'Nile Cruise 4 Nights', priceUsd: 110, daysLeft: 22, joined: 7),
];

const List<String> kTripIncludes = [
  'Private air-conditioned transport',
  'Licensed English-speaking guide',
  'All entry tickets',
  'Daily breakfast',
];

class _VoteDate {
  final String label;
  final int votes;
  const _VoteDate(this.label, this.votes);
}

const List<_VoteDate> kVoteDates = [
  _VoteDate('Oct 12 – Oct 20', 4),
  _VoteDate('Oct 19 – Oct 27', 7),
  _VoteDate('Nov 02 – Nov 10', 2),
];

/// Loads open group trips from the backend, falling back to demo data.
Future<List<GroupTrip>> fetchGroupTrips(ApiClient api) async {
  try {
    final res = await api.get('/api/group-trips');
    final raw = res is List
        ? res
        : (res is Map && res['trips'] is List ? res['trips'] as List : null);
    if (raw != null) {
      final trips = raw
          .map((e) => GroupTrip.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((t) => t.name.isNotEmpty)
          .toList();
      if (trips.isNotEmpty) return trips;
    }
  } catch (_) {}
  return demoGroupTrips;
}

// -----------------------------------------------------------------------------
// Home banner — the "Create your journey" call-to-action (matches the website).
// -----------------------------------------------------------------------------
class CreateJourneyBanner extends StatelessWidget {
  const CreateJourneyBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1B5163), AppColors.blueHover],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.orange.withOpacity(0.20),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text('GROUP TRIPS',
                style: TextStyle(color: Color(0xFFFFD9A8), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
          ),
          const SizedBox(height: 10),
          const Text('Create your journey',
              style: TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w800, height: 1.15)),
          const SizedBox(height: 6),
          const Text('Design your own trip — other travellers can join you and share the cost.',
              style: TextStyle(color: Color(0xFFDCE6E9), fontSize: 13.5, height: 1.35)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                  onPressed: () => openCreateJourney(context),
                  child: const Text('Create your journey', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadius)),
                  ),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const GroupTripsScreen()),
                  ),
                  child: const Text('Browse open trips', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Horizontal strip of open trips (shown on the home screen).
// -----------------------------------------------------------------------------
class GroupTripsStrip extends StatefulWidget {
  const GroupTripsStrip({super.key});
  @override
  State<GroupTripsStrip> createState() => _GroupTripsStripState();
}

class _GroupTripsStripState extends State<GroupTripsStrip> {
  late Future<List<GroupTrip>> _future;

  @override
  void initState() {
    super.initState();
    _future = fetchGroupTrips(context.read<AppState>().api);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<GroupTrip>>(
      future: _future,
      initialData: demoGroupTrips,
      builder: (context, snap) {
        final trips = snap.data ?? demoGroupTrips;
        if (trips.isEmpty) return const SizedBox.shrink();
        return SizedBox(
          height: 170,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: trips.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (c, i) => _TripCard(
              trip: trips[i],
              onTap: () => openTripDetail(context, trips[i]),
            ),
          ),
        );
      },
    );
  }
}

class _TripCard extends StatelessWidget {
  final GroupTrip trip;
  final VoidCallback onTap;
  const _TripCard({required this.trip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 186,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1B5163), AppColors.blueHover],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.orange,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(usd(trip.priceUsd),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
                const Spacer(),
                if (trip.vote)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.16),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('VOTE',
                        style: TextStyle(color: Color(0xFFFFD9A8), fontWeight: FontWeight.w800, fontSize: 10, letterSpacing: 0.5)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              trip.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15, height: 1.2),
            ),
            const Spacer(),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: trip.progress,
                minHeight: 5,
                backgroundColor: Colors.white24,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.orange),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.group_rounded, size: 14, color: Color(0xFFDCE6E9)),
                const SizedBox(width: 4),
                Text('${trip.joined}/${trip.minGroup}',
                    style: const TextStyle(color: Color(0xFFDCE6E9), fontSize: 12, fontWeight: FontWeight.w600)),
                const Spacer(),
                const Icon(Icons.schedule_rounded, size: 14, color: Color(0xFFDCE6E9)),
                const SizedBox(width: 4),
                Text('${trip.daysLeft}d left',
                    style: const TextStyle(color: Color(0xFFDCE6E9), fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Full "Browse open trips" screen.
// -----------------------------------------------------------------------------
class GroupTripsScreen extends StatefulWidget {
  const GroupTripsScreen({super.key});
  @override
  State<GroupTripsScreen> createState() => _GroupTripsScreenState();
}

class _GroupTripsScreenState extends State<GroupTripsScreen> {
  late Future<List<GroupTrip>> _future;

  @override
  void initState() {
    super.initState();
    _future = fetchGroupTrips(context.read<AppState>().api);
  }

  Future<void> _reload() async {
    setState(() {
      _future = fetchGroupTrips(context.read<AppState>().api);
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Group trips')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<List<GroupTrip>>(
          future: _future,
          initialData: demoGroupTrips,
          builder: (context, snap) {
            final trips = snap.data ?? demoGroupTrips;
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              children: [
                const CreateJourneyBanner(),
                const SizedBox(height: 20),
                const Text('Open group trips',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                const SizedBox(height: 4),
                const Text('Join a trip below — once the group fills up, it is confirmed and the price is shared.',
                    style: TextStyle(color: AppColors.text2, fontSize: 13)),
                const SizedBox(height: 14),
                ...trips.map((t) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _TripWideCard(trip: t, onTap: () => openTripDetail(context, t)),
                    )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TripWideCard extends StatelessWidget {
  final GroupTrip trip;
  final VoidCallback onTap;
  const _TripWideCard({required this.trip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(kRadius),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(kRadius),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.blueSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.place_rounded, color: AppColors.blue),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(trip.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 3),
                      Text('${trip.joined} of ${trip.minGroup} joined · ${trip.daysLeft} days left',
                          style: const TextStyle(color: AppColors.text2, fontSize: 12.5)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(usd(trip.priceUsd),
                        style: const TextStyle(color: AppColors.blue, fontWeight: FontWeight.w800, fontSize: 17)),
                    const Text('per person', style: TextStyle(color: AppColors.text2, fontSize: 11)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: trip.progress,
                minHeight: 6,
                backgroundColor: AppColors.soft,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.orange),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (trip.vote)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.orange.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Voting on dates',
                        style: TextStyle(color: AppColors.orange, fontSize: 11.5, fontWeight: FontWeight.w700)),
                  ),
                const Spacer(),
                const Text('View details',
                    style: TextStyle(color: AppColors.blue, fontSize: 13, fontWeight: FontWeight.w600)),
                const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.blue),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Trip detail bottom sheet (join / vote).
// -----------------------------------------------------------------------------
void openTripDetail(BuildContext context, GroupTrip trip) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => _TripDetailSheet(trip: trip, rootContext: context),
  );
}

class _TripDetailSheet extends StatefulWidget {
  final GroupTrip trip;
  final BuildContext rootContext;
  const _TripDetailSheet({required this.trip, required this.rootContext});
  @override
  State<_TripDetailSheet> createState() => _TripDetailSheetState();
}

class _TripDetailSheetState extends State<_TripDetailSheet> {
  int _voteIndex = 1;

  void _snack(String msg) {
    ScaffoldMessenger.of(widget.rootContext).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.blue),
    );
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(trip.name,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 21, height: 1.15)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(usd(trip.priceUsd),
                      style: const TextStyle(color: AppColors.blue, fontWeight: FontWeight.w800, fontSize: 22)),
                  const Text('per person', style: TextStyle(color: AppColors.text2, fontSize: 11)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatBox(icon: Icons.group_rounded, label: 'Joined', value: '${trip.joined}/${trip.minGroup}'),
              const SizedBox(width: 10),
              _StatBox(icon: Icons.schedule_rounded, label: 'Closes in', value: '${trip.daysLeft} days'),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: trip.progress,
              minHeight: 7,
              backgroundColor: AppColors.soft,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.orange),
            ),
          ),
          const SizedBox(height: 6),
          Text('${(trip.minGroup - trip.joined).clamp(0, trip.minGroup)} more travellers needed to confirm this trip.',
              style: const TextStyle(color: AppColors.text2, fontSize: 12.5)),
          const SizedBox(height: 22),
          const Text("What's included",
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 10),
          ...kTripIncludes.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.green),
                    const SizedBox(width: 8),
                    Expanded(child: Text(e, style: const TextStyle(fontSize: 13.5))),
                  ],
                ),
              )),
          if (trip.vote) ...[
            const SizedBox(height: 18),
            const Text('Vote on the departure date',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 4),
            const Text('The date with the most votes wins.',
                style: TextStyle(color: AppColors.text2, fontSize: 12.5)),
            const SizedBox(height: 10),
            ...List.generate(kVoteDates.length, (i) {
              final d = kVoteDates[i];
              final selected = _voteIndex == i;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(kRadius),
                  onTap: () => setState(() => _voteIndex = i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.blueSoft : AppColors.soft,
                      borderRadius: BorderRadius.circular(kRadius),
                      border: Border.all(color: selected ? AppColors.blue : AppColors.border, width: selected ? 1.5 : 1),
                    ),
                    child: Row(
                      children: [
                        Icon(selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                            size: 20, color: selected ? AppColors.blue : AppColors.text2),
                        const SizedBox(width: 10),
                        Expanded(child: Text(d.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
                        Text('${d.votes} votes', style: const TextStyle(color: AppColors.text2, fontSize: 12.5)),
                      ],
                    ),
                  ),
                ),
              );
            }),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _snack('Vote recorded for ${kVoteDates[_voteIndex].label}.');
                },
                child: const Text('Submit my vote'),
              ),
            ),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: () {
                Navigator.pop(context);
                _snack("You joined ${trip.name}! We'll notify you once the group is confirmed.");
              },
              child: const Text('Join this trip', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _StatBox({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        decoration: BoxDecoration(
          color: AppColors.soft,
          borderRadius: BorderRadius.circular(kRadius),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppColors.blue),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppColors.text2, fontSize: 11)),
                Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// "Create your journey" request sheet.
// -----------------------------------------------------------------------------
void openCreateJourney(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetCtx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(sheetCtx).viewInsets.bottom),
      child: _CreateJourneySheet(rootContext: context),
    ),
  );
}

class _CreateJourneySheet extends StatefulWidget {
  final BuildContext rootContext;
  const _CreateJourneySheet({required this.rootContext});
  @override
  State<_CreateJourneySheet> createState() => _CreateJourneySheetState();
}

class _CreateJourneySheetState extends State<_CreateJourneySheet> {
  final _destCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  int _pax = 2;
  DateTime? _date;
  String? _error;

  @override
  void dispose() {
    _destCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 14)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  void _submit() {
    if (_destCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Please enter a destination.');
      return;
    }
    Navigator.pop(context);
    ScaffoldMessenger.of(widget.rootContext).showSnackBar(
      SnackBar(
        content: Text('Journey request sent for "${_destCtrl.text.trim()}". We will open it for others to join.'),
        backgroundColor: AppColors.blue,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = _date == null
        ? 'Pick a start date'
        : '${_date!.year}-${_date!.month.toString().padLeft(2, '0')}-${_date!.day.toString().padLeft(2, '0')}';
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Create your journey',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 6),
          const Text('Tell us where you want to go. We will build the trip and open it so other travellers can join and share the cost.',
              style: TextStyle(color: AppColors.text2, fontSize: 13, height: 1.35)),
          const SizedBox(height: 18),
          const Text('Destination', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(
            controller: _destCtrl,
            decoration: const InputDecoration(hintText: 'e.g. Luxor, Siwa, Red Sea...'),
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 12.5)),
          ],
          const SizedBox(height: 14),
          const Text('Preferred start date', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          InkWell(
            borderRadius: BorderRadius.circular(kRadius),
            onTap: _pickDate,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.soft,
                borderRadius: BorderRadius.circular(kRadius),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.blue),
                  const SizedBox(width: 10),
                  Text(dateLabel,
                      style: TextStyle(color: _date == null ? AppColors.text2 : AppColors.text, fontSize: 14)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text('Travellers', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          Row(
            children: [
              _StepBtn(icon: Icons.remove_rounded, onTap: () => setState(() => _pax = (_pax - 1).clamp(1, 20))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Text('$_pax', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
              ),
              _StepBtn(icon: Icons.add_rounded, onTap: () => setState(() => _pax = (_pax + 1).clamp(1, 20))),
            ],
          ),
          const SizedBox(height: 14),
          const Text('Notes (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(
            controller: _notesCtrl,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Anything you would like to add...'),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: _submit,
              child: const Text('Send my journey request', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _StepBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppColors.soft,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, color: AppColors.blue),
      ),
    );
  }
}
