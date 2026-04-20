import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/complaint_model.dart';
import '../services/complaint_service.dart';
import 'complaints_provider.dart';

// Socket URL - matches ApiClient base URL but without /api
String get _socketUrl {
  if (kIsWeb) {
    return 'http://localhost:5000';
  }
  if (Platform.isAndroid) {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
}

// Notifications state
class NotificationsState {
  final List<Notification> notifications;
  final int unreadCount;
  final bool isLoading;
  final bool isConnected;

  NotificationsState({
    this.notifications = const [],
    this.unreadCount = 0,
    this.isLoading = false,
    this.isConnected = false,
  });

  NotificationsState copyWith({
    List<Notification>? notifications,
    int? unreadCount,
    bool? isLoading,
    bool? isConnected,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      isLoading: isLoading ?? this.isLoading,
      isConnected: isConnected ?? this.isConnected,
    );
  }
}

// Notifications notifier
class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final ComplaintService _service;
  io.Socket? _socket;
  Timer? _pollTimer;

  NotificationsNotifier(this._service) : super(NotificationsState());

  void connectSocket(String token, String userId) {
    // Disconnect existing socket first
    disconnectSocket();

    // Start periodic polling as fallback (every 60 seconds)
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) => load());

    try {
      _socket = io.io(
        _socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .build(),
      );

      _socket?.onConnect((_) {
        state = state.copyWith(isConnected: true);
        _socket?.emit('join', 'user:$userId');
      });

      _socket?.onDisconnect((_) {
        state = state.copyWith(isConnected: false);
      });

      _socket?.onConnectError((error) {
        state = state.copyWith(isConnected: false);
      });

      _socket?.on('notification', (data) {
        try {
          final notification = Notification.fromJson(data);
          state = state.copyWith(
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          );
        } catch (e) {
          // Silently handle parse errors
        }
      });

      _socket?.connect();
    } catch (e) {
      state = state.copyWith(isConnected: false);
    }
  }

  void disconnectSocket() {
    _pollTimer?.cancel();
    _pollTimer = null;
    try {
      _socket?.disconnect();
      _socket?.dispose();
    } catch (_) {}
    _socket = null;
    state = state.copyWith(isConnected: false);
  }

  Future<void> load() async {
    state = state.copyWith(isLoading: true);
    try {
      final notificationsJson = await _service.getNotifications();
      final notifications = notificationsJson
          .map((json) => Notification.fromJson(json))
          .toList();
      final unreadCount = await _service.getUnreadCount();
      state = state.copyWith(
        notifications: notifications,
        unreadCount: unreadCount,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _service.markAsRead(id);
      state = state.copyWith(
        notifications: state.notifications.map((n) {
          if (n.id == id) {
            return Notification(
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              relatedId: n.relatedId,
              isRead: true,
              createdAt: n.createdAt,
            );
          }
          return n;
        }).toList(),
        unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
      );
    } catch (e) {
      // Handle error
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _service.markAllAsRead();
      state = state.copyWith(
        notifications: state.notifications.map((n) {
          return Notification(
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            relatedId: n.relatedId,
            isRead: true,
            createdAt: n.createdAt,
          );
        }).toList(),
        unreadCount: 0,
      );
    } catch (e) {
      // Handle error
    }
  }
}

// Providers
final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>(
      (ref) => NotificationsNotifier(ref.watch(complaintServiceProvider)),
    );
