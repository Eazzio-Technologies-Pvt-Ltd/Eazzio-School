import 'package:flutter/material.dart';

/// Lightweight, zero-dependency shimmer animation for skeleton placeholders.
class SkeletonShimmer extends StatefulWidget {
  final Widget child;

  const SkeletonShimmer({super.key, required this.child});

  @override
  State<SkeletonShimmer> createState() => _SkeletonShimmerState();
}

class _SkeletonShimmerState extends State<SkeletonShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: const Alignment(-1.5, -0.3),
              end: const Alignment(1.5, 0.3),
              colors: const [
                Color(0xFFE2E8F0),
                Color(0xFFF8FAFC),
                Color(0xFFE2E8F0),
              ],
              stops: [
                (_controller.value - 0.3).clamp(0.0, 1.0),
                _controller.value.clamp(0.0, 1.0),
                (_controller.value + 0.3).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// Generic rounded skeleton bone block
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double borderRadius;
  final EdgeInsetsGeometry? margin;

  const SkeletonBox({
    super.key,
    this.width,
    required this.height,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      margin: margin,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Ready-to-use skeleton placeholder for list/card views across student and teacher screens
class SkeletonListLoader extends StatelessWidget {
  final int itemCount;
  final double itemHeight;
  final EdgeInsetsGeometry padding;

  const SkeletonListLoader({
    super.key,
    this.itemCount = 6,
    this.itemHeight = 90,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonShimmer(
      child: ListView.separated(
        padding: padding,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: itemCount,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          return Container(
            height: itemHeight,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const SkeletonBox(
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SkeletonBox(
                        width: MediaQuery.of(context).size.width * 0.5,
                        height: 16,
                        borderRadius: 4,
                      ),
                      const SizedBox(height: 8),
                      SkeletonBox(
                        width: MediaQuery.of(context).size.width * 0.3,
                        height: 12,
                        borderRadius: 4,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Ready-to-use skeleton placeholder for dashboard screens (metrics grid + recent items)
class SkeletonDashboardLoader extends StatelessWidget {
  const SkeletonDashboardLoader({super.key});

  @override
  Widget build(BuildContext context) {
    return const SkeletonShimmer(
      child: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        physics: NeverScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome card skeleton
            SkeletonBox(
              height: 100,
              borderRadius: 16,
              margin: EdgeInsets.only(bottom: 16),
            ),
            // Metric cards row
            Row(
              children: [
                Expanded(child: SkeletonBox(height: 80, borderRadius: 12)),
                SizedBox(width: 12),
                Expanded(child: SkeletonBox(height: 80, borderRadius: 12)),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: SkeletonBox(height: 80, borderRadius: 12)),
                SizedBox(width: 12),
                Expanded(child: SkeletonBox(height: 80, borderRadius: 12)),
              ],
            ),
            SizedBox(height: 24),
            // Section heading
            SkeletonBox(width: 140, height: 20, borderRadius: 4),
            SizedBox(height: 12),
            // Recent items list
            SkeletonBox(height: 72, borderRadius: 12),
            SizedBox(height: 10),
            SkeletonBox(height: 72, borderRadius: 12),
            SizedBox(height: 10),
            SkeletonBox(height: 72, borderRadius: 12),
          ],
        ),
      ),
    );
  }
}
