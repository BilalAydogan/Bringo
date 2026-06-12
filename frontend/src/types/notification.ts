export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unread_count: number;
}
