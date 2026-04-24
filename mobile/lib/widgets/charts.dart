import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:smart_city_app/core/constants/colors.dart';

class CategoryBarChart extends StatelessWidget {
  final Map<String, int> data;
  final String title;

  const CategoryBarChart({
    super.key,
    required this.data,
    this.title = 'By Category',
  });

  static final categoryColors = {
    'ROAD': const Color(0xFF2196F3),
    'LIGHTING': const Color(0xFFFFC107),
    'WASTE': const Color(0xFF4CAF50),
    'WATER': const Color(0xFF03A9F4),
    'SAFETY': const Color(0xFFF44336),
    'PUBLIC_PROPERTY': const Color(0xFF9C27B0),
    'OTHER': const Color(0xFF607D8B),
  };

  static final categoryLabels = {
    'ROAD': 'Roads',
    'LIGHTING': 'Lighting',
    'WASTE': 'Waste',
    'WATER': 'Water',
    'SAFETY': 'Safety',
    'PUBLIC_PROPERTY': 'Public',
    'OTHER': 'Other',
  };

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final entries = data.entries.toList();
    final maxY = entries
        .map((e) => e.value)
        .reduce((a, b) => a > b ? a : b)
        .toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxY * 1.2,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final key = entries[groupIndex].key;
                        return BarTooltipItem(
                          '${categoryLabels[key] ?? key}: ${rod.toY.toInt()}',
                          const TextStyle(color: Colors.white),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < entries.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Icon(
                                _getCategoryIcon(entries[index].key),
                                color:
                                    categoryColors[entries[index].key] ??
                                    AppColors.primary,
                                size: 20,
                              ),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text(
                          value.toInt().toString(),
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxY > 0 ? maxY / 4 : 1,
                    getDrawingHorizontalLine: (value) =>
                        FlLine(color: Colors.grey.shade300, strokeWidth: 1),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: entries.asMap().entries.map((entry) {
                    final index = entry.key;
                    final e = entry.value;
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.toDouble(),
                          color: categoryColors[e.key] ?? AppColors.primary,
                          width: 24,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(6),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'ROAD':
        return Icons.add_road;
      case 'LIGHTING':
        return Icons.lightbulb;
      case 'WASTE':
        return Icons.delete;
      case 'WATER':
        return Icons.water_drop;
      case 'SAFETY':
        return Icons.security;
      case 'PUBLIC_PROPERTY':
        return Icons.account_balance;
      default:
        return Icons.category;
    }
  }
}

class MonthlyLineChart extends StatelessWidget {
  final Map<String, int> data;
  final String title;

  const MonthlyLineChart({
    super.key,
    required this.data,
    this.title = 'Monthly Trend',
  });

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final entries = data.entries.toList();
    final maxY = entries
        .map((e) => e.value)
        .reduce((a, b) => a > b ? a : b)
        .toDouble();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxY > 0 ? maxY / 4 : 1,
                    getDrawingHorizontalLine: (value) =>
                        FlLine(color: Colors.grey.shade300, strokeWidth: 1),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: 1,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < entries.length) {
                            final month = entries[index].key.split('-').last;
                            return Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                month,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text(
                          value.toInt().toString(),
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: entries.asMap().entries.map((e) {
                        return FlSpot(
                          e.key.toDouble(),
                          e.value.value.toDouble(),
                        );
                      }).toList(),
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3,
                      dotData: FlDotData(
                        show: true,
                        getDotPainter: (spot, percent, barData, index) =>
                            FlDotCirclePainter(
                              radius: 4,
                              color: AppColors.primary,
                              strokeWidth: 2,
                              strokeColor: Colors.white,
                            ),
                      ),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.primary.withAlpha(51),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class StatusPieChart extends StatelessWidget {
  final Map<String, int> data;

  const StatusPieChart({super.key, required this.data});

  static final statusColors = {
    'SUBMITTED': AppColors.statusSoumise,
    'VALIDATED': AppColors.statusValidee,
    'ASSIGNED': AppColors.statusAssignee,
    'IN_PROGRESS': AppColors.statusEnCours,
    'RESOLVED': AppColors.statusResolue,
    'CLOSED': AppColors.statusCloturee,
    'REJECTED': AppColors.statusRejetee,
  };

  static const statusLabels = {
    'SUBMITTED': 'Soumise',
    'VALIDATED': 'Validée',
    'ASSIGNED': 'Assignée',
    'IN_PROGRESS': 'En cours',
    'RESOLVED': 'Résolue',
    'CLOSED': 'Clôturée',
    'REJECTED': 'Rejetée',
  };

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final total = data.values.fold(0, (a, b) => a + b);
    final sections = data.entries.map((e) {
      return PieChartSectionData(
        color: statusColors[e.key] ?? Colors.grey,
        value: e.value.toDouble(),
        title: '${((e.value / total) * 100).toStringAsFixed(0)}%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Status Distribution',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: Row(
                children: [
                  Expanded(
                    child: PieChart(
                      PieChartData(
                        sections: sections,
                        sectionsSpace: 2,
                        centerSpaceRadius: 30,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: data.entries.map((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: statusColors[e.key],
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${statusLabels[e.key] ?? e.key}: ${e.value}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
