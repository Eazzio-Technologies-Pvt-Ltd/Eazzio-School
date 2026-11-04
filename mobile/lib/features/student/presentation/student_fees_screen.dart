import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:eazzio_school/core/theme/app_theme.dart';
import 'package:eazzio_school/core/widgets/skeleton_loader.dart';
import 'package:eazzio_school/features/auth/presentation/auth_controller.dart';
import '../models/student_models.dart';
import 'student_dashboard_screen.dart';

/// Auto-dispose provider fetching the student's fee invoices and payment records.
final studentFeesProvider =
    FutureProvider.autoDispose<List<FeeInvoiceItem>>((ref) async {
  final repo = ref.watch(studentRepositoryProvider);
  return await repo.getFees();
});

/// Presentation screen managing student fee accounts, invoices, and online payments.
///
/// Features:
/// - Aggregated account summary showing total assessed fees, paid amount, and outstanding dues.
/// - Invoice listing with payment status tags (PAID, PARTIAL, PENDING).
/// - In-app online payment processing powered by [Razorpay].
/// - Server-side payment signature verification.
/// - Detailed receipt view dialog with school, student, and transaction voucher metadata.
class StudentFeesScreen extends ConsumerStatefulWidget {
  /// Creates a [StudentFeesScreen] instance.
  const StudentFeesScreen({super.key});

  @override
  ConsumerState<StudentFeesScreen> createState() => _StudentFeesScreenState();
}

class _StudentFeesScreenState extends ConsumerState<StudentFeesScreen> {
  /// Native payment gateway bridge instance for handling online payments.
  late Razorpay _razorpay;

  /// Whether a payment checkout or server verification request is active.
  bool _isProcessing = false;

  /// Identifier of the invoice currently being processed in checkout.
  int? _activeInvoiceId;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    final invoiceId = _activeInvoiceId;
    if (invoiceId == null) return;

    setState(() => _isProcessing = true);
    try {
      final repo = ref.read(studentRepositoryProvider);
      final verified = await repo.verifyPayment(
        invoiceId: invoiceId,
        razorpayOrderId: response.orderId ?? '',
        razorpayPaymentId: response.paymentId ?? '',
        razorpaySignature: response.signature ?? '',
      );

      if (mounted) {
        if (verified) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.successGreen,
              content: Text('Payment verified and updated successfully!'),
            ),
          );
          ref.refresh(studentFeesProvider);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.errorRed,
              content: Text('Payment received but signature verification failed on server.'),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment verification failed. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.errorRed,
          content: Text('Payment could not be completed. Please try again.'),
        ),
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('External Wallet Selected: ${response.walletName}')),
      );
    }
  }

  Future<void> _handlePayment(FeeInvoiceItem invoice) async {
    setState(() => _isProcessing = true);
    try {
      final repo = ref.read(studentRepositoryProvider);
      final orderData = await repo.createFeeOrder(invoice.id);
      final authUser = ref.read(authNotifierProvider).user;

      _activeInvoiceId = invoice.id;

      final options = {
        'key': orderData['razorpayKeyId'],
        'amount': orderData['amount'],
        'name': 'Eazzio School',
        'order_id': orderData['orderId'],
        'description': '${invoice.feeType} (${invoice.invoiceNumber})',
        'timeout': 300,
        'prefill': {
          'contact': authUser?.loginId ?? '',
          'email': '',
        },
        'theme': {
          'color': '#008080',
        }
      };

      _razorpay.open(options);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to initiate payment. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _viewReceipt(int paymentId) async {
    setState(() => _isProcessing = true);
    try {
      final repo = ref.read(studentRepositoryProvider);
      final receipt = await repo.getReceipt(paymentId);

      if (!mounted) return;

      final school = receipt['school'] as Map<String, dynamic>? ?? {};
      final student = receipt['student'] as Map<String, dynamic>? ?? {};
      final invoice = receipt['feeInvoice'] as Map<String, dynamic>? ?? {};

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.verified, color: AppTheme.successGreen),
              const SizedBox(width: 8),
              Text('Payment Receipt',
                  style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(school['schoolName'] ?? 'Eazzio School',
                    style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.bold)),
                if (school['address'] != null)
                  Text(school['address'],
                      style: GoogleFonts.inter(
                          fontSize: 11, color: AppTheme.textMuted)),
                const Divider(height: 20),
                Text(
                    'Receipt No: ${receipt['receiptNumber'] ?? "RCPT-$paymentId"}',
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600, fontSize: 13)),
                Text(
                    'Date: ${(receipt['date'] ?? "").toString().split("T").first}',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppTheme.textMuted)),
                const SizedBox(height: 8),
                Text('Student: ${student['name'] ?? ""}',
                    style: GoogleFonts.inter(fontSize: 13)),
                Text('Student ID: ${student['studentId'] ?? ""}',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppTheme.textMuted)),
                const SizedBox(height: 8),
                Text('Fee Type: ${invoice['feeType'] ?? "Tuition Fee"}',
                    style: GoogleFonts.inter(fontSize: 13)),
                Text('Invoice: ${invoice['invoiceNumber'] ?? ""}',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppTheme.textMuted)),
                Text('Payment Mode: ${receipt['paymentMethod'] ?? "ONLINE"}',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppTheme.textMuted)),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Amount Paid:',
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('₹${receipt['amount']}',
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: AppTheme.successGreen)),
                  ],
                ),
                if (receipt['razorpayPaymentId'] != null) ...[
                  const SizedBox(height: 6),
                  Text('Txn Ref: ${receipt['razorpayPaymentId']}',
                      style: GoogleFonts.inter(
                          fontSize: 10, color: AppTheme.textMuted)),
                ],
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to load receipt. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }


  @override
  Widget build(BuildContext context) {
    final feesAsync = ref.watch(studentFeesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fees & Invoices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(studentFeesProvider),
          ),
        ],
      ),
      body: _isProcessing
          ? const SkeletonListLoader(itemCount: 4, itemHeight: 110)
          : feesAsync.when(
              loading: () => const SkeletonListLoader(itemCount: 4, itemHeight: 110),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.cloud_off_rounded, size: 40, color: AppTheme.errorRed),
                      const SizedBox(height: 8),
                      Text(
                        ref.read(apiClientProvider).parseErrorMessage(err),
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(color: AppTheme.textMuted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              data: (invoices) {
                if (invoices.isEmpty) {
                  return Center(
                    child: Text('No fee invoices issued yet.',
                        style: GoogleFonts.inter(color: AppTheme.textMuted)),
                  );
                }

                final totalPending =
                    invoices.fold(0.0, (acc, inv) => acc + inv.pendingAmount);

                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(studentFeesProvider),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Fee overview card
                      Card(
                        color: totalPending > 0
                            ? const Color(0xFFFEF2F2)
                            : const Color(0xFFF0FDF4),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                              color: totalPending > 0
                                  ? const Color(0xFFFCA5A5)
                                  : const Color(0xFF86EFAC)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    totalPending > 0
                                        ? 'Total Dues Pending'
                                        : 'All Fees Cleared',
                                    style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w600,
                                      color: totalPending > 0
                                          ? AppTheme.errorRed
                                          : AppTheme.successGreen,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '₹${totalPending.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 24,
                                      fontWeight: FontWeight.w800,
                                      color: totalPending > 0
                                          ? AppTheme.errorRed
                                          : AppTheme.successGreen,
                                    ),
                                  ),
                                ],
                              ),
                              Icon(
                                totalPending > 0
                                    ? Icons.error_outline
                                    : Icons.verified_outlined,
                                color: totalPending > 0
                                    ? AppTheme.errorRed
                                    : AppTheme.successGreen,
                                size: 36,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text('Invoices & Receipts',
                          style: GoogleFonts.inter(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),

                      ...invoices.map((inv) {
                        final isPaid = inv.pendingAmount <= 0;
                        final statusColor = isPaid
                            ? AppTheme.successGreen
                            : (inv.status == 'OVERDUE'
                                ? AppTheme.errorRed
                                : AppTheme.warningAmber);

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(inv.invoiceNumber,
                                        style: GoogleFonts.inter(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14)),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color:
                                            statusColor.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        isPaid ? 'PAID' : inv.status,
                                        style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: statusColor),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(inv.feeType,
                                    style: GoogleFonts.inter(
                                        fontSize: 13,
                                        color: AppTheme.textDark)),
                                const SizedBox(height: 4),
                                Text(
                                    'Due Date: ${inv.dueDate.split("T").first}',
                                    style: GoogleFonts.inter(
                                        fontSize: 12,
                                        color: AppTheme.textMuted)),
                                const Divider(height: 20),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                            'Amount: ₹${inv.amount.toStringAsFixed(0)}',
                                            style: GoogleFonts.inter(
                                                fontSize: 12,
                                                color: AppTheme.textMuted)),
                                        Text(
                                            'Pending: ₹${inv.pendingAmount.toStringAsFixed(0)}',
                                            style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                                color: statusColor)),
                                      ],
                                    ),
                                    if (!isPaid)
                                      ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              AppTheme.studentAccent,
                                          minimumSize: const Size(100, 36),
                                        ),
                                        onPressed: () => _handlePayment(inv),
                                        child: const Text('Pay Now',
                                            style: TextStyle(fontSize: 13)),
                                      )
                                    else if (inv.payments.isNotEmpty)
                                      OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor:
                                              AppTheme.successGreen,
                                          side: const BorderSide(
                                              color: AppTheme.successGreen),
                                          minimumSize: const Size(90, 36),
                                        ),
                                        icon: const Icon(Icons.receipt_outlined,
                                            size: 15),
                                        label: const Text('Receipt',
                                            style: TextStyle(fontSize: 12)),
                                        onPressed: () =>
                                            _viewReceipt(inv.payments.first.id),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
