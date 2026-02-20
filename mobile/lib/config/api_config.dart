/// API Configuration for Smart City Tunisia Mobile App

class ApiConfig {
  // Base URL for the API - change this to your production URL
  static const String baseUrl = 'http://localhost:5000/api';

  // Endpoints
  static const String authLogin = '$baseUrl/auth/login';
  static const String authRegister = '$baseUrl/auth/register';
  static const String authRefresh = '$baseUrl/auth/refresh';
  static const String authProfile = '$baseUrl/auth/profile';

  static const String complaints = '$baseUrl/complaints';
  static const String complaintsNew = '$baseUrl/complaints';

  static const String adminUsers = '$baseUrl/admin/users';
  static const String adminGeography = '$baseUrl/admin/geography';

  // Timeout durations
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
