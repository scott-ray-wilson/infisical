export type TCalendarRotation = {
  id: string;
  name: string;
  type: string;
  nextRotationAt: string | null;
  environment: string;
  secretPath: string;
  secretKeys: string[];
  rotationInterval: number;
  rotationStatus: string | null;
  isAutoRotationEnabled: boolean;
};

export type TCalendarReminder = {
  id: string;
  secretId: string | null;
  secretKey: string;
  nextReminderDate: string;
  message?: string | null;
  environment: string;
  secretPath: string;
  repeatDays?: number | null;
};

export type TGetCalendarInsightsDTO = {
  projectId: string;
  month: number;
  year: number;
  environments: string;
};

export type TGetCalendarInsightsResponse = {
  rotations: TCalendarRotation[];
  reminders: TCalendarReminder[];
};

export type TSecretAccessVolumeActor = {
  name: string;
  type: string;
  count: number;
};

export type TSecretAccessVolumeDay = {
  date: string;
  total: number;
  actors: TSecretAccessVolumeActor[];
};

export type TGetSecretAccessVolumeDTO = {
  projectId: string;
  today: string;
};

export type TGetInsightsSummaryDTO = {
  projectId: string;
  environments: string;
};

export type TGetInsightsSummaryResponse = {
  upcomingRotations: number;
  overdueRotations: number;
  upcomingReminders: number;
  overdueReminders: number;
  staleSecrets: number;
};

export type TGetSecretAccessVolumeResponse = {
  days: TSecretAccessVolumeDay[];
};
