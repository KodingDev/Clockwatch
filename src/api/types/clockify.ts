export interface User {
  id: string;
  name: string;
  memberships: Membership[];
}

export interface Membership {
  hourlyRate: PayRate;
  costRate: PayRate;
  membershipType: string;
  targetId: string;
  userId: string;
}

export interface PayRate {
  amount: number;
  currency: string;
}

export interface Workspace {
  id: string;
  name: string;
  memberships: Membership[];
}
