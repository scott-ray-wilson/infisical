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

export type TInsightRotationItem = {
  name: string;
  environment: string;
  nextRotationAt: string | null;
};

export type TInsightReminderItem = {
  secretKey: string;
  environment: string;
  nextReminderDate: string;
};

export type TInsightStaleSecretItem = {
  key: string;
  environment: string;
  updatedAt: string;
};

export type TGetInsightsSummaryResponse = {
  upcomingRotations: TInsightRotationItem[];
  overdueRotations: TInsightRotationItem[];
  upcomingReminders: TInsightReminderItem[];
  overdueReminders: TInsightReminderItem[];
  staleSecrets: TInsightStaleSecretItem[];
};

export type TGetSecretAccessVolumeResponse = {
  days: TSecretAccessVolumeDay[];
};

export type TAccessLocation = {
  lat: number;
  lng: number;
  city: string;
  country: string;
  count: number;
};

export type TGetSecretAccessLocationsDTO = {
  projectId: string;
  days?: number;
};

export type TGetSecretAccessLocationsResponse = {
  locations: TAccessLocation[];
};
