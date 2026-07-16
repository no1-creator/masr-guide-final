import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state.dart';
import '../theme.dart';
import 'dashboard_screen.dart';
import 'wallet_screen.dart';
import 'affiliate_screen.dart';

/// Global navigator key (wired in main.dart) so we can route from anywhere.
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// Call this before any action that needs an account. If the visitor is not
/// logged in, it opens the sign-in / sign-up screen and returns whether they
/// ended up logged in. Works from anywhere in the app.
Future<bool> promptLogin(BuildContext context) async {
  final st = context.read<AppState>();
  if (st.isLoggedIn) return true;
  await Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
  );
  return st.isLoggedIn;
}

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();
    if (!st.isLoggedIn) {
      return const Scaffold(body: LoginScreen(embedded: true));
    }
    final u = st.user!;
    final role = u.role.toLowerCase();
    return Scaffold(
      appBar: AppBar(title: const Text('Account'), actions: [
        IconButton(onPressed: () => context.read<AppState>().logout(), icon: const Icon(Icons.logout_rounded)),
      ]),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.blue, AppColors.blueHover]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: Colors.white24,
                child: Text(u.name.isEmpty ? '?' : u.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 20)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(u.name.isEmpty ? (u.email.isEmpty ? (u.phone ?? 'RaGo user') : u.email) : u.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 2),
                    Text(u.phone != null && u.phone!.isNotEmpty ? u.phone! : u.email, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(999)),
                      child: Text(role.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ]),
          ),
          const SizedBox(height: 18),
          if (role == 'admin' || role == 'vendor')
            _Tile(icon: Icons.dashboard_rounded, title: 'Control panel', subtitle: role == 'admin' ? 'Platform overview & management' : 'Your services & bookings', onTap: () => _go(context, const DashboardScreen())),
          if (role == 'affiliate')
            _Tile(icon: Icons.link_rounded, title: 'My referral link & QR', subtitle: 'Share and earn commission', onTap: () => _go(context, const AffiliateScreen())),
          if (role == 'vendor' || role == 'affiliate')
            _Tile(icon: Icons.account_balance_wallet_rounded, title: 'Wallet', subtitle: 'Balance & payouts', onTap: () => _go(context, const WalletScreen())),
          _Tile(icon: Icons.language_rounded, title: 'Language', subtitle: 'English (more coming soon)', onTap: () {}),
          _Tile(icon: Icons.info_outline_rounded, title: 'About RaGo', subtitle: 'Your trip, from arrival to departure', onTap: () {}),
        ],
      ),
    );
  }

  void _go(BuildContext c, Widget w) => Navigator.of(c).push(MaterialPageRoute(builder: (_) => w));
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _Tile({required this.icon, required this.title, required this.subtitle, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(kRadius),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(kRadius), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: AppColors.blue, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(subtitle, style: const TextStyle(color: AppColors.text2, fontSize: 12)),
                ]),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.text2),
            ]),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Sign-in / Sign-up screen: Email · Phone (OTP) · Google · Apple
// =============================================================================
enum _Mode { email, phone }

class LoginScreen extends StatefulWidget {
  final bool embedded;
  const LoginScreen({super.key, this.embedded = false});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  _Mode _mode = _Mode.email;

  // email path
  bool _register = false;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  String _role = 'customer';

  // phone path
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _otpName = TextEditingController();
  bool _otpSent = false;

  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _pass.dispose();
    _phone.dispose();
    _otp.dispose();
    _otpName.dispose();
    super.dispose();
  }

  AppState get _st => context.read<AppState>();

  void _done() {
    if (mounted && !widget.embedded) Navigator.pop(context);
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.blue));
  }

  Future<void> _submitEmail() async {
    setState(() { _busy = true; _error = null; });
    try {
      if (_register) {
        await _st.register(_name.text.trim(), _email.text.trim(), _pass.text, _role);
      } else {
        await _st.login(_email.text.trim(), _pass.text);
      }
      _done();
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendOtp() async {
    if (_phone.text.trim().length < 8) {
      setState(() => _error = 'Please enter a valid phone number.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      final res = await _st.requestOtp(_phone.text.trim());
      setState(() => _otpSent = true);
      final dev = res['dev_code'];
      _snack(dev != null ? 'Test code: $dev' : 'We sent a code to your phone.');
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.trim().length < 4) {
      setState(() => _error = 'Enter the code you received.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await _st.verifyOtp(_phone.text.trim(), _otp.text.trim(), name: _otpName.text.trim());
      _done();
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // Google / Apple: backend is ready. To activate on-device sign-in, add the
  // packages + credentials (see the chat instructions), then replace the body
  // of these handlers with the real SDK call that gets a token and calls
  // _st.loginWithGoogle(idToken) / _st.loginWithApple(identityToken).
  void _socialSoon(String provider) {
    showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Continue with $provider'),
        content: Text('$provider sign-in will be activated once your $provider developer credentials are added to the app. The server is already set up for it.'),
        actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 12),
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.travel_explore_rounded, color: AppColors.blue, size: 30),
        ),
        const SizedBox(height: 16),
        Text(_register && _mode == _Mode.email ? 'Create your account' : 'Welcome to RaGo',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Book your whole trip in Egypt — from arrival to departure.', style: TextStyle(color: AppColors.text2)),
        const SizedBox(height: 20),

        // mode switch
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: AppColors.soft, borderRadius: BorderRadius.circular(999)),
          child: Row(children: [
            _segment('Email', _mode == _Mode.email, () => setState(() { _mode = _Mode.email; _error = null; })),
            _segment('Phone', _mode == _Mode.phone, () => setState(() { _mode = _Mode.phone; _error = null; })),
          ]),
        ),
        const SizedBox(height: 18),

        if (_mode == _Mode.email) ..._emailFields() else ..._phoneFields(),

        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 13)),
        ],

        const SizedBox(height: 22),
        Row(children: const [
          Expanded(child: Divider(color: AppColors.border)),
          Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text('or continue with', style: TextStyle(color: AppColors.text2, fontSize: 12))),
          Expanded(child: Divider(color: AppColors.border)),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: _socialBtn('Google', Icons.g_mobiledata_rounded, () => _socialSoon('Google'))),
          const SizedBox(width: 12),
          Expanded(child: _socialBtn('Apple', Icons.apple_rounded, () => _socialSoon('Apple'))),
        ]),
      ],
    );
    if (widget.embedded) return SafeArea(child: body);
    return Scaffold(appBar: AppBar(title: const Text('Sign in')), body: body);
  }

  List<Widget> _emailFields() => [
        if (_register) ...[
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
          const SizedBox(height: 12),
        ],
        TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')),
        const SizedBox(height: 12),
        TextField(controller: _pass, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
        if (_register) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _role,
            decoration: const InputDecoration(labelText: 'Account type'),
            items: const [
              DropdownMenuItem(value: 'customer', child: Text('Traveller')),
              DropdownMenuItem(value: 'vendor', child: Text('Service provider')),
              DropdownMenuItem(value: 'affiliate', child: Text('Affiliate / Marketer')),
            ],
            onChanged: (v) => setState(() => _role = v ?? 'customer'),
          ),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _busy ? null : _submitEmail,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_register ? 'Create account' : 'Sign in'),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: TextButton(
            onPressed: () => setState(() { _register = !_register; _error = null; }),
            child: Text(_register ? 'Already have an account? Sign in' : "Don't have an account? Register"),
          ),
        ),
      ];

  List<Widget> _phoneFields() => [
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          enabled: !_otpSent,
          decoration: const InputDecoration(labelText: 'Phone number', hintText: '+20 1XX XXX XXXX'),
        ),
        if (!_otpSent) ...[
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busy ? null : _sendOtp,
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Send code'),
            ),
          ),
        ] else ...[
          const SizedBox(height: 12),
          TextField(
            controller: _otp,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Verification code'),
          ),
          const SizedBox(height: 12),
          TextField(controller: _otpName, decoration: const InputDecoration(labelText: 'Your name (optional)')),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busy ? null : _verifyOtp,
              child: _busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Verify & continue'),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: _busy ? null : () => setState(() { _otpSent = false; _otp.clear(); _error = null; }),
              child: const Text('Change number / resend'),
            ),
          ),
        ],
      ];

  Widget _segment(String label, bool active, VoidCallback onTap) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: active ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
              boxShadow: active ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6)] : null,
            ),
            child: Text(label,
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w700, color: active ? AppColors.blue : AppColors.text2)),
          ),
        ),
      );

  Widget _socialBtn(String label, IconData icon, VoidCallback onTap) => OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.text,
          side: const BorderSide(color: AppColors.border),
          padding: const EdgeInsets.symmetric(vertical: 13),
        ),
        icon: Icon(icon, size: 22, color: AppColors.blue),
        label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        onPressed: _busy ? null : onTap,
      );
}
