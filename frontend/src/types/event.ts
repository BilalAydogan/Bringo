export interface Participant {
  id: string;
  status: 'invited' | 'accepted' | 'rejected';
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  timezone: string;
  location: string | null;
  invite_code: string;
  created_by: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  created_at: string;
  is_owner: boolean;
  is_participant: boolean;
  participants: Participant[];
}

export interface Invitation {
  id: string;
  status: 'invited' | 'accepted' | 'rejected';
  event: Event;
}

export interface EventFormData {
  title: string;
  description: string;
  date: string;
  timezone: string;
  location: string;
}
