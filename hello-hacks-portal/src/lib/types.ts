export type Criterion = { id: string; label: string; weight: number };
export type Rubric = { name: string; scaleMax: number; criteria: Criterion[] };

export type Team = {
  id: string;
  name: string;
  members: string[];
  techStack: string[];
  github?: string;
  devpost?: string;
  description?: string;
  imageUrls: string[];
  teamCode?: string;
  createdAt?: any;
};

export type Judge = {
  id: string;
  name: string;
  code: string;
  isAdmin?: boolean;
  assignedTeamIds: string[];
};

export type Review = {
  id?: string;
  eventId: string;
  teamId: string;
  judgeId: string;
  judgeName: string;
  scores: Record<string, number>;
  feedback?: string;
  total: number;
  weightedTotal: number;
  completedAt: any;
};
