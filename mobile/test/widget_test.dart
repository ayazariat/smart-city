// Basic Flutter widget test for Smart City Tunisia app

import 'package:flutter_test/flutter_test.dart';

import 'package:smart_city_app/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:smart_city_app/core/constants/strings.dart';

void main() {
  testWidgets('Smart City app loads correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // Verify that the app title is displayed
    expect(find.text(AppStrings.appName), findsOneWidget);

    // Verify that the welcome text is displayed
    expect(find.text('Welcome to Smart City Tunisia'), findsOneWidget);

    // Verify that quick actions section is displayed
    expect(find.text('Quick Actions'), findsOneWidget);
  });
}
