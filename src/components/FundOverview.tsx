import { Member, Payment, LotteryResult, FundSettings, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency } from "../utils/jalali";
import { Users, Coins, Calendar, Trophy, Sparkles, TrendingUp, Shield, Layers } from "lucide-react";
import { motion } from "motion/react";

interface FundOverviewProps {
  members: Member[];
  payments: Payment[];
  lotteries: LotteryResult[];
  settings: FundSettings;
}

export default function FundOverview({ members, payments, lotteries, settings }: FundOverviewProps) {
  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  
  // Calculations (excluding admin who is not in members)
  const totalMembers = members.length;
  const wonCount = members.filter(m => m.hasWon).length;
  const pendingCount = totalMembers - wonCount;
  
  // 1. Core Installment component this month
  const currentMonthPayments = payments.filter(p => p.monthName === currentMonthName && p.status === "paid");
  const totalInstallmentMonth = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const expectedInstallmentMonth = totalMembers * settings.monthlyAmount;
  
  // 2. Savings component this month
  const totalSavingsMonth = currentMonthPayments.reduce((sum, p) => sum + (p.savingsAmount || 0), 0);
  const expectedSavingsMonth = totalMembers * (settings.savingsAmount || 500000);

  // 3. Accumulated Savings portfolio sum (retained for end of cycle / emergency loans)
  const allPaidPayments = payments.filter(p => p.status === "paid");
  const accumulatedSavingsTotal = allPaidPayments.reduce((sum, p) => sum + (p.savingsAmount || 0), 0);

  // 4. Spent emergency loans from savings
  const totalEmergencyLoansPaid = lotteries
    .filter(l => l.loanType === "emergency")
    .reduce((sum, l) => sum + l.totalPoolAmount, 0);

  // Available emergency loan pool
  const netEmergencyPoolAvailable = Math.max(0, accumulatedSavingsTotal - totalEmergencyLoansPaid);

  // Total life of fund pool (all paid amount including installments & savings)
  const totalPaidAllTime = allPaidPayments.reduce((sum, p) => sum + p.amount + (p.savingsAmount || 0), 0);

  // Scoring leaderboards (highest score first)
  const topMembers = [...members].sort((a, b) => b.score - a.score).slice(0, 3);

  // Last lottery winner for hero presentation
  const latestLotteryWinner = lotteries.length > 0 ? lotteries[lotteries.length - 1] : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="fund-overview-container">
      {/* Right Column (2/3 width on desktop) - Key Statistics Cards */}
      <div className="md:col-span-2 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Main Loan installments this month */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            id="stat-card-collected"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1">وصولی اقساط ثابت این ماه</p>
                <div className="mt-2">
                  <span className="text-xl font-black text-teal-700 tracking-tight">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(totalInstallmentMonth))}
                  </span>
                  <span className="text-xs mr-1 text-slate-400">تومان</span>
                </div>
              </div>
              <div className="p-2 bg-teal-50 border border-teal-100 rounded text-teal-700">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-slate-400">کل تعهد مصوب:</span>
              <span className="font-bold text-slate-700">{formatCurrency(expectedInstallmentMonth)}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-teal-650 h-full rounded-full transition-all duration-500"
                style={{ width: `${expectedInstallmentMonth > 0 ? (totalInstallmentMonth / expectedInstallmentMonth) * 100 : 0}%` }}
              />
            </div>
          </motion.div>

          {/* Card 2: Savings Component of current Month */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            id="stat-card-savings-month"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1">وصولی پس‌انداز ثابت این ماه</p>
                <div className="mt-2">
                  <span className="text-xl font-black text-blue-700 tracking-tight font-mono">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(totalSavingsMonth))}
                  </span>
                  <span className="text-xs mr-1 text-slate-400">تومان</span>
                </div>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-100 rounded text-blue-700">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-slate-400">تعهد پس‌انداز:</span>
              <span className="font-bold text-slate-700">{formatCurrency(expectedSavingsMonth)}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${expectedSavingsMonth > 0 ? (totalSavingsMonth / expectedSavingsMonth) * 100 : 0}%` }}
              />
            </div>
          </motion.div>

          {/* Card 3: Accumulated Savings Portfolio (For Emergency Loans) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-55 p-5 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between"
            id="stat-card-accumulated-savings"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-black text-slate-600 mb-1">صندوق پس‌انداز انباشته</p>
                <div className="mt-2">
                  <span className="text-xl font-black text-blue-900 tracking-tight">
                    {toPersianDigits(new Intl.NumberFormat("en-US").format(netEmergencyPoolAvailable))}
                  </span>
                  <span className="text-xs mr-1 text-slate-500">تومان</span>
                </div>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-150 rounded text-blue-800">
                <Shield className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-bold text-slate-500">پس‌انداز کل دوره:</span>
              <span className="font-black text-blue-800">{formatCurrency(accumulatedSavingsTotal)}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block leading-tight">
              اندوخته وام‌های ملّی و اضطراری
            </span>
          </motion.div>
        </div>

        {/* Dynamic score weight explainer */}
        <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-150 flex flex-col md:flex-row gap-4 items-center">
          <div className="p-3 bg-white border border-teal-100 rounded-lg text-teal-700 shadow-sm shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <span>سیستم ارزیابی خوش‌حسابی اساسنامه صندوق</span>
              <span className="bg-teal-700 text-[10px] text-white px-2 py-0.5 rounded">هوشمند</span>
            </h4>
            <p className="text-[11px] text-teal-850/90 leading-relaxed">
              موعد انجام قرعه‌کشی تا ۳ام هر ماه و موعد نهایی واریز اقساط تا ۵ام هر ماه شمسی است. به ازای هر روز تعجیل در واریز، مثبت ۱ امتیاز و به ازای هر روز تاخیر، منفی ۱ امتیاز <b className="text-teal-900 font-extrabold">به ازای هر ۱۰۰ هزار تومان واریزی</b> تخصیص می‌یابد. واریز زودتر، شانس برنده شدن در قرعه‌کشی‌های سیستمی را افزایش می‌دهد.
            </p>
          </div>
        </div>

        {/* Scoring board */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">اعتبار خوش‌حسابی و رده‌بندی اعضا (امتیاز زمانی)</span>
            </div>
            <span className="text-[10px] text-slate-405 font-normal">تعیین اولویت سیستمی قرعه‌کشی</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topMembers.map((member, idx) => (
              <div key={member.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded bg-teal-100 text-[10px] font-bold text-teal-800 flex items-center justify-center font-sans">
                    {toPersianDigits(idx + 1)}
                  </div>
                  <span className="text-xs font-medium text-slate-705">{member.name}</span>
                </div>
                <span className={`text-xs font-mono font-bold tracking-wider ${member.score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                  {member.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(member.score))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Left Column (1/3 width) - Geometric Hero Highlight for Last Winner & History */}
      <div className="space-y-6" id="winner-history-panel">
        {/* Dark Teal Hero Segment matching Geometric Balance design */}
        {latestLotteryWinner ? (
          <div className="bg-teal-900 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[9px] uppercase tracking-wide bg-amber-500/20 text-amber-200 border border-amber-300/10 px-2 py-0.5 rounded inline-block mb-3">
                {latestLotteryWinner.loanType === "emergency" ? "وام ضروری از پس‌انداز" : `برنده قرعه نوبت (${latestLotteryWinner.monthName})`}
              </span>
              <div className="text-base font-black mb-2 text-white">{latestLotteryWinner.winnerName}</div>
              <div className="text-[11px] bg-white/10 border border-white/5 inline-block px-3 py-1.5 rounded">
                مبلغ وام: {formatCurrency(latestLotteryWinner.totalPoolAmount)}
              </div>
              <p className="text-[10px] opacity-75 mt-2">
                نوع تخصیص: {latestLotteryWinner.drawMethod === "weighted" ? "قرعه‌کشی اعتباری خوش‌حسابی" : 
                             latestLotteryWinner.drawMethod === "manual" ? "واگذاری انتخابی از لیست تقاضا" : 
                             latestLotteryWinner.drawMethod === "emergency_random" ? "قرعه وام اضطراری" :
                             latestLotteryWinner.drawMethod === "emergency_manual" ? "برگزیده ادمین (وام اضطراری)" : "قرعه‌کشی ساده"}
              </p>
            </div>
            {/* Visual Abstract Circle geometry background */}
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <div className="w-24 h-24 border-[12px] border-white rounded-full"></div>
            </div>
          </div>
        ) : (
          <div className="bg-teal-900 text-white rounded-xl p-5 shadow-md text-center py-6">
            <Trophy className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-xs opacity-80">هنوز قرعه‌کشی دوره‌ای آغاز نشده است.</p>
          </div>
        )}

        {/* List of remaining lotteries history */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 font-sans">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>تاریخچه تسهیلات پرداختی صندوق</span>
          </h4>

          {lotteries.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              ثبت تاریخچه بعد از اولین تخصیص فعال می‌شود.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {lotteries.slice().reverse().map((lot) => (
                <div 
                  key={lot.id} 
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                    lot.loanType === "emergency" ? "bg-blue-50/50 border-blue-100" : "bg-slate-50/50 border-slate-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800">{lot.winnerName}</p>
                      {lot.loanType === "emergency" && (
                        <span className="bg-blue-100 text-[9px] text-blue-850 px-1 py-0.5 rounded font-bold">وام ضروری</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{lot.monthName}</p>
                  </div>
                  <div className="text-left font-mono">
                    <p className={`font-black ${lot.loanType === "emergency" ? "text-blue-700" : "text-teal-700"}`}>
                      {formatCurrency(lot.totalPoolAmount)}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      {lot.drawMethod === "weighted" ? "اعتباری" : 
                       lot.drawMethod === "manual" ? "بر اساس درخواست" : 
                       lot.drawMethod.includes("emergency") ? "پس‌انداز انباشته" : "قرعه ساده"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 space-y-1.5 border border-slate-150">
            <div className="flex justify-between">
              <span>گردش انباشته کل صندوق:</span>
              <span className="font-black text-slate-700">{formatCurrency(totalPaidAllTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>صندوق پس‌انداز فعال:</span>
              <span className="font-black text-blue-800">{formatCurrency(netEmergencyPoolAvailable)}</span>
            </div>
            <div className="flex justify-between">
              <span>کل تسهیلات ثبت‌شده:</span>
              <span className="font-bold text-slate-755">{toPersianDigits(lotteries.length)} مورد</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
