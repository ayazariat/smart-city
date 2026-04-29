import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/env.dart';
import '../models/complaint_model.dart';
import '../services/api_client.dart';
import '../services/notification_service.dart';

// Socket URL - matches ApiClient base URL but without /api
String get _socketUrl => ApiClient.socketBaseUrl;

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
  final NotificationService _service;
  io.Socket? _socket;
  Timer? _pollTimer;

  NotificationsNotifier(this._service) : super(NotificationsState());

  void _handleIncomingNotification(dynamic data) {
    try {
      if (data is! Map) {
        return;
      }

      final notification = Notification.fromJson(Map<String, dynamic>.from(data));
      final alreadyExists = state.notifications.any((n) => n.id == notification.id);
      final notifications = alreadyExists
          ? state.notifications
                .map((n) => n.id == notification.id ? notification : n)
                .toList()
          : [notification, ...state.notifications];

      state = state.copyWith(
        notifications: notifications,
        unreadCount: notifications.where((n) => !n.isRead).length,
      );
    } catch (_) {
      // Ignore malformed realtime payloads and keep polling fallback active.
    }
  }

  void connectSocket(String token, String userId) {
    // Disconnect existing socket first
    disconnectSocket();

    // Start periodic polling as fallback (every 60 seconds)
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(MobileEnv.scheduledRefreshInterval, (_) => load());

    try {
      _socket = io.io(
        _socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .setAuth({'token': token})
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

      _socket?.on('notification:new', _handleIncomingNotification);
      _socket?.on('notification', _handleIncomingNotification);

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
      final notifications = await _service.getNotifications();
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
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});

final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, NotificationsState>(
  (ref) => NotificationsNotifier(ref.watch(notificationServiceProvider)),
);
