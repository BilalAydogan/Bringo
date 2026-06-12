export interface AdminContract {
  id: string;
  title: string;
  content: string;
  version: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  accepted_count: number;
  translations?: Array<{
    locale: string;
    title: string;
    content: string;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  created_at: string;
}

export interface AdminDashboardResponse {
  stats: {
    users: number;
    admins: number;
    events: number;
    items: number;
    contracts: number;
    accepted_contracts: number;
  };
  active_contract: AdminContract | null;
  recent_users: AdminUser[];
  recent_contracts: AdminContract[];
}
