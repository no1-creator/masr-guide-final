import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/common.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});
  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Future<Wallet>? _future;
  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().wallet();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: FutureBuilder<Wallet>(
        future: _future,
        builder: (c, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return ErrorState('${snap.error}', onRetry: () => setState(() => _future = context.read<AppState>().wallet()));
          }
          final w = snap.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.green, Color(0xFF2F7E54)]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Available balance', style: TextStyle(color: Colors.white70)),
                    const SizedBox(height: 6),
                    Text('${w.balance.toStringAsFixed(2)} ${w.currency}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 28)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text('Transactions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 8),
              if (w.transactions.isEmpty)
                const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No transactions yet', style: TextStyle(color: AppColors.text2))))
              else
                ...w.transactions.map((t) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(kRadius), border: Border.all(color: AppColors.border)),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(t.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                            if (t.date.isNotEmpty) Text(t.date, style: const TextStyle(color: AppColors.text2, fontSize: 12)),
                          ]),
                        ),
                        Text('${t.amount >= 0 ? '+' : ''}${t.amount.toStringAsFixed(2)}',
                            style: TextStyle(fontWeight: FontWeight.w700, color: t.amount >= 0 ? AppColors.green : AppColors.red)),
                      ]),
                    )),
            ],
          );
        },
      ),
    );
  }
}
