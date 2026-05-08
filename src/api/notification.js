import request from '@/utils/request'
import { getToken, getTokenType } from '@/utils/auth'

/**
 * 查询当前用户通知列表（分页+筛选）
 * @param {Object} params - { page, size, readStatus, type }
 */
export function getNotifications(params) {
  return request({
    url: '/api/user/notifications',
    method: 'get',
    params
  })
}

/**
 * 获取当前用户未读通知数量
 */
export function getUnreadCount() {
  return request({
    url: '/api/user/notifications/unread-count',
    method: 'get'
  })
}

/**
 * 单条通知标记已读
 * @param {string|number} id - 通知ID
 */
export function markAsRead(id) {
  return request({
    url: `/api/user/notifications/${id}/read`,
    method: 'post'
  })
}

/**
 * 全部通知标记已读
 */
export function markAllAsRead() {
  return request({
    url: '/api/user/notifications/read-all',
    method: 'post'
  })
}

/**
 * 建立 SSE 通知推送连接（基于 fetch + ReadableStream）
 * 使用 fetch 代替 EventSource 以支持 Authorization header
 *
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.onNotification - 收到新通知时回调，参数为 { unreadCount, notification }
 * @param {Function} callbacks.onUnreadCount - 收到未读数更新时回调，参数为 { unreadCount }
 * @param {Function} callbacks.onError - 连接错误时回调
 * @returns {Object} 控制器 { abort() } 用于断开连接
 */
export function connectNotificationStream({ onNotification, onUnreadCount, onError }) {
  const token = getToken();
  const tokenType = getTokenType() || 'Bearer';
  const controller = new AbortController();
  let reconnectTimer = null;

  const connect = async () => {
    try {
      const response = await fetch('/api/user/notifications/stream', {
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Accept': 'text/event-stream'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`SSE 连接失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
          } else if (line === '' && eventData) {
            // 空行表示事件结束，处理数据
            try {
              const data = JSON.parse(eventData);
              if (eventType === 'notification' && onNotification) {
                onNotification(data);
              } else if (eventType === 'unread-count' && onUnreadCount) {
                onUnreadCount(data);
              }
            } catch (e) {
              console.error('[SSE] 解析数据失败:', e);
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[SSE] 连接错误:', e);
        // 断线后 5 秒自动重连（如果未被主动中断）
        if (!controller.signal.aborted) {
          reconnectTimer = setTimeout(() => {
            if (!controller.signal.aborted) {
              console.log('[SSE] 尝试重连...');
              connect();
            }
          }, 5000);
        }
        if (onError) onError(e);
      }
    }
  };

  connect();

  // 返回增强的控制器，abort 时同时清理重连定时器
  const originalAbort = controller.abort.bind(controller);
  controller.abort = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    originalAbort();
  };

  return controller;
}
