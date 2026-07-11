import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/common.dart';

class AffiliateScreen extends StatefulWidget {
  const AffiliateScreen({super.key});
  @override
  State<AffiliateScreen> createState() => _AffiliateScreenState();
}

class _AffiliateScreenState extends State<AffiliateScreen> {
  Future<Map<String, dynamic>>? _future;
  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().affiliate();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My referral link')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (c, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErrorState('${snap.error}', onRetry: () => setState(() => _future = context.read<AppState>().affiliate()));
          }
          final d = snap.data ?? {};
          final link = '${d['link'] ?? ''}';
          final code = '${d['code'] ?? d['ref_code'] ?? ''}';
          final commission = d['commission_rate'] ?? d['commission'] ?? d['rate'];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (link.isNotEmpty)
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
                    child: QrImageView(data: link, size: 200, backgroundColor: Colors.white),
                  ),
                ),
              const SizedBox(height: 20),
              if (code.isNotEmpty) ...[
                const Text('Your code', style: TextStyle(color: AppColors.text2, fontSize: 13)),
                const SizedBox(height: 4),
                Text(code, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                const SizedBox(height: 16),
              ],
              const Text('Your referral link', style: TextStyle(color: AppColors.text2, fontSize: 13)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(color: AppColors.soft, borderRadius: BorderRadius.circular(kRadius), border: Border.all(color: AppColors.border)),
                child: Row(children: [
                  Expanded(child: Text(link, style: const TextStyle(fontSize: 13))),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded, size: 18, color: AppColors.blue),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: link));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied')));
                    },
                  ),
                ]),
              ),
              if (commission != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.blueSoft, borderRadius: BorderRadius.circular(kRadius)),
                  child: Row(children: [
                    const Icon(Icons.percent_rounded, color: AppColors.blue),
                    const SizedBox(width: 10),
                    Expanded(child: Text('You earn commission on every booking made through your link.', style: const TextStyle(fontSize: 13))),
                    Pill('${(commission is num ? (commission <= 1 ? commission * 100 : commission) : commission)}%'),
                  ]),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
