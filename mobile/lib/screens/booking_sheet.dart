import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../models.dart';
import '../state.dart';
import '../theme.dart';
import 'account_screen.dart';

class BookingSheet extends StatefulWidget {
  final Service service;
  const BookingSheet({super.key, required this.service});
  @override
  State<BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends State<BookingSheet> {
  DateTime? _date;
  int _pax = 1;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final st = context.read<AppState>();
    if (!st.isLoggedIn) {
      Navigator.pop(context);
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    if (_date == null) {
      setState(() => _error = 'Please choose a date');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final b = await st.book(
        serviceId: widget.service.id,
        date: DateFormat('yyyy-MM-dd').format(_date!),
        pax: _pax,
        name: _name.text.trim().isEmpty ? null : _name.text.trim(),
        phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      );
      if (!mounted) return;
      Navigator.pop(context);
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          icon: const Icon(Icons.check_circle_rounded, color: AppColors.green, size: 44),
          title: const Text('Booking confirmed'),
          content: Text('Your reference is ${b.ref}.\nStatus: ${b.status}.'),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done'))],
        ),
      );
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.service.price * _pax;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(width: 42, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(999))),
          ),
          const SizedBox(height: 14),
          Text(widget.service.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              final now = DateTime.now();
              final d = await showDatePicker(
                context: context,
                firstDate: now,
                lastDate: now.add(const Duration(days: 365)),
                initialDate: now.add(const Duration(days: 1)),
              );
              if (d != null) setState(() => _date = d);
            },
            icon: const Icon(Icons.calendar_today_rounded, size: 18),
            label: Text(_date == null ? 'Choose date' : DateFormat('EEE, d MMM yyyy').format(_date!)),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.text,
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadius)),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('Travellers', style: TextStyle(fontWeight: FontWeight.w600)),
              const Spacer(),
              IconButton(onPressed: _pax > 1 ? () => setState(() => _pax--) : null, icon: const Icon(Icons.remove_circle_outline_rounded)),
              Text('$_pax', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              IconButton(onPressed: () => setState(() => _pax++), icon: const Icon(Icons.add_circle_outline_rounded)),
            ],
          ),
          const SizedBox(height: 6),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name (optional)')),
          const SizedBox(height: 10),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone / WhatsApp (optional)')),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 13)),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(color: AppColors.text2)),
              Text('${total.toStringAsFixed(0)} ${widget.service.currency}',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: AppColors.blue)),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Confirm booking'),
            ),
          ),
        ],
      ),
    );
  }
}
