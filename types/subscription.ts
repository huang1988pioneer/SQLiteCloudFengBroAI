export type Subscription = {
  id: string;
  name: string;
  site: string;
  price: number;
  currency: string;
  nextdate: string;
  account: string;
  note: string;
  continue: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionDraft = Omit<Subscription, "id" | "created_at" | "updated_at">;

export type FengBroSettings = {
  connectionString: string;
  notificationDays: number;
};

export type SubscriptionSchemaField = {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string;
  note: string;
};
