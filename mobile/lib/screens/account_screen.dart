import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state.dart';
import '../theme.dart';
import 'dashboard_screen.dart';
import 'wallet_screen.dart';
import 'affiliate_screen.dart';

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
                    Text(u.name.isEmpty ? u.email : u.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 2),
                    Text(u.email, style: const TextStyle(color: Colors.white70, fontSize: 13)),
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
          _Tile(icon: Icons.info_outline_rounded, title: 'About Masr Guide', subtitle: 'Your trip, from arrival to departure', onTap: () {}),
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

class LoginScreen extends StatefulWidget {
  final bool embedded;
  const LoginScreen({super.key, this.embedded = false});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _register = false;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  String _role = 'customer';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final st = context.read<AppState>();
      if (_register) {
        await st.register(_name.text.trim(), _email.text.trim(), _pass.text, _role);
      } else {
        await st.login(_email.text.trim(), _pass.text);
      }
      if (mounted && !widget.embedded) Navigator.pop(context);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 20),
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(16)),
          child: const Icon(Icons.travel_explore_rounded, color: AppColors.blue, size: 30),
        ),
        const SizedBox(height: 16),
        Text(_register ? 'Create your account' : 'Welcome back', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Book your whole trip in Egypt — from arrival to departure.', style: TextStyle(color: AppColors.text2)),
        const SizedBox(height: 24),
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
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 13)),
        ],
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_register ? 'Create account' : 'Sign in'),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => setState(() => _register = !_register),
            child: Text(_register ? 'Already have an account? Sign in' : "Don't have an account? Register"),
          ),
        ),
      ],
    );
    if (widget.embedded) {
      return SafeArea(child: body);
    }
    return Scaffold(appBar: AppBar(title: Text(_register ? 'Register' : 'Sign in')), body: body);
  }
}
