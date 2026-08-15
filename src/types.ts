export interface Member {
  id: string;
  name: string;
  phone?: string;
  password: string; // member password set by admin or default
  joinDateShamsi: string; // e.g. "۱۴۰۲/۰۵/۱۰" or "1402/05/10"
  score: number; // accumulated score
  hasWon: boolean; // if they have already won in this cycle
  winMonth: string | null; // which month they won (e.g., "خرداد ۱۴۰۳")
  avatarColor: string;
  isAppliedForLoan: boolean; // requested main loan for current round
  isAppliedForEmergency: boolean; // requested emergency loan
  loanRequestTime?: number; // timestamp when requested main loan
  emergencyLoanRequestTime?: number; // timestamp when requested emergency loan
}

export type PaymentStatus = "paid" | "unpaid" | "late";

export interface Payment {
  id: string;
  memberId: string;
  monthName: string; // e.g., "خرداد ۱۴۰۳"
  amount: number; // main installment amount
  savingsAmount: number; // savings component amount
  paymentDayShamsi: number; // Day of month (1-31)
  paymentDateShamsi: string; // full shamsi date (e.g., "۱۴۰۳/۰۳/۰۲")
  scoreDelta: number; // positive or negative score earned
  status: PaymentStatus;
}

export interface LotteryResult {
  id: string;
  monthName: string;
  winnerId: string;
  winnerName: string;
  drawDateShamsi: string;
  totalPoolAmount: number;
  drawMethod: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual";
  participantsCount: number;
  loanType: "main" | "emergency"; // type of loan received
}

export interface FundSettings {
  fundName: string;
  monthlyAmount: number; // main qist amount, eg 2000000 Toman
  savingsAmount: number; // fixed savings component amount, eg 500000 Toman
  lotteryDayOfMonth: number; // 5th of each month
  autoDrawOnFirstOfMonth?: boolean; // Auto draw on 1st of month
  currentYear: number; // e.g. 1405
  currentMonthIndex: number; // 0 to 11 (Farvardin to Esfand)
  adminPassword: string; // password for admin panel
  // Telegram notification settings
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramMessageTemplate?: string;
  enableTelegramNotification?: boolean;
}

export const PERS_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند"
];

