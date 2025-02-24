
export interface StepData {
  userId: string;
  userName: string;
  steps: number;
  week: number;
  year: number;
  startDate: string;
  endDate: string;
}

export interface UserTotalSteps {
  userId: string;
  userName: string;
  totalSteps: number;
}

export interface ChartDataPoint {
  week: string;
  [key: string]: string | number; // For dynamic user data
}
