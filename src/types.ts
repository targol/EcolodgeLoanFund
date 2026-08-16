export interface Member {
  id: string;
  name: string;
  representativeName?: string; // representative person name (e.g. ترگل، کاظمیان، عمو اکبر...)
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
  // Historical membership in fund cycles (e.g. [1, 2, 3])
  participatedCycles?: number[];
  currentCycleShares?: number; // number of shares in the active cycle (default: 1)
  isFoundingMember?: boolean; // whether member is a founding board member (هیات موسس)
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
  cycleNumber?: number; // cycle number this draw belongs to
}

export interface FundCycle {
  id: string;
  cycleNumber: number; // 1, 2, 3, 4 ...
  title: string; // e.g. "دوره سوم (۱۴۰۵ - جاری)"
  status: "completed" | "active" | "planned";
  startShamsiDate: string; // e.g. "۱۴۰۵/۰۳/۰۱"
  endShamsiDate?: string; // e.g. "۱۴۰۵/۱۲/۲۹"
  monthlyAmount: number; // Main installment amount, e.g. 5,000,000 Toman
  savingsAmount: number; // Monthly savings per share, e.g. 500,000 Toman
  totalMonths: number; // Duration in months
  memberIds: string[]; // List of member IDs in this cycle
  memberShares?: Record<string, number>; // memberId -> shares count (e.g. 1 or 2)
  notes?: string;
  goldInvestmentNote?: string;
  accumulatedSavingsPool?: number;
  pastWinners?: { monthName: string; winnerName: string; loanType?: string }[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: "reminder" | "overdue" | "lottery" | "receipt" | "announcement" | "custom";
  isDefault?: boolean;
}

export interface FundSettings {
  fundName: string;
  monthlyAmount: number; // main qist amount, eg 5000000 Toman
  savingsAmount: number; // fixed savings component amount, eg 500000 Toman
  currentCycleNumber: number; // default: 3
  lotteryDayOfMonth: number; // 5th of each month
  autoDrawOnFirstOfMonth?: boolean; // Auto draw on 1st of month
  currentYear: number; // e.g. 1405
  currentMonthIndex: number; // 0 to 11 (Farvardin to Esfand)
  adminPassword: string; // password for admin panel
  // Gold Fund Investment Note
  goldInvestmentNote?: string;
  goldFundValueToman?: number;
  // Telegram notification settings
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramMessageTemplate?: string;
  enableTelegramNotification?: boolean;
  messageTemplates?: MessageTemplate[];
  // Custom Fund Logo & Favicon
  logoUrl?: string;
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

