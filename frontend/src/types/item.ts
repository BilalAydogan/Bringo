export interface Assignment {
  id?: string;
  user_id: string;
  quantity: number;
  status: 'assigned' | 'completed' | 'cancelled';
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface Item {
  id: string;
  name: string;
  status: 'pending' | 'assigned' | 'completed';
  target_quantity: number | null;
  total_assigned: number;
  assignments: Assignment[];
  created_at: string;
}
