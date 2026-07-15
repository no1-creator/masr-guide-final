import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../state.dart';
import '../theme.dart';

// =============================================================================
// Group Trips / "Create your journey" — mirrors the website feature.
//
// Fully wired to the backend:
//   • Create  -> POST /api/group-trips/request   (title, itinerary, date_from, date_to)
//   • Detail  -> GET  /api/group-trips/:id        (trip, members, candidate_days)
//   • Mine    -> GET  /api/group-trips/:id/me      (my membership + available_days)
//   • Join    -> POST /api/group-trips/:id/join   (seats, name, phone, available_days[])
//   • Vote    -> POST /api/group-trips/:id/vote   (date)  — members only
//
// The creator picks a DATE WINDOW they are available. Everyone who joins picks
// which days within that window suits them. Only members vote — and only on the
// days they said they're available for. When the endpoint isn't reachable the
// screen still falls back to the built-in demo trips (offline-first).
// =============================================================================

num _num(dynamic v) => v is num ? v : num.tryParse('${v ?? ''}') ?? 0;

String usd(num v) => '\$${v.toStringAsFixed(0)}';

const List<String> _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

String _fmt(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String _prettyDate(String iso) {
  final d = DateTime.tryParse(iso);
  if (d == null) return iso;
  return '${_months[d.month - 1]} ${d.day}';
}

/// All calendar days between two YYYY-MM-DD strings (inclusive, capped).
List<String> _daysBetween(String? from, String? to) {
  final a = DateTime.tryParse('$from');
  final b = DateTime.tryParse('$to');
  if (a == null || b == null) return const [];
  final out = <String>[];
  var d = DateTime(a.year, a.month, a.day);
  final end = DateTime(b.year, b.month, b.day);
  var guard = 0;
  while (!d.isAfter(end) && guard < 120) {
    out.add(_fmt(d));
    d = d.add(const Duration(days: 1));
    guard++;
  }
  return out;
}

String _statusLabel(String s) {
  switch (s) {
    case 'open':
      return 'Filling up';
    case 'voting':
      return 'Voting open';
    case 'quoted':
      return 'Quoted';
    case 'confirmed':
      return 'Confirmed';
    case 'closed':
      return 'Closed';
    default:
      return 'Open';
  }
}

class GroupTrip {
  final int id; // 0 = demo / offline
  final String name;
  final num priceUsd;
  final int daysLeft;
  final int joined;
  final int minGroup;
  final bool vote;
  final String status;
  final String? dateFrom;
  final String? dateTo;
  final String itinerary;

  const GroupTrip({
    required this.name,
    required this.priceUsd,
    required this.daysLeft,
    required this.joined,
    this.id = 0,
    this.minGroup = 10,
    this.vote = false,
    this.status = '',
    this.dateFrom,
    this.dateTo,
    this.itinerary = '',
  });

  double get progress {
    if (minGroup <= 0) return 0;
    final p = joined / minGroup;
    return p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  static String _mainPlace(String itinerary, String fallback) {
    final m = RegExp(r'Places:\s*([^\n,]+)', caseSensitive: false)
        .firstMatch(itinerary);
    final v = m?.group(1)?.trim();
    return (v != null && v.isNotEmpty) ? v : fallback;
  }

  static int _daysLeftFrom(Map<String, dynamic> j) {
    final raw = j['days_left'] ?? j['deadline_days'];
    if (raw != null) return _num(raw).toInt();
    final iso = j['vote_deadline'] ?? j['deadline'] ?? j['date_to'];
    final d = DateTime.tryParse('${iso ?? ''}');
    if (d == null) return 0;
    final diff = d.difference(DateTime.now()).inDays;
    return diff < 0 ? 0 : diff;
  }

  factory GroupTrip.fromJson(Map<String, dynamic> j) {
    final itinerary = '${j['itinerary_text'] ?? ''}';
    final title = '${j['title'] ?? j['name'] ?? j['destination'] ?? ''}'.trim();
    final status = '${j['status'] ?? ''}';
    return GroupTrip(
      id: _num(j['id']).toInt(),
      name: title.isNotEmpty ? title : _mainPlace(itinerary, 'Group trip'),
      priceUsd: _num(j['current_per_person'] ??
          j['small_per_person'] ??
          j['price_small'] ??
          j['price'] ??
          j['usd'] ??
          0),
      daysLeft: _daysLeftFrom(j),
      joined: _num(j['members_count'] ?? j['joined'] ?? j['members'] ?? 0).toInt(),
      minGroup: _num(j['min_people'] ?? j['min_group'] ?? 10).toInt(),
      vote: status == 'voting' || j['vote'] == true || j['voting'] == true,
      status: status,
      dateFrom: j['date_from']?.toString(),
      dateTo: j['date_to']?.toString(),
      itinerary: itinerary,
    );
  }
}

// The same 10 trips shown on the website strip (USD, per person) — offline demo.
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
          const Text('Design your own trip — pick the days you are free, other travellers join and share the cost.',
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
          height: 148,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: trips.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
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
        width: 150,
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(13),
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
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.orange,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(usd(trip.priceUsd),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11.5)),
                ),
                const Spacer(),
                if (trip.vote)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.16),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('VOTE',
                        style: TextStyle(color: Color(0xFFFFD9A8), fontWeight: FontWeight.w800, fontSize: 9, letterSpacing: 0.5)),
                  ),
              ],
            ),
            const SizedBox(height: 9),
            Text(
              trip.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13, height: 1.2),
            ),
            const Spacer(),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: trip.progress,
                minHeight: 4,
                backgroundColor: Colors.white24,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.orange),
              ),
            ),
            const SizedBox(height: 7),
            Row(
              children: [
                const Icon(Icons.group_rounded, size: 12, color: Color(0xFFDCE6E9)),
                const SizedBox(width: 3),
                Text('${trip.joined}/${trip.minGroup}',
                    style: const TextStyle(color: Color(0xFFDCE6E9), fontSize: 10.5, fontWeight: FontWeight.w600)),
                const Spacer(),
                const Icon(Icons.schedule_rounded, size: 12, color: Color(0xFFDCE6E9)),
                const SizedBox(width: 3),
                Text('${trip.daysLeft}d',
                    style: const TextStyle(color: Color(0xFFDCE6E9), fontSize: 10.5, fontWeight: FontWeight.w600)),
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
                const Text('Join a trip below, pick the days you are free, then vote once the group fills up.',
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
// Trip detail bottom sheet (join / vote) — live backend + demo fallback.
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
  // demo path
  int _voteIndex = 1;

  // live path
  bool _loading = false;
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _detail;
  Map<String, dynamic>? _me;

  final _joinName = TextEditingController();
  final _joinPhone = TextEditingController();
  final Set<String> _joinDays = <String>{};
  int _joinSeats = 1;

  AppState get _app => widget.rootContext.read<AppState>();

  @override
  void initState() {
    super.initState();
    if (widget.trip.id > 0) _load(initial: true);
  }

  @override
  void dispose() {
    _joinName.dispose();
    _joinPhone.dispose();
    super.dispose();
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(widget.rootContext).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.blue),
    );
  }

  Future<void> _load({bool initial = false}) async {
    if (widget.trip.id <= 0) return;
    if (initial) setState(() => _loading = true);
    try {
      final res = await _app.api.get('/api/group-trips/${widget.trip.id}');
      final detail = Map<String, dynamic>.from(res as Map);
      Map<String, dynamic>? me;
      if (_app.isLoggedIn) {
        try {
          me = Map<String, dynamic>.from(
              await _app.api.get('/api/group-trips/${widget.trip.id}/me') as Map);
        } catch (_) {}
      }
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _me = me;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Could not load this trip.';
      });
    }
  }

  Future<void> _join(List<String> rangeDays) async {
    if (!_app.isLoggedIn) {
      _snack('Log in from the Account tab to join this trip.');
      return;
    }
    if (rangeDays.isNotEmpty && _joinDays.isEmpty) {
      _snack('Please choose at least one day you are available.');
      return;
    }
    if (_joinName.text.trim().isEmpty) {
      _snack('Please enter your name.');
      return;
    }
    setState(() => _busy = true);
    try {
      final days = _joinDays.toList()..sort();
      await _app.api.post('/api/group-trips/${widget.trip.id}/join', {
        'seats': _joinSeats,
        'name': _joinName.text.trim(),
        'phone': _joinPhone.text.trim(),
        'available_days': days,
      });
      await _load();
      _snack('You joined the trip! You can vote on a day once voting opens.');
    } catch (e) {
      _snack(e is ApiException ? e.message : 'Could not join. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _vote(String date) async {
    if (!_app.isLoggedIn) {
      _snack('Log in from the Account tab to vote.');
      return;
    }
    setState(() => _busy = true);
    try {
      await _app.api.post('/api/group-trips/${widget.trip.id}/vote', {'date': date});
      await _load();
      _snack('Your vote for ${_prettyDate(date)} was recorded.');
    } catch (e) {
      _snack(e is ApiException ? e.message : 'Could not record your vote.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.78,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scroll) {
        final handle = Center(
          child: Container(
            width: 42,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        );
        if (widget.trip.id <= 0) return _buildDemo(scroll, handle);
        if (_loading) {
          return ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [handle, const SizedBox(height: 48), const Center(child: CircularProgressIndicator()), const SizedBox(height: 48)],
          );
        }
        return _buildLive(scroll, handle);
      },
    );
  }

  // ---------------------------------------------------------------------------
  // LIVE trip (backed by the API)
  // ---------------------------------------------------------------------------
  Widget _buildLive(ScrollController scroll, Widget handle) {
    final trip = widget.trip;
    final t = (_detail?['trip'] as Map?)?.cast<String, dynamic>() ?? const {};
    final candidateDays = (_detail?['candidate_days'] as List?) ?? const [];
    final member = _me?['member'] as Map?;
    final isMember = member != null;
    final myAvailable = <String>[
      ...((member?['available_days'] as List?)?.map((e) => '$e') ?? const [])
    ];
    final myVote = member?['vote_date'] == null ? null : '${member!['vote_date']}';

    final status = '${t['status'] ?? trip.status}';
    final dateFrom = t['date_from']?.toString() ?? trip.dateFrom;
    final dateTo = t['date_to']?.toString() ?? trip.dateTo;
    final joined = _num(t['members_count'] ?? trip.joined).toInt();
    final minGroup = _num(t['min_people'] ?? trip.minGroup).toInt();
    final price = _num(t['current_per_person'] ??
        t['small_per_person'] ??
        t['price_small'] ??
        trip.priceUsd);
    final progress = minGroup <= 0 ? 0.0 : (joined / minGroup).clamp(0.0, 1.0);
    final rangeDays = _daysBetween(dateFrom, dateTo);
    final showVoting = status == 'voting' || candidateDays.isNotEmpty;

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        handle,
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
                Text(usd(price),
                    style: const TextStyle(color: AppColors.blue, fontWeight: FontWeight.w800, fontSize: 22)),
                const Text('per person', style: TextStyle(color: AppColors.text2, fontSize: 11)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            _StatBox(icon: Icons.group_rounded, label: 'Joined', value: '$joined/$minGroup'),
            const SizedBox(width: 10),
            _StatBox(icon: Icons.flag_rounded, label: 'Status', value: _statusLabel(status)),
          ],
        ),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: progress.toDouble(),
            minHeight: 7,
            backgroundColor: AppColors.soft,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.orange),
          ),
        ),
        const SizedBox(height: 6),
        Text('${(minGroup - joined).clamp(0, minGroup)} more travellers needed to confirm this trip.',
            style: const TextStyle(color: AppColors.text2, fontSize: 12.5)),
        if (dateFrom != null && dateTo != null) ...[
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.date_range_rounded, size: 18, color: AppColors.blue),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Available window: ${_prettyDate(dateFrom)} – ${_prettyDate(dateTo)}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
              ),
            ],
          ),
        ],
        const SizedBox(height: 22),
        const Text("What's included", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
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

        // ----- Voting (members only) -----
        if (showVoting) ...[
          const SizedBox(height: 20),
          const Text('Vote on the departure date',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Only members can vote — and only for the days they said they are available. The day with the most votes wins.',
              style: TextStyle(color: AppColors.text2, fontSize: 12.5, height: 1.3)),
          const SizedBox(height: 10),
          if (!isMember)
            _noteBox('Join the trip below to vote on the departure day.')
          else if (candidateDays.isEmpty)
            _noteBox('Voting opens once enough travellers join. Your available days are saved.')
          else
            ...candidateDays.map((c) {
              final m = Map<String, dynamic>.from(c as Map);
              final date = '${m['date']}';
              final votes = _num(m['votes']).toInt();
              final avail = _num(m['available_count']).toInt();
              final canVote = myAvailable.contains(date);
              final mine = myVote == date;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(kRadius),
                  onTap: (_busy || !canVote) ? null : () => _vote(date),
                  child: Opacity(
                    opacity: canVote ? 1 : 0.5,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: mine ? AppColors.blueSoft : AppColors.soft,
                        borderRadius: BorderRadius.circular(kRadius),
                        border: Border.all(color: mine ? AppColors.blue : AppColors.border, width: mine ? 1.5 : 1),
                      ),
                      child: Row(
                        children: [
                          Icon(mine ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
                              size: 20, color: mine ? AppColors.blue : AppColors.text2),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(_prettyDate(date),
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          ),
                          Text('$votes votes · $avail free',
                              style: const TextStyle(color: AppColors.text2, fontSize: 12)),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
        ],

        const SizedBox(height: 20),

        // ----- Join / membership -----
        if (isMember)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.green.withOpacity(0.10),
              borderRadius: BorderRadius.circular(kRadius),
              border: Border.all(color: AppColors.green.withOpacity(0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.check_circle_rounded, color: AppColors.green, size: 20),
                    SizedBox(width: 8),
                    Text("You're in this trip", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  ],
                ),
                if (myAvailable.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Your available days: ${myAvailable.map(_prettyDate).join(', ')}',
                      style: const TextStyle(color: AppColors.text2, fontSize: 12.5, height: 1.3)),
                ],
              ],
            ),
          )
        else if (!_app.isLoggedIn)
          _noteBox('Log in from the Account tab to join this trip and pick your available days.')
        else if (status == 'open') ...[
          const Text('Choose the days you can travel',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Pick every day within the window that works for you. We use these to find the best departure day.',
              style: TextStyle(color: AppColors.text2, fontSize: 12.5, height: 1.3)),
          const SizedBox(height: 10),
          if (rangeDays.isEmpty)
            _noteBox('The organiser has not set a date window yet.')
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: rangeDays.map((d) {
                final sel = _joinDays.contains(d);
                return GestureDetector(
                  onTap: () => setState(() => sel ? _joinDays.remove(d) : _joinDays.add(d)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: sel ? AppColors.blue : AppColors.soft,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: sel ? AppColors.blue : AppColors.border),
                    ),
                    child: Text(_prettyDate(d),
                        style: TextStyle(
                            color: sel ? Colors.white : AppColors.text,
                            fontWeight: FontWeight.w600,
                            fontSize: 12.5)),
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 16),
          const Text('Seats', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          Row(
            children: [
              _StepBtn(icon: Icons.remove_rounded, onTap: () => setState(() => _joinSeats = (_joinSeats - 1).clamp(1, 10))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Text('$_joinSeats', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
              ),
              _StepBtn(icon: Icons.add_rounded, onTap: () => setState(() => _joinSeats = (_joinSeats + 1).clamp(1, 10))),
            ],
          ),
          const SizedBox(height: 14),
          const Text('Your name', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(controller: _joinName, decoration: const InputDecoration(hintText: 'Full name')),
          const SizedBox(height: 12),
          const Text('Phone (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(controller: _joinPhone, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: 'WhatsApp number')),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: _busy ? null : () => _join(rangeDays),
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Join this trip', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ] else
          _noteBox('This trip is no longer open for new members.'),

        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 12.5)),
        ],
      ],
    );
  }

  Widget _noteBox(String msg) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.soft,
          borderRadius: BorderRadius.circular(kRadius),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(msg, style: const TextStyle(color: AppColors.text2, fontSize: 12.5, height: 1.3)),
      );

  // ---------------------------------------------------------------------------
  // DEMO trip (offline fallback) — unchanged behaviour
  // ---------------------------------------------------------------------------
  Widget _buildDemo(ScrollController scroll, Widget handle) {
    final trip = widget.trip;
    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        handle,
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
        const Text("What's included", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
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
// "Create your journey" request sheet — now with a DATE RANGE (availability
// window) instead of a single day, and posts to the real backend.
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
  DateTimeRange? _range;
  bool _busy = false;
  String? _error;

  AppState get _app => widget.rootContext.read<AppState>();

  @override
  void dispose() {
    _destCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      initialDateRange: _range ??
          DateTimeRange(
            start: today.add(const Duration(days: 14)),
            end: today.add(const Duration(days: 18)),
          ),
    );
    if (picked != null) setState(() => _range = picked);
  }

  Future<void> _submit() async {
    if (!_app.isLoggedIn) {
      setState(() => _error = 'Please log in from the Account tab first.');
      return;
    }
    final dest = _destCtrl.text.trim();
    if (dest.isEmpty) {
      setState(() => _error = 'Please enter a destination.');
      return;
    }
    if (_range == null) {
      setState(() => _error = 'Please choose the date window you are available.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final notes = _notesCtrl.text.trim();
      await _app.api.post('/api/group-trips/request', {
        'title': dest,
        'itinerary_text': notes.isEmpty ? 'Places: $dest' : 'Places: $dest\n\n$notes',
        'date_from': _fmt(_range!.start),
        'date_to': _fmt(_range!.end),
      });
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(widget.rootContext).showSnackBar(
        SnackBar(
          content: Text('Journey request sent for "$dest". We will open it for others to join.'),
          backgroundColor: AppColors.blue,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e is ApiException ? e.message : 'Something went wrong. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final rangeLabel = _range == null
        ? 'Pick the days you are available'
        : '${_prettyDate(_fmt(_range!.start))} – ${_prettyDate(_fmt(_range!.end))}';
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
          const Text('Tell us where you want to go and which days you are free. We open the trip so other travellers can join, pick days that suit them, then vote on the best departure day.',
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
          const SizedBox(height: 14),
          const Text('Available date window', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          InkWell(
            borderRadius: BorderRadius.circular(kRadius),
            onTap: _pickRange,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.soft,
                borderRadius: BorderRadius.circular(kRadius),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.date_range_rounded, size: 18, color: AppColors.blue),
                  const SizedBox(width: 10),
                  Text(rangeLabel,
                      style: TextStyle(color: _range == null ? AppColors.text2 : AppColors.text, fontSize: 14)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text('Notes (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(
            controller: _notesCtrl,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Places you want to see, budget, anything else...'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 12.5)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.orange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Send my journey request', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
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
