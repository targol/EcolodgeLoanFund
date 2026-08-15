import { Member, Payment, LotteryResult, FundSettings, FundCycle, PERS_MONTH_NAMES } from "../types";

// Convert English numbers to Persian digits
export function toPersianDigits(num: string | number | undefined | null): string {
  if (num === undefined || num === null) return "";
  const numStr = String(num);
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return numStr.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

// Convert Persian digits to English numbers
export function toEnglishDigits(str: string): string {
  if (!str) return "";
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let out = str;
  for (let i = 0; i < 10; i++) {
    out = out.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return out;
}

// Compact Gregorian to Jalali converter
export function gregorianToJalali(date: Date): string {
  const g_y = date.getFullYear();
  const g_m = date.getMonth() + 1;
  const g_d = date.getDate();
  const g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (g_y % 4 === 0 && (g_y % 100 !== 0 || g_y % 400 === 0)) {
    g_days_in_month[2] = 29;
  }
  const gy = g_y - 1600;
  const gm = g_m - 1;
  const gd = g_d - 1;
  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
  for (let i = 0; i < gm; ++i) g_day_no += g_days_in_month[i + 1];
  g_day_no += gd;
  let j_day_no = g_day_no - 79;
  const j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;
  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }
  let i = 0;
  while (i < 11 && j_day_no >= (i < 6 ? 31 : 30)) {
    j_day_no -= i < 6 ? 31 : 30;
    i++;
  }
  const jm = i + 1;
  const jd = j_day_no + 1;
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// Compact Jalali to Gregorian converter
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const j_day_no = 365 * (jy - 979) + Math.floor((jy - 979) / 33) * 8 + Math.floor(((jy - 979) % 33 + 3) / 4);
  let g_day_no = j_day_no + 79;
  for (let i = 0; i < jm - 1; ++i) {
    g_day_no += i < 6 ? 31 : 30;
  }
  g_day_no += jd - 1;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no %= 146097;
  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no %= 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }
  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;
  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }
  let gd = g_day_no + 1;
  const g_days_in_month = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (let i = 1; i <= 12; i++) {
    if (gd <= g_days_in_month[i]) {
      gm = i;
      break;
    }
    gd -= g_days_in_month[i];
  }
  return new Date(gy, gm - 1, gd);
}

// Format numbers with commas (e.g., 2,000,000) inside Persian string
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US").format(amount);
  return toPersianDigits(formatted) + " تومان";
}

// Calculate the payment score based on the day of payment and total amount paid (including qist and savings)
export function calculatePaymentScore(day: number, totalAmount: number, dueDate: number = 5): { score: number; description: string; color: string } {
  if (day < 1) return { score: 0, description: "عدم پرداخت", color: "text-red-500" };
  
  const units = Math.floor(totalAmount / 100000); // per 100,000 Tomans
  const daysDiff = dueDate - day; // positive for early, negative for delay
  const score = units * daysDiff;

  if (day < dueDate) {
    const earlyDays = dueDate - day;
    return {
      score,
      description: `تعجیل خوش‌حسابی (${toPersianDigits(earlyDays)} روز قبل از موعد). محاسبه: ${toPersianDigits(units)} امتیاز به ازای هر ۱۰۰ هزار تومان × ${toPersianDigits(earlyDays)} روز = ${toPersianDigits(score)} امتیاز مثبت`,
      color: "text-teal-750 bg-teal-50 dark:bg-teal-950/20"
    };
  } else if (day === dueDate) {
    return {
      score: 0,
      description: "پرداخت روز موعد (بدون تاخیر یا تعجیل، امتیاز صفر)",
      color: "text-teal-700 bg-teal-50"
    };
  } else {
    const delayDays = day - dueDate;
    return {
      score,
      description: `جریمه تاخیر (${toPersianDigits(delayDays)} روز دیرکرد). محاسبه: ${toPersianDigits(units)} امتیاز منفی به ازای هر ۱۰۰ هزار تومان × ${toPersianDigits(delayDays)} روز = ${toPersianDigits(Math.abs(score))} امتیاز منفی`,
      color: "text-rose-600 bg-rose-50"
    };
  }
}

// Initial mock-data generator to give high depth and realism immediately
export function getInitialMockData(): {
  members: Member[];
  payments: Payment[];
  lotteries: LotteryResult[];
  settings: FundSettings;
  cycles: FundCycle[];
} {
  const settings: FundSettings = {
    fundName: "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی",
    monthlyAmount: 5500000, // 5,500,000 Toman Core Installment
    savingsAmount: 500000,  // 500,000 Toman Savings Portion (invested in Gold Fund)
    currentCycleNumber: 3,  // Currently in Round 3
    lotteryDayOfMonth: 1,   // Automatic lottery on 1st day of month
    autoDrawOnFirstOfMonth: true,
    currentYear: 1405,
    currentMonthIndex: 5,   // Shahrivar 1405 (index 5)
    adminPassword: "admin",
    goldInvestmentNote: "مبالغ پس‌انداز ماهانه (۵۰۰,۰۰۰ تومان در ماه به ازای هر سهم) در صندوق طلا سرمایه‌گذاری شده است. ارزش روز و میزان نهایی پس‌انداز انباشته پس از اتمام دوره محاسبه و در مورد نحوه انتقال آن به دوره‌های آینده تصمیم‌گیری خواهد شد.",
    goldFundValueToman: 18500000, // Estimated current valuation of accumulated gold investment
    telegramBotToken: "",
    telegramChatId: "",
    enableTelegramNotification: true,
    telegramMessageTemplate: `🎉 <b>نتیجه قرعه‌کشی {ماه} {نام_صندوق}</b>

🏆 <b>برنده خوش‌شانس این دوره:</b>
👤 <b>{نام_برنده}</b>

💰 <b>مبلغ تسهیلات:</b> {مبلغ_وام} تومان
📅 <b>تاریخ برگزاری:</b> {تاریخ_قرعه_کشی}
📌 <b>نوع تسهیلات:</b> {نوع_وام}

🎬 <i>ویدیو و شبیه‌سازی انیمیشنی قرعه‌کشی با موفقیت انجام گردید.</i>

✨ ضمن تبریک فراوان به برنده محترم، از تمامی اعضای خوش‌حساب صندوق بابت مشارکت صمیمانه سپاسگزاریم! 🙏`
  };

  const members: Member[] = [
    {
      id: "mem_1",
      name: "ترگل انوری نژاد - خانه برزک",
      representativeName: "ترگل",
      phone: "۰۹۱۹۸۷۶۵۴۳۲",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 360,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-teal-500 to-emerald-600",
      isAppliedForLoan: true,
      isAppliedForEmergency: false,
      loanRequestTime: Date.now() - 3600000,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_2",
      name: "اکبر رضوانیان - خونه نقلی",
      representativeName: "عمو اکبر",
      phone: "۰۹۱۲۱۱۱۱۱۱۱",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 60,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-amber-500 to-orange-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_3",
      name: "صادق کاظمیان - ارگ رادکان",
      representativeName: "کاظمیان",
      phone: "۰۹۳۵۲۲۲۲۲۲۲",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 180,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-rose-500 to-pink-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_4",
      name: "عبدالحق پوریعقوب - خانه پوریعقوب",
      representativeName: "پوریعقوب",
      phone: "۰۹۱۲۳۴۵۶۷۸۹",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 300,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-sky-500 to-blue-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_5",
      name: "رامتین شهرت - نارتیتی",
      representativeName: "رامتین",
      phone: "۰۹۱۲۳۳۳۳۳۳۳",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 120,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-violet-500 to-indigo-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_6",
      name: "منیر تقدیسی - نورخونه",
      representativeName: "منیر",
      phone: "۰۹۰۲۴۴۴۴۴۴۴",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 60,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-fuchsia-500 to-purple-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_7",
      name: "عبدالعلی ابراهیمی - خورشید سرخان جم",
      representativeName: "ابراهیمی",
      phone: "۰۹۳۶۵۵۵۵۵۵۵",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "خرداد ۱۴۰۵",
      avatarColor: "from-cyan-500 to-blue-500",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_8",
      name: "حسین کشتکارزاده - گیلانه جان",
      representativeName: "حسین کشتکارزاده",
      phone: "۰۹۱۲۴۴۴۴۴۴۴",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: -960,
      hasWon: false,
      winMonth: null,
      avatarColor: "from-emerald-500 to-teal-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_9",
      name: "زینب سالاری - گوهران",
      representativeName: "زینب سالاری",
      phone: "۰۹۱۲۹۹۹۹۹۹۹",
      password: "123",
      joinDateShamsi: "۱۴۰۴/۰۷/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "مرداد ۱۴۰۵",
      avatarColor: "from-orange-500 to-amber-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [2, 3],
      currentCycleShares: 1
    },
    {
      id: "mem_10",
      name: "نگار و عادل - راهنما",
      representativeName: "عادل و نگار",
      phone: "۰۹۱۲۸۸۸۸۸۸۸",
      password: "123",
      joinDateShamsi: "۱۴۰۵/۰۳/۰۱",
      score: -180,
      hasWon: true,
      winMonth: "تیر ۱۴۰۵",
      avatarColor: "from-pink-500 to-rose-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [3],
      currentCycleShares: 1
    },
    // Members who participated in earlier cycles (Cycle 1)
    {
      id: "mem_11",
      name: "میعاد اهلی - آهید",
      representativeName: "میعاد اهلی",
      phone: "۰۹۱۷۱۱۱۱۱۱۱",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "بهمن ۱۴۰۳",
      avatarColor: "from-blue-500 to-indigo-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_12",
      name: "حسین - بارانداز",
      representativeName: "حسین بارانداز",
      phone: "۰۹۱۳۲۲۲۲۲۲۲",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "اسفند ۱۴۰۳",
      avatarColor: "from-amber-600 to-orange-700",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_13",
      name: "جیران - پیسو",
      representativeName: "جیران",
      phone: "۰۹۱۸۳۳۳۳۳۳۳",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "دی ۱۴۰۳",
      avatarColor: "from-purple-500 to-pink-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_14",
      name: "زارعی - خانه باغدشت کاشمر",
      representativeName: "زارعی",
      phone: "۰۹۱۵۴۴۴۴۴۴۴",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "اردیبهشت ۱۴۰۴",
      avatarColor: "from-green-600 to-emerald-700",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_15",
      name: "پاده بان - خانه ترانگ",
      representativeName: "پاده بان",
      phone: "۰۹۱۴۵۵۵۵۵۵۵",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "آبان ۱۴۰۳",
      avatarColor: "from-red-500 to-rose-600",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_16",
      name: "جواهری - خانه جواهری",
      representativeName: "جواهری",
      phone: "۰۹۱۲۶۶۶۶۶۶۶",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "شهریور ۱۴۰۳",
      avatarColor: "from-cyan-600 to-teal-700",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_17",
      name: "معتبر سرخوش - خانه فصیح خواف",
      representativeName: "سرخوش",
      phone: "۰۹۱۷۷۷۷۷۷۷۷",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "دی ۱۴۰۳",
      avatarColor: "from-slate-600 to-slate-800",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_18",
      name: "حسین پور - کنگ کهن",
      representativeName: "حسین پور",
      phone: "۰۹۱۵۸۸۸۸۸۸۸",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "فروردین ۱۴۰۴",
      avatarColor: "from-yellow-600 to-amber-700",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    },
    {
      id: "mem_19",
      name: "طبا - ننه کلو بابا کلو",
      representativeName: "طبا",
      phone: "۰۹۱۳۹۹۹۹۹۹۹",
      password: "123",
      joinDateShamsi: "۱۴۰۳/۰۵/۰۱",
      score: 0,
      hasWon: true,
      winMonth: "فروردین ۱۴۰۴",
      avatarColor: "from-violet-600 to-purple-700",
      isAppliedForLoan: false,
      isAppliedForEmergency: false,
      participatedCycles: [1]
    }
  ];

  const cycles: FundCycle[] = [
    {
      id: "cycle_1",
      cycleNumber: 1,
      title: "دوره اول (۱۴۰۳ - ۱۴۰۴)",
      status: "completed",
      startShamsiDate: "۱۴۰۳/۰۵/۰۱",
      endShamsiDate: "۱۴۰۴/۰۴/۳۱",
      monthlyAmount: 2000000,
      savingsAmount: 0,
      totalMonths: 12,
      memberIds: [
        "mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8",
        "mem_11", "mem_12", "mem_13", "mem_14", "mem_15", "mem_16", "mem_17", "mem_18", "mem_19"
      ],
      memberShares: {
        mem_1: 2, mem_2: 2, mem_3: 2, mem_4: 2, mem_14: 2, mem_18: 2,
        mem_5: 1, mem_6: 1, mem_7: 1, mem_8: 1, mem_11: 1, mem_12: 1, mem_13: 1, mem_15: 1, mem_16: 1, mem_17: 1, mem_19: 1
      },
      notes: "دوره ۱۲ ماهه نخست صندوق حامی بومگردی با حضور ۱۷ اقامتگاه و ۲۳ سهم (اقساط ۲ میلیون تومانی)",
      pastWinners: [
        { monthName: "مرداد ۱۴۰۳", winnerName: "خانه خورشید سرخان (قرعه کشی ۱)" },
        { monthName: "مرداد ۱۴۰۳", winnerName: "نارتیتی (قرعه کشی ۲)" },
        { monthName: "شهریور ۱۴۰۳", winnerName: "خانه باغدشت کاشمر (ضروری)" },
        { monthName: "شهریور ۱۴۰۳", winnerName: "خانه جواهری (قرعه کشی)" },
        { monthName: "مهر ۱۴۰۳", winnerName: "کنگ کهن (قرعه کشی)" },
        { monthName: "مهر ۱۴۰۳", winnerName: "نورخونه (ضروری)" },
        { monthName: "آبان ۱۴۰۳", winnerName: "ارگ رادکان (قرعه کشی)" },
        { monthName: "آبان ۱۴۰۳", winnerName: "خانه ترانگ (ضروری)" },
        { monthName: "آذر ۱۴۰۳", winnerName: "خانه برزک (قرعه کشی)" },
        { monthName: "آذر ۱۴۰۳", winnerName: "خونه نقلی (قرعه کشی)" },
        { monthName: "دی ۱۴۰۳", winnerName: "پیسو (قرعه کشی)" },
        { monthName: "دی ۱۴۰۳", winnerName: "خانه فصیح خواف (ضروری)" },
        { monthName: "بهمن ۱۴۰۳", winnerName: "آهید (قرعه کشی)" },
        { monthName: "بهمن ۱۴۰۳", winnerName: "خانه گیلان جان (قرعه کشی)" },
        { monthName: "اسفند ۱۴۰۳", winnerName: "بارانداز (قرعه کشی)" },
        { monthName: "اسفند ۱۴۰۳", winnerName: "ننه کلو بابا کلو (قرعه کشی)" },
        { monthName: "فروردین ۱۴۰۴", winnerName: "کنگ کهن (سهم دوم)" },
        { monthName: "فروردین ۱۴۰۴", winnerName: "ننه کلو بابا کلو (سهم دوم)" },
        { monthName: "اردیبهشت ۱۴۰۴", winnerName: "خانه باغدشت (سهم دوم)" },
        { monthName: "اردیبهشت ۱۴۰۴", winnerName: "خونه نقلی (سهم دوم)" },
        { monthName: "خرداد ۱۴۰۴", winnerName: "خانه برزک (سهم دوم)" },
        { monthName: "خرداد ۱۴۰۴", winnerName: "خانه پوریعقوب (سهم اول)" },
        { monthName: "تیر ۱۴۰۴", winnerName: "ارگ رادکان (سهم دوم)" }
      ]
    },
    {
      id: "cycle_2",
      cycleNumber: 2,
      title: "دوره دوم (۱۴۰۴ - ۱۴۰۵)",
      status: "completed",
      startShamsiDate: "۱۴۰۴/۰۷/۰۱",
      endShamsiDate: "۱۴۰۵/۰۲/۲۹",
      monthlyAmount: 5000000,
      savingsAmount: 0,
      totalMonths: 8,
      memberIds: [
        "mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_9"
      ],
      notes: "دوره ۸ ماهه دوم با حضور ۸ عضو و اقساط ماهانه ۵ میلیون تومان (تسهیلات ۴۰ میلیون تومانی)",
      pastWinners: [
        { monthName: "مهر ۱۴۰۴", winnerName: "خانه پوریعقوب" },
        { monthName: "آبان ۱۴۰۴", winnerName: "گوهران (زینب سالاری)" },
        { monthName: "دی ۱۴۰۴", winnerName: "گوهران" },
        { monthName: "بهمن ۱۴۰۴", winnerName: "خونه نقلی" },
        { monthName: "اسفند ۱۴۰۴", winnerName: "ارگ رادکان" },
        { monthName: "فروردین ۱۴۰۵", winnerName: "نارتیتی" },
        { monthName: "اردیبهشت ۱۴۰۵", winnerName: "خانه برزک" }
      ]
    },
    {
      id: "cycle_3",
      cycleNumber: 3,
      title: "دوره سوم (۱۴۰۵ - جاری)",
      status: "active",
      startShamsiDate: "۱۴۰۵/۰۳/۰۱",
      endShamsiDate: "۱۴۰۵/۱۲/۲۹",
      monthlyAmount: 5500000,
      savingsAmount: 500000,
      totalMonths: 10,
      memberIds: [
        "mem_1", "mem_2", "mem_3", "mem_4", "mem_5", "mem_6", "mem_7", "mem_8", "mem_9", "mem_10"
      ],
      memberShares: {
        mem_1: 1, mem_2: 1, mem_3: 1, mem_4: 1, mem_5: 1, mem_6: 1, mem_7: 1, mem_8: 1, mem_9: 1, mem_10: 1
      },
      notes: "دوره جاری با ۱۰ عضو و ۱۰ سهم: ۵.۵ میلیون تومان قسط اصلی + ۵۰۰ هزار تومان پس‌انداز ماهانه هر سهم (سرمایه‌گذاری در صندوق طلا)",
      goldInvestmentNote: "مبالغ پس‌انداز ماهانه (۵۰۰ هزار تومان در ماه به ازای هر سهم) در صندوق طلا سرمایه‌گذاری شده است. مبلغ نهایی پس‌انداز انباشته پس از پایان دوره و محاسبه ارزش روز مشخص و در مورد نحوه انتقال به دوره‌های بعدی تصمیم‌گیری خواهد شد.",
      accumulatedSavingsPool: 15000000,
      pastWinners: [
        { monthName: "خرداد ۱۴۰۵", winnerName: "عبدالعلی ابراهیمی - خورشید سرخان جم" },
        { monthName: "تیر ۱۴۰۵", winnerName: "نگار و عادل - راهنما" },
        { monthName: "مرداد ۱۴۰۵", winnerName: "زینب سالاری - گوهران" }
      ]
    }
  ];

  const lotteries: LotteryResult[] = [
    {
      id: "lot_1",
      monthName: "خرداد ۱۴۰۵",
      winnerId: "mem_7",
      winnerName: "عبدالعلی ابراهیمی - خورشید سرخان جم",
      drawDateShamsi: "۱۴۰۵/۰۳/۰۶",
      totalPoolAmount: 55000000,
      drawMethod: "random",
      participantsCount: 10,
      loanType: "main",
      cycleNumber: 3
    },
    {
      id: "lot_2",
      monthName: "تیر ۱۴۰۵",
      winnerId: "mem_10",
      winnerName: "نگار و عادل - راهنما",
      drawDateShamsi: "۱۴۰۵/۰۴/۰۲",
      totalPoolAmount: 55000000,
      drawMethod: "weighted",
      participantsCount: 9,
      loanType: "main",
      cycleNumber: 3
    },
    {
      id: "lot_3",
      monthName: "مرداد ۱۴۰۵",
      winnerId: "mem_9",
      winnerName: "زینب سالاری - گوهران",
      drawDateShamsi: "۱۴۰۵/۰۴/۳۱",
      totalPoolAmount: 55000000,
      drawMethod: "weighted",
      participantsCount: 8,
      loanType: "main",
      cycleNumber: 3
    }
  ];

  const payments: Payment[] = [
    // --- Khordad 1405 Payments ---
    { id: "p_3_1", memberId: "mem_3", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 7, paymentDateShamsi: "۱۴۰۵/۰۳/۰۷", scoreDelta: -120, status: "paid" },
    { id: "p_3_2", memberId: "mem_1", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 7, paymentDateShamsi: "۱۴۰۵/۰۳/۰۷", scoreDelta: -120, status: "paid" },
    { id: "p_3_3", memberId: "mem_4", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 8, paymentDateShamsi: "۱۴۰۵/۰۳/۰۸", scoreDelta: -180, status: "paid" },
    { id: "p_3_4", memberId: "mem_7", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 6, paymentDateShamsi: "۱۴۰۵/۰۳/۰۶", scoreDelta: 0, status: "paid" },
    { id: "p_3_5", memberId: "mem_2", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 8, paymentDateShamsi: "۱۴۰۵/۰۳/۰۸", scoreDelta: -180, status: "paid" },
    { id: "p_3_6", memberId: "mem_9", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 7, paymentDateShamsi: "۱۴۰۵/۰۳/۰۷", scoreDelta: -120, status: "paid" },
    { id: "p_3_7", memberId: "mem_5", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 8, paymentDateShamsi: "۱۴۰۵/۰۳/۰۸", scoreDelta: -180, status: "paid" },
    { id: "p_3_8", memberId: "mem_6", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 8, paymentDateShamsi: "۱۴۰۵/۰۳/۰۸", scoreDelta: -180, status: "paid" },
    { id: "p_3_9", memberId: "mem_8", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 10, paymentDateShamsi: "۱۴۰۵/۰۳/۱۰", scoreDelta: -300, status: "paid" },
    { id: "p_3_10", memberId: "mem_10", monthName: "خرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 8, paymentDateShamsi: "۱۴۰۵/۰۳/۰۸", scoreDelta: -180, status: "paid" },

    // --- Tir 1405 Payments ---
    { id: "p_4_1", memberId: "mem_3", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 4, paymentDateShamsi: "۱۴۰۵/۰۴/۰۴", scoreDelta: 60, status: "paid" },
    { id: "p_4_2", memberId: "mem_1", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 3, paymentDateShamsi: "۱۴۰۵/۰۴/۰۳", scoreDelta: 120, status: "paid" },
    { id: "p_4_3", memberId: "mem_4", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 3, paymentDateShamsi: "۱۴۰۵/۰۴/۰۳", scoreDelta: 120, status: "paid" },
    { id: "p_4_4", memberId: "mem_7", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 3, paymentDateShamsi: "۱۴۰۵/۰۴/۰۳", scoreDelta: 0, status: "paid" },
    { id: "p_4_5", memberId: "mem_2", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 4, paymentDateShamsi: "۱۴۰۵/۰۴/۰۴", scoreDelta: 60, status: "paid" },
    { id: "p_4_6", memberId: "mem_9", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 3, paymentDateShamsi: "۱۴۰۵/۰۴/۰۳", scoreDelta: 120, status: "paid" },
    { id: "p_4_7", memberId: "mem_5", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 4, paymentDateShamsi: "۱۴۰۵/۰۴/۰۴", scoreDelta: 60, status: "paid" },
    { id: "p_4_8", memberId: "mem_6", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 5, paymentDateShamsi: "۱۴۰۵/۰۴/۰۵", scoreDelta: 0, status: "paid" },
    { id: "p_4_9", memberId: "mem_8", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 11, paymentDateShamsi: "۱۴۰۵/۰۴/۱۱", scoreDelta: -360, status: "paid" },
    { id: "p_4_10", memberId: "mem_10", monthName: "تیر ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 2, paymentDateShamsi: "۱۴۰۵/۰۴/۰۲", scoreDelta: 0, status: "paid" },

    // --- Mordad 1405 Payments ---
    { id: "p_5_1", memberId: "mem_3", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 1, paymentDateShamsi: "۱۴۰۵/۰۵/۰۱", scoreDelta: 240, status: "paid" },
    { id: "p_5_2", memberId: "mem_1", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 31, paymentDateShamsi: "۱۴۰۵/۰۴/۳۱", scoreDelta: 360, status: "paid" },
    { id: "p_5_3", memberId: "mem_4", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 31, paymentDateShamsi: "۱۴۰۵/۰۴/۳۱", scoreDelta: 360, status: "paid" },
    { id: "p_5_4", memberId: "mem_7", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 2, paymentDateShamsi: "۱۴۰۵/۰۵/۰۲", scoreDelta: 0, status: "paid" },
    { id: "p_5_5", memberId: "mem_2", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 2, paymentDateShamsi: "۱۴۰۵/۰۵/۰۲", scoreDelta: 180, status: "paid" },
    { id: "p_5_6", memberId: "mem_9", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 31, paymentDateShamsi: "۱۴۰۵/۰۴/۳۱", scoreDelta: 0, status: "paid" },
    { id: "p_5_7", memberId: "mem_5", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 1, paymentDateShamsi: "۱۴۰۵/۰۵/۰۱", scoreDelta: 240, status: "paid" },
    { id: "p_5_8", memberId: "mem_6", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 1, paymentDateShamsi: "۱۴۰۵/۰۵/۰۱", scoreDelta: 240, status: "paid" },
    { id: "p_5_9", memberId: "mem_8", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 10, paymentDateShamsi: "۱۴۰۵/۰۵/۱۰", scoreDelta: -300, status: "paid" },
    { id: "p_5_10", memberId: "mem_10", monthName: "مرداد ۱۴۰۵", amount: 5500000, savingsAmount: 500000, paymentDayShamsi: 1, paymentDateShamsi: "۱۴۰۵/۰۵/۰۱", scoreDelta: 0, status: "paid" }
  ];

  return { members, payments, lotteries, settings, cycles };
}

