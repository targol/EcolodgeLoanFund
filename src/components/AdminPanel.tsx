import React, { useState } from "react";
import { Member, Payment, FundSettings, PERS_MONTH_NAMES } from "../types";
import { toPersianDigits, formatCurrency, calculatePaymentScore } from "../utils/jalali";
import { sendTelegramMessage, formatTelegramMessage, DEFAULT_TELEGRAM_TEMPLATE } from "../utils/telegram";
import { 
  Users, UserPlus, Coins, Calendar, Check, X, AlertCircle, Trash2, Edit2,
  Settings as SettingsIcon, Save, RefreshCw, Trophy, Info, Key, Shield, Eye, EyeOff, Filter,
  Send, Bot, MessageSquare, Loader2, CheckCircle2, Radio, Image as ImageIcon, Upload, Link as LinkIcon
} from "lucide-react";
import LotteryDraw from "./LotteryDraw";

interface AdminPanelProps {
  members: Member[];
  payments: Payment[];
  lotteries: any[];
  settings: FundSettings;
  onAddMember: (name: string, password?: string) => void;
  onUpdateMember: (id: string, updatedFields: Partial<Member>) => void;
  onRemoveMember: (id: string) => void;
  onRecordPayment: (memberId: string, day: number) => void;
  onUpdateSettings: (newSettings: Partial<FundSettings>) => void;
  onDrawSuccess: (winnerId: string, method: "random" | "weighted" | "manual" | "emergency_random" | "emergency_manual", loanType: "main" | "emergency", customAmount?: number, customWinnerDate?: string) => void;
  onResetFundCycle: () => void;
  isDrawingActive: boolean;
  setIsDrawingActive: (val: boolean) => void;
  onToggleApplyForLoan?: (memberId: string, type: "main" | "emergency") => void;
}

export default function AdminPanel({
  members,
  payments,
  lotteries,
  settings,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onRecordPayment,
  onUpdateSettings,
  onDrawSuccess,
  onResetFundCycle,
  isDrawingActive,
  setIsDrawingActive,
  onToggleApplyForLoan
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"payments" | "members" | "draw" | "settings">("payments");
  
  // Form states - Add user
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("123");
  const [formError, setFormError] = useState("");

  // Filtering list of members by lottery status
  const [lotteryFilter, setLotteryFilter] = useState<"all" | "not_won" | "previously_won">("all");

  // Inline editing member name & password states
  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [tempUserName, setTempUserName] = useState("");
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [tempUserPassword, setTempUserPassword] = useState("");

  // Payment Recording State inline
  const [recordingPaymentForMemberId, setRecordingPaymentForMemberId] = useState<string | null>(null);
  const [paymentDayInput, setPaymentDayInput] = useState<number>(1);

  // Settings edit state
  const [editPriceAmount, setEditPriceAmount] = useState<string>(settings.monthlyAmount.toString());
  const [editSavingsAmount, setEditSavingsAmount] = useState<string>((settings.savingsAmount || 500000).toString());
  const [editFundName, setEditFundName] = useState<string>(settings.fundName);
  const [editLotteryDayOfMonth, setEditLotteryDayOfMonth] = useState<number>(settings.lotteryDayOfMonth || 1);
  const [editAutoDrawOnFirst, setEditAutoDrawOnFirst] = useState<boolean>(settings.autoDrawOnFirstOfMonth ?? true);
  const [editAdminPassword, setEditAdminPassword] = useState<string>(settings.adminPassword || "admin");
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Fund Custom Logo & Favicon
  const [editLogoUrl, setEditLogoUrl] = useState<string>(settings.logoUrl || "");

  // Telegram Integration States
  const [editTelegramBotToken, setEditTelegramBotToken] = useState<string>(settings.telegramBotToken || "");
  const [editTelegramChatId, setEditTelegramChatId] = useState<string>(settings.telegramChatId || "");
  const [editEnableTelegram, setEditEnableTelegram] = useState<boolean>(settings.enableTelegramNotification ?? true);
  const [editTelegramMessageTemplate, setEditTelegramMessageTemplate] = useState<string>(
    settings.telegramMessageTemplate || DEFAULT_TELEGRAM_TEMPLATE
  );
  const [telegramTestStatus, setTelegramTestStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg?: string }>({ type: "idle" });

  const handleTestTelegram = async () => {
    if (!editTelegramBotToken || !editTelegramChatId) {
      setTelegramTestStatus({
        type: "error",
        msg: "لطفاً توکن ربات تلگرام و Chat ID گروه را وارد کنید."
      });
      return;
    }
    setTelegramTestStatus({ type: "loading" });
    const testMsg = formatTelegramMessage(editTelegramMessageTemplate, {
      winnerName: "تست - اقامتگاه بومگردی نمادین",
      fundName: editFundName,
      monthName: `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`,
      amountStr: formatCurrency(members.length * Number(editPriceAmount)),
      dateStr: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
      loanTypeStr: "وام اصلی (پیام آزمایشی ارسال سیستم)"
    });

    const res = await sendTelegramMessage(editTelegramBotToken, editTelegramChatId, testMsg);
    if (res.success) {
      setTelegramTestStatus({ type: "success", msg: "پیام آزمایشی با موفقیت به گروه تلگرام ارسال شد! 🎉" });
    } else {
      setTelegramTestStatus({ type: "error", msg: res.error || "خطا در ارسال پیام تلگرام" });
    }
  };

  // Sync edit states whenever settings prop changes
  React.useEffect(() => {
    setEditPriceAmount(settings.monthlyAmount.toString());
    setEditSavingsAmount((settings.savingsAmount || 500000).toString());
    setEditFundName(settings.fundName);
    setEditLotteryDayOfMonth(settings.lotteryDayOfMonth || 1);
    setEditAutoDrawOnFirst(settings.autoDrawOnFirstOfMonth ?? true);
    setEditAdminPassword(settings.adminPassword || "admin");
    setEditLogoUrl(settings.logoUrl || "");
    setEditTelegramBotToken(settings.telegramBotToken || "");
    setEditTelegramChatId(settings.telegramChatId || "");
    setEditEnableTelegram(settings.enableTelegramNotification ?? true);
    setEditTelegramMessageTemplate(settings.telegramMessageTemplate || DEFAULT_TELEGRAM_TEMPLATE);
  }, [settings]);

  // Standalone Telegram Broadcast State
  const [standaloneMessage, setStandaloneMessage] = useState<string>("");
  const [standaloneSendStatus, setStandaloneSendStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg?: string }>({ type: "idle" });

  const handleSendStandaloneTelegram = async () => {
    const botToken = editTelegramBotToken || settings.telegramBotToken;
    const chatId = editTelegramChatId || settings.telegramChatId;

    if (!botToken || !chatId) {
      setStandaloneSendStatus({
        type: "error",
        msg: "لطفاً ابتدا توکن ربات تلگرام و Chat ID گروه را در فیلدهای بالا وارد کنید."
      });
      return;
    }

    if (!standaloneMessage.trim()) {
      setStandaloneSendStatus({
        type: "error",
        msg: "متن پیام نمی‌تواند خالی باشد."
      });
      return;
    }

    setStandaloneSendStatus({ type: "loading" });

    const formattedMsg = formatTelegramMessage(standaloneMessage, {
      winnerName: "نام عضو برنده",
      fundName: editFundName || settings.fundName,
      monthName: `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`,
      amountStr: formatCurrency(members.length * Number(editPriceAmount || settings.monthlyAmount)),
      dateStr: `${settings.currentYear}/${String(settings.currentMonthIndex + 1).padStart(2, '0')}/۰۱`,
      loanTypeStr: "تسهیلات اصلی"
    });

    const res = await sendTelegramMessage(botToken, chatId, formattedMsg);
    if (res.success) {
      setStandaloneSendStatus({
        type: "success",
        msg: "پیام اختصاصی با موفقیت به گروه تلگرام ارسال گردید! 🎉"
      });
      setStandaloneMessage("");
    } else {
      setStandaloneSendStatus({
        type: "error",
        msg: res.error || "خطا در ارسال پیام به گروه تلگرام"
      });
    }
  };
  const currentMonthName = `${PERS_MONTH_NAMES[settings.currentMonthIndex]} ${settings.currentYear}`;
  const totalAmountToCalculateScore = settings.monthlyAmount + (settings.savingsAmount || 500000);

  const handleSaveSettings = () => {
    onUpdateSettings({
      fundName: editFundName,
      monthlyAmount: Number(editPriceAmount),
      savingsAmount: Number(editSavingsAmount),
      lotteryDayOfMonth: editLotteryDayOfMonth,
      autoDrawOnFirstOfMonth: editAutoDrawOnFirst,
      adminPassword: editAdminPassword,
      logoUrl: editLogoUrl,
      telegramBotToken: editTelegramBotToken,
      telegramChatId: editTelegramChatId,
      enableTelegramNotification: editEnableTelegram,
      telegramMessageTemplate: editTelegramMessageTemplate,
    });
    alert("تنظیمات عمومی، لوگو و اطلاع‌رسانی با موفقیت ذخیره گردید!");
  };
  const totalSavingsPaidAllTime = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.savingsAmount || 0), 0);
  
  // Accumulated emergency loan payments subtracted to calculate net pool
  const totalEmergencySpent = lotteries
    .filter(l => l.loanType === "emergency")
    .reduce((sum, l) => sum + (l.totalPoolAmount || 0), 0);

  const netSavingsPool = Math.max(0, totalSavingsPaidAllTime - totalEmergencySpent);

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("پر کردن نام عضو الزامی است.");
      return;
    }
    onAddMember(newName.trim(), newPassword || "123");
    setNewName("");
    setNewPassword("123");
    setFormError("");
  };

  const filteredMembers = members.filter((member) => {
    if (lotteryFilter === "not_won") return !member.hasWon;
    if (lotteryFilter === "previously_won") return member.hasWon;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="admin-panel-root">
      {/* Admin Tab Header */}
      <div className="border-b border-slate-200 flex flex-wrap justify-between items-center px-6 pt-4 gap-2 bg-slate-50/50">
        <div className="flex gap-1 sm:gap-4">
          <button
            onClick={() => setActiveTab("payments")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "payments"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Coins className="w-4 h-4 text-slate-400" />
            <span>ثبت و تایید پرداخت‌ها</span>
          </button>
          
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "members"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>تعریف رمز و اعضا</span>
          </button>

          <button
            onClick={() => setActiveTab("draw")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 relative cursor-pointer ${
              activeTab === "draw"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <Trophy className="w-4 h-4 text-slate-400" />
            <span>برگزاری قرعه‌کشی</span>
            {members.filter(m => !m.hasWon).length > 0 && (
              <span className="absolute top-1 -left-2 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 px-1 cursor-pointer ${
              activeTab === "settings"
                ? "border-teal-800 text-teal-850 font-black"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-slate-400" />
            <span>تنظیمات عمومی</span>
          </button>
        </div>
        
        <div className="pb-4">
          <span className="text-[10px] font-sans font-black bg-teal-50 text-teal-800 border border-teal-150 px-2.5 py-1 rounded">
            پنل فرماندهی {settings.fundName}
          </span>
        </div>
      </div>

      {/* Admin Body Content */}
      <div className="p-6">
        
        {/* Tab 1: PAYMENTS */}
        {activeTab === "payments" && (
          <div className="space-y-4" id="admin-payments-subview">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div>
                <h4 className="text-sm font-black text-slate-800">تاییدیه‌های مالی دورۀ {currentMonthName}</h4>
                <p className="text-[11px] text-slate-450 mt-1">تعهدات پرداخت اعضا (اقساط ثابت: {formatCurrency(settings.monthlyAmount)} + پس‌انداز: {formatCurrency(settings.savingsAmount || 500000)}) در ماه جاری را تایید کنید.</p>
              </div>
              <div className="bg-teal-50 text-teal-800 text-[11px] px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-1.5 self-start font-bold">
                <Calendar className="w-4 h-4 text-teal-700" />
                <span>مهلت پرداخت: ۵ام هر ماه</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs min-w-[800px] whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 col-span-1 border-t-0 border-r-0 border-l-0">
                  <tr>
                    <th className="p-3.5">نام عضو</th>
                    <th className="p-3.5">وضعیت واریزی کل این ماه</th>
                    <th className="p-3.5">تاریخ ثبت فیش</th>
                    <th className="p-3.5">مبلغ اقساط ثابت</th>
                    <th className="p-3.5">مبلغ پس‌انداز ثابت</th>
                    <th className="p-3.5">امتیاز تاخیر/تعجیل</th>
                    <th className="p-3.5 text-center">عملیات ثبت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {members.map((member) => {
                    const payment = payments.find(p => p.memberId === member.id && p.monthName === currentMonthName);
                    const isPaid = payment?.status === "paid";
                    
                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-850">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-slate-100 text-slate-605 flex items-center justify-center font-bold text-xs uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <span className="block text-xs font-black text-slate-805">{member.name}</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {member.hasWon && (
                                  <span className="bg-slate-100 text-[9px] px-1.5 py-0.2 rounded border border-slate-200 mr-1 inline-block text-slate-500 font-bold">
                                    برنده وام اصلی ({member.winMonth})
                                  </span>
                                )}
                                {member.isAppliedForLoan && (
                                  <span className="bg-teal-50 text-teal-800 text-[9px] px-1 py-0.2 rounded border border-teal-100 font-bold animate-pulse">
                                    تقاضای فعال وام اصلی
                                  </span>
                                )}
                                {member.isAppliedForEmergency && (
                                  <span className="bg-blue-50 text-blue-800 text-[9px] px-1 py-0.2 rounded border border-blue-100 font-bold">
                                    متقاضی وام ضروری
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {isPaid ? (
                            <span className="text-teal-700 bg-teal-50 text-[10px] px-2.5 py-1 rounded border border-teal-100 font-bold inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> وصول شد
                            </span>
                          ) : (
                            <span className="text-rose-500 bg-rose-50 text-[10px] px-2.5 py-1 rounded border border-rose-100 font-bold inline-flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> پرداخت نشده
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {isPaid && payment ? (
                            <span>{payment.paymentDateShamsi}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {formatCurrency(payment?.amount || settings.monthlyAmount)}
                        </td>
                        <td className="p-3.5 font-mono text-blue-800">
                          {formatCurrency(payment?.savingsAmount || settings.savingsAmount || 500000)}
                        </td>
                        <td className="p-3.5">
                          {isPaid && payment ? (
                            <span className={`font-mono font-bold ${payment.scoreDelta >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                              {payment.scoreDelta >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(payment.scoreDelta))}
                            </span>
                          ) : (
                            <span className="text-slate-400">نامشخص</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {isPaid ? (
                            <span className="text-teal-700 text-[11px] font-bold">پرداخت نهایی شد</span>
                          ) : (
                            <div className="flex justify-center">
                              {recordingPaymentForMemberId === member.id ? (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 flex flex-col gap-3 min-w-[280px] max-w-sm text-right shadow-sm">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-500">تاریخ فرضی فیش شمسی:</span>
                                    <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                      روز {toPersianDigits(paymentDayInput)} از ۳۰/۳۱
                                    </span>
                                  </div>

                                  {/* Graphical Shamsi Calendar Grid Selector */}
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 block">روز پرداخت را روی تقویم کلیک کنید:</label>
                                    <div className="grid grid-cols-7 gap-1 text-center bg-white p-2 rounded-lg border border-slate-150 shadow-inner font-sans">
                                      {/* Weekday abbreviations */}
                                      {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w, index) => (
                                        <span key={index} className="text-[9px] text-slate-400 font-bold py-0.5">{w}</span>
                                      ))}
                                      {/* Render Days based on Month length */}
                                      {Array.from({ length: (settings.currentMonthIndex <= 5 ? 31 : (settings.currentMonthIndex <= 10 ? 30 : 29)) }, (_, idx) => {
                                        const dayNum = idx + 1;
                                        const isSelected = paymentDayInput === dayNum;
                                        const isEarly = dayNum <= settings.lotteryDayOfMonth;
                                        return (
                                          <button
                                            key={dayNum}
                                            type="button"
                                            onClick={() => setPaymentDayInput(dayNum)}
                                            className={`h-7 rounded text-[11px] font-mono font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                                              isSelected 
                                                ? "bg-teal-700 text-white font-black scale-105 shadow-sm border border-teal-800"
                                                : isEarly
                                                  ? "bg-emerald-55 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200"
                                                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                                            }`}
                                            title={isEarly ? `تعجیل خوش‌حسابی (روز ${dayNum})` : `تاخیر دیرکرد (روز ${dayNum})`}
                                          >
                                            <span>{toPersianDigits(dayNum)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500">تاثیر ارزش امتیاز خوش‌حسابی:</span>
                                    {member.hasWon ? (
                                      <span className="font-bold text-teal-700">۰ امتیاز (معاف - برنده تسهیلات)</span>
                                    ) : (
                                      <span className={`font-bold font-mono ${calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                                        {calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score >= 0 ? '+' : ''}
                                        {toPersianDigits(new Intl.NumberFormat("en-US").format(calculatePaymentScore(paymentDayInput, totalAmountToCalculateScore, settings.lotteryDayOfMonth).score))}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex gap-2 pt-1.5 border-t border-slate-200">
                                    <button
                                      onClick={() => {
                                        onRecordPayment(member.id, paymentDayInput);
                                        setRecordingPaymentForMemberId(null);
                                      }}
                                      className="flex-1 bg-teal-800 hover:bg-teal-905 text-white rounded py-1.5 text-[10px] font-extrabold cursor-pointer transition-colors"
                                    >
                                      تایید نهایی و ثبت
                                    </button>
                                    <button
                                      onClick={() => setRecordingPaymentForMemberId(null)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      لغو
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setRecordingPaymentForMemberId(member.id);
                                    setPaymentDayInput(1); // default to superb day 1 (early)
                                  }}
                                  className="py-1 px-3 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded text-[11px] shadow-sm transition-all cursor-pointer"
                                >
                                  ثبت فیش واریز
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl text-[11px] text-slate-500 flex items-start gap-2.5 border border-slate-200 leading-relaxed font-sans">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 mb-1">مکانیزم تبارسنجیِ پرداخت</p>
                <p className="text-[10px] leading-relaxed">
                  تعجیل در هر پرداختی منجر به انباشت فزآینده اولویت در قرعه‌کشی نوبتی می‌گردد. همچنین با استفاده از تقویم شمسی موجود در دکمه "ثبت فیش واریز"، می‌توانید روز دقیق عملکرد پرداختِ عضو را بدون ورود دستی ثبت و محاسبه نمایید.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: NEW MEMBERS MANAGEMENT AND PASSWORDS */}
        {activeTab === "members" && (
          <div className="space-y-4 animate-fadeIn" id="admin-members-subview">
            
            {/* Filter and Grouping Controls */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 font-sans">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-700 font-bold" />
                <span className="text-xs font-bold text-slate-700">فیلتر و مدیریت پرونده اعضا بر اساس وضعیت قرعه‌کشی:</span>
              </div>
              <div className="bg-white p-1 rounded-lg border border-slate-200 flex gap-1 text-[11px]">
                <button
                  onClick={() => setLotteryFilter("all")}
                  className={`py-1 px-3 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "all" ? "bg-teal-700 text-white font-extrabold shadow-sm" : "text-slate-505 hover:text-slate-800"
                  }`}
                >
                  همه اعضا ({toPersianDigits(members.length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("not_won")}
                  className={`py-1 px-3 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "not_won" ? "bg-amber-500 text-white font-extrabold shadow-sm" : "text-slate-505 hover:text-slate-800"
                  }`}
                >
                  در انتظار قرعه ({toPersianDigits(members.filter(m => !m.hasWon).length)})
                </button>
                <button
                  onClick={() => setLotteryFilter("previously_won")}
                  className={`py-1 px-3 rounded font-bold transition-all cursor-pointer ${
                    lotteryFilter === "previously_won" ? "bg-teal-600 text-white font-extrabold shadow-sm" : "text-slate-505 hover:text-slate-800"
                  }`}
                >
                  برندگان قبلی وام اصلی ({toPersianDigits(members.filter(m => m.hasWon).length)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Member Profile Form with Password */}
              <div className="bg-slate-50/55 p-5 rounded-xl border border-slate-200 flex flex-col justify-between h-fit">
                <form onSubmit={handleCreateMember} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <UserPlus className="w-5 h-5 text-teal-750" />
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">تعریف و ایجاد عضو جدید</h4>
                  </div>

                  {formError && (
                    <div className="p-2.5 bg-rose-50 text-rose-700 text-[11px] rounded-lg border border-rose-100 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام و نام خانوادگی عضو</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مهران شریفی"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">رمز عبور دلخواه برای عضو (جهت ورود به پنل شخصی)</label>
                    <input
                      type="text"
                      required
                      placeholder="پیش‌فرض: 123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded text-xs bg-white text-slate-800 font-bold focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-all"
                    />
                  </div>

                  <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-[10px] text-teal-905 leading-relaxed font-bold">
                    📌 <b>تاریخ شروع عضویت:</b> پرونده جدید به محض کلیک با تاریخ امروز سیستم به فهرست ملحق شده و فیش‌های دوره‌ای آن از ماه جاری آغاز خواهد شد. تلفن همراه لزومی ندارد.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-teal-850 hover:bg-teal-900 text-white font-black rounded-lg text-xs transition-all shadow cursor-pointer text-center"
                  >
                    ثبت پرونده و تولید رمز عبور
                  </button>
                </form>
              </div>

              {/* Members List and Accounts with editable features */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">فهرست حساب‌های کاربری مصوب ({toPersianDigits(filteredMembers.length)} حساب)</h4>
                
                {filteredMembers.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                    هیچ فولدری یا پرونده‌ای با مشخصات این فیلتر منطبق نیست.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className={`p-4 rounded-xl border bg-white transition-all shadow-sm flex flex-col justify-between gap-3 ${
                          member.hasWon ? "border-teal-100 bg-teal-50/10" : "border-slate-205"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            {editingNameUserId === member.id ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input 
                                  type="text" 
                                  autoFocus
                                  value={tempUserName}
                                  onChange={(e) => setTempUserName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      if (tempUserName.trim()) {
                                        onUpdateMember(member.id, { name: tempUserName.trim() });
                                        alert(`نام عضو به «${tempUserName.trim()}» تغییر یافت.`);
                                      }
                                      setEditingNameUserId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingNameUserId(null);
                                    }
                                  }}
                                  className="p-1 border border-teal-500 rounded text-xs font-bold flex-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (tempUserName.trim()) {
                                      onUpdateMember(member.id, { name: tempUserName.trim() });
                                      alert(`نام عضو به «${tempUserName.trim()}» تغییر یافت.`);
                                    }
                                    setEditingNameUserId(null);
                                  }}
                                  className="p-1.5 bg-teal-750 text-white rounded hover:bg-teal-800 cursor-pointer"
                                  title="ذخیره نام"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNameUserId(null)}
                                  className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
                                  title="انصراف"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800 text-sm">{member.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNameUserId(member.id);
                                    setTempUserName(member.name);
                                  }}
                                  className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded cursor-pointer transition-colors"
                                  title="ویرایش نام عضو"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <span className="text-[10px] text-slate-400 block mt-1">
                              عضویت از: <b>{member.joinDateShamsi}</b>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              مجموع اعتبار خوش‌حسابی:{" "}
                              <b className={`font-mono ${member.score >= 0 ? 'text-teal-650' : 'text-rose-500'}`}>
                                {member.score >= 0 ? '+' : ''}{toPersianDigits(new Intl.NumberFormat("en-US").format(member.score))}
                              </b>
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 text-left shrink-0">
                            {member.hasWon ? (
                              <span className="bg-teal-50 text-teal-800 text-[9px] px-2 py-0.5 rounded font-black border border-teal-100">
                                برنده وام ({member.winMonth})
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded font-black border border-amber-100">
                                در نوبت تسهیلات
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1">
                          {editingPasswordUserId === member.id ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="text" 
                                autoFocus
                                value={tempUserPassword}
                                onChange={(e) => setTempUserPassword(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (tempUserPassword.trim()) {
                                      onUpdateMember(member.id, { password: tempUserPassword.trim() });
                                      alert(`رمز عبور ${member.name} تغییر یافت.`);
                                    }
                                    setEditingPasswordUserId(null);
                                  } else if (e.key === "Escape") {
                                    setEditingPasswordUserId(null);
                                  }
                                }}
                                className="p-1 border border-teal-500 rounded text-xs font-bold w-28 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="رمز جدید"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempUserPassword.trim()) {
                                    onUpdateMember(member.id, { password: tempUserPassword.trim() });
                                    alert(`رمز عبور ${member.name} تغییر یافت.`);
                                  }
                                  setEditingPasswordUserId(null);
                                }}
                                className="p-1.5 bg-teal-750 text-white rounded hover:bg-teal-800 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPasswordUserId(null)}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPasswordUserId(member.id);
                                setTempUserPassword(member.password);
                              }}
                              className="text-[10px] text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Key className="w-3 h-3 text-teal-650" />
                              <span>رمز پنل: {member.password} (تغییر)</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`آیا از حذف پرونده ${member.name} مطمئن هستید؟ فرآیند بازنشانی واریزی‌ها و امتیازات این عضو قطع خواهد شد.`)) {
                                onRemoveMember(member.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded border border-transparent hover:border-rose-100 cursor-pointer transition-all"
                            title="حذف پرونده عضو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: DRAW LOTTERY */}
        {activeTab === "draw" && (
          <LotteryDraw 
            members={members}
            settings={settings}
            onDrawSuccess={onDrawSuccess}
            isDrawingActive={isDrawingActive}
            setIsDrawingActive={setIsDrawingActive}
            accumulatedSavingsPool={netSavingsPool}
            onToggleApplyForLoan={onToggleApplyForLoan}
          />
        )}

        {/* Tab 4: SETTINGS AND MASTER COMMANDS */}
        {activeTab === "settings" && (
          <div className="space-y-8 animate-fadeIn" id="admin-settings-subview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fund Policy Settings */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <SettingsIcon className="w-5 h-5 text-teal-750" />
                  <h4 className="text-sm font-black text-slate-800">تعدیل سیاست‌های مالی و هویتی قرض‌الحسنه</h4>
                </div>

                <div className="space-y-4 font-sans">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">نام اختصاصی صندوق قرض‌الحسنه</label>
                    <input
                      type="text"
                      value={editFundName}
                      onChange={(e) => setEditFundName(e.target.value)}
                      className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                    />
                  </div>

                  {/* Fund Logo / Favicon Upload & URL Setting */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-teal-700" />
                        <span>لوگوی اختصاصی صندوق و آیکون مرورگر (Favicon)</span>
                      </label>
                      {editLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditLogoUrl("")}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          حذف و بازگشت به پیش‌فرض
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Logo Preview box */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {editLogoUrl ? (
                          <img 
                            src={editLogoUrl} 
                            alt="پیش‌نمایش لوگو" 
                            className="w-full h-full object-contain p-1"
                            onError={() => alert("آدرس تصویر معتبر نیست یا قابل بارگذاری نمی‌باشد.")}
                          />
                        ) : (
                          <div className="text-center p-1">
                            <ImageIcon className="w-5 h-5 text-slate-400 mx-auto" />
                            <span className="text-[8px] text-slate-400 block mt-0.5 font-bold">لوگوی پیش‌فرض</span>
                          </div>
                        )}
                      </div>

                      {/* Upload / Link inputs */}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 py-2 px-3 bg-white hover:bg-teal-50 text-teal-900 border border-slate-250 hover:border-teal-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-teal-700" />
                            <span>بارگذاری تصویر لوگو از سیستم</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert("حجم تصویر نباید بیشتر از ۲ مگابایت باشد.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditLogoUrl(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="یا وارد کردن لینک مستقیم تصویر (https://...)"
                            value={editLogoUrl.startsWith("data:") ? "تصویر بارگذاری شده از سیستم" : editLogoUrl}
                            onChange={(e) => setEditLogoUrl(e.target.value)}
                            disabled={editLogoUrl.startsWith("data:")}
                            className="w-full p-1.5 px-2.5 border border-slate-200 bg-white text-slate-800 text-[11px] font-mono rounded focus:outline-none focus:border-teal-600"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-slate-500 block leading-tight">
                      💡 با تنظیم لوگو، تصویر آن در هدر اصلی سامانه و همچنین به عنوان تب‌بار (Favicon) مرورگر اعضا به صورت خودکار نمایش داده می‌شود.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">قسط ماهانه (تومان)</label>
                      <input
                        type="number"
                        value={editPriceAmount}
                        onChange={(e) => setEditPriceAmount(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">پس‌انداز ذخیره (تومان)</label>
                      <input
                        type="number"
                        value={editSavingsAmount}
                        onChange={(e) => setEditSavingsAmount(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">روز موعد قرعه‌کشی</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={editLotteryDayOfMonth}
                        onChange={(e) => setEditLotteryDayOfMonth(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-mono font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                    </div>
                  </div>

                  {/* Auto Draw setting */}
                  <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-teal-900">اجرای خودکار قرعه‌کشی در روز اول ماه شمسی</span>
                      <span className="text-[10px] text-slate-500">انجام خودکار محاسبه امتیازات و انتخاب برنده در تاریخ اول هر ماه</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={editAutoDrawOnFirst} 
                        onChange={(e) => setEditAutoDrawOnFirst(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">کد عبور ادمین جهت ورود به پنل مدیریت</label>
                    <div className="relative">
                      <input
                        type={showAdminPass ? "text" : "password"}
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-205 bg-white text-slate-800 font-bold rounded text-xs focus:outline-none focus:border-teal-705"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Fund Emergency Box */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80 mb-3">
                    <Shield className="w-5 h-5 text-rose-600 animate-pulse" />
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">فرامین حساس بازنشانی اضطراری</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    در صورت فعال‌سازی این دکمه، کلیه تراکنش‌های واریزی، پرونده‌های عضو اضافه شده، امتیازها و تاریخچه‌های قرعه‌کشی به صورت کامل ابطال گشته و مقادیر اولیه سند پیش‌فرم بارگذاری خواهد گشت. این فرآیند غیرقابل بازگشت است.
                  </p>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => {
                      if (confirm("⚠️ آیا کاملاً مایل هستید کل داده‌ها و تراکنش‌های صندوق را به حالت اولیه دمو بازگردانید؟")) {
                        onResetFundCycle();
                        alert("صندوق با موفقیت بازنشانی شد.");
                      }
                    }}
                    className="py-2.5 px-5 bg-rose-50 hover:bg-rose-105 border border-rose-200 text-rose-700 hover:text-white hover:bg-rose-600 transition-all font-black rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>ریست کامل و بازنشانی دیتابیس صندوق</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TELEGRAM INTEGRATION SECTION */}
            <div className="bg-white p-6 rounded-xl border border-sky-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">تنظیمات ربات و ارسال خودکار نتایج به گروه تلگرام</h4>
                    <p className="text-[11px] text-slate-500">ارسال خودکار ویدیو و نتیجه قرعه‌کشی پس از برگزاری یا در اول ماه</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editEnableTelegram} 
                    onChange={(e) => setEditEnableTelegram(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5 text-sky-600" />
                    <span>توکن اختصاصی ربات تلگرام (Bot Token)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="123456789:AAG..."
                    value={editTelegramBotToken}
                    onChange={(e) => setEditTelegramBotToken(e.target.value)}
                    className="w-full p-2.5 border border-slate-250 bg-white text-slate-800 font-mono text-xs rounded focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">دریافت شده از ربات BotFather@ تلگرام</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                    <span>شناسه چت یا آیدی گروه (Chat ID / Username)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="-100123456789 یا @my_fund_channel"
                    value={editTelegramChatId}
                    onChange={(e) => setEditTelegramChatId(e.target.value)}
                    className="w-full p-2.5 border border-slate-250 bg-white text-slate-800 font-mono text-xs rounded focus:outline-none focus:border-sky-500"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">آیدی عددی منفی یا یوزرنام کانال/گروه تلگرام</span>
                </div>
              </div>

              {/* Editable Message Template */}
              <div className="space-y-2 font-sans">
                <label className="block text-[11px] font-bold text-slate-700">
                  متن و الگوی پیام سفارشی جهت ارسال به گروه تلگرام:
                </label>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className="text-[10px] font-bold text-slate-500">متغیرهای پویا (کلیک برای درج):</span>
                  {[
                    "{نام_برنده}",
                    "{ماه}",
                    "{نام_صندوق}",
                    "{مبلغ_وام}",
                    "{تاریخ_قرعه_کشی}",
                    "{نوع_وام}"
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditTelegramMessageTemplate(prev => prev + " " + tag)}
                      className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-mono font-bold rounded border border-sky-200 cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={6}
                  value={editTelegramMessageTemplate}
                  onChange={(e) => setEditTelegramMessageTemplate(e.target.value)}
                  className="w-full p-3 border border-slate-250 bg-slate-50 text-slate-800 text-xs rounded-lg font-sans leading-relaxed focus:outline-none focus:border-sky-500 focus:bg-white"
                  dir="rtl"
                />
              </div>

              {/* Action Buttons & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="py-2.5 px-6 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-lg text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>ذخیره تمامی تنظیمات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={telegramTestStatus.type === "loading"}
                    className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {telegramTestStatus.type === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>ارسال پیام آزمایشی به تلگرام</span>
                  </button>
                </div>

                {telegramTestStatus.type !== "idle" && (
                  <div className={`p-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    telegramTestStatus.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : telegramTestStatus.type === "error"
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : "bg-sky-50 text-sky-800 border border-sky-200"
                  }`}>
                    {telegramTestStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {telegramTestStatus.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{telegramTestStatus.msg}</span>
                  </div>
                )}
              </div>

              {/* Instructions Guide Card */}
              <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 space-y-2 text-xs text-amber-900 font-sans">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>راهنمای اتصال سریع ربات تلگرام به گروه صندوق:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed pr-2">
                  <li>در تلگرام وارد ربات <b>BotFather@</b> شوید و فرمان <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">/newbot</code> را ارسال کرده و نام ربات را ثبت کنید.</li>
                  <li>کد توکن اختصاصی دریافتی (API Token) را کپی کرده و در فیلد بالا قرار دهید.</li>
                  <li>ربات را به گروه یا کانال تلگرام صندوق اضافه کرده و آن را به عنوان <b>مدیر (Admin)</b> با دسترسی ارسال پیام تنظیم کنید.</li>
                  <li>آیدی عددی منفی گروه (مثلاً <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">-100123456789</code>) یا یوزرنام کانال را در فیلد Chat ID وارد کرده و دکمه تست را بزنید.</li>
                </ol>
              </div>
            </div>

            {/* STANDALONE TELEGRAM BROADCAST MODULE */}
            <div className="bg-white p-6 rounded-xl border border-teal-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 text-teal-800 rounded-lg border border-teal-100">
                    <MessageSquare className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">ارسال پیام و اطلاع‌رسانی مجزا به گروه تلگرام</h4>
                    <p className="text-[11px] text-slate-500">ارسال مستقیم هرگونه پیام سفارشی، اطلاعیه یا یادآوری مستقل به اعضا در گروه تلگرام</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-150 px-2.5 py-1 rounded">
                  ارسال مستقیم پیام ادمین
                </span>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5 font-sans">
                <label className="text-[11px] font-bold text-slate-600 block">قالب‌های آماده پیام (جهت درج سریع):</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStandaloneMessage(`📢 <b>اطلاعیه آغاز دوره و واریز اقساط {ماه}</b>\n\nبا سلام و احترام حضور اعضای گرامی <b>{نام_صندوق}</b>،\nبدین‌وسیله به اطلاع می‌رساند دوره واریز اقساط و پس‌انداز مربوط به <b>{ماه}</b> آغاز گردید.\n\n💰 <b>مبلغ قسط ثابت:</b> {مبلغ_وام} تومان\n📅 <b>مهلت پرداخت:</b> پنجم این ماه\n\nاز همیاری و خوش‌حسابی شما سپاسگزاریم! 🙏`)}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-200 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>📢 اطلاعیه واریز اقساط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStandaloneMessage(`⏰ <b>یادآوری فوری مهلت واریز اقساط</b>\n\nاعضای محترم <b>{نام_صندوق}</b>،\nبا توجه به نزدیک شدن به زمان برگزاری قرعه‌کشی <b>{ماه}</b>، خواهشمند است نسبت به تسویه قسط و ارسال فیش اقدام فرمایید.\n\nسپاس از انضباط مالی شما 🙏`)}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-200 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>⏰ یادآوری مهلت پرداخت</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStandaloneMessage(`🎲 <b>اطلاعیه زمان برگزاری قرعه‌کشی</b>\n\nاعضای گرامی <b>{نام_صندوق}</b>،\nبه اطلاع می‌رساند شبیه‌سازی انیمیشنی قرعه‌کشی این دوره در تاریخ <b>{تاریخ_قرعه_کشی}</b> برگزار خواهد شد.\n\nبا آرزوی موفقیت برای تمامی اعضا! ✨`)}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-900 border border-slate-200 hover:border-sky-200 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>🎲 اطلاعیه زمان قرعه‌کشی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStandaloneMessage("")}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <span>پاکسازی متن</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Tag Helpers */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-slate-400">درج متغیرها:</span>
                {["{نام_صندوق}", "{ماه}", "{تاریخ_قرعه_کشی}"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setStandaloneMessage(prev => prev + " " + tag)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold rounded cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Text Input Area */}
              <textarea
                rows={5}
                placeholder="متن پیام سفارشی یا اطلاع‌رسانی مجزا را اینجا بنویسید (پشتیبانی از کدهای HTML مانند <b>متن پررنگ</b>)..."
                value={standaloneMessage}
                onChange={(e) => setStandaloneMessage(e.target.value)}
                className="w-full p-3.5 border border-slate-250 bg-white text-slate-800 text-xs rounded-xl font-sans leading-relaxed focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                dir="rtl"
              />

              {/* Submit Button & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendStandaloneTelegram}
                  disabled={standaloneSendStatus.type === "loading"}
                  className="py-2.5 px-6 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-lg text-xs cursor-pointer shadow-sm transition-all flex items-center gap-2"
                >
                  {standaloneSendStatus.type === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>ارسال پیام مجزا به گروه تلگرام</span>
                </button>

                {standaloneSendStatus.type !== "idle" && (
                  <div className={`p-2.5 px-4 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    standaloneSendStatus.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : standaloneSendStatus.type === "error"
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : "bg-teal-50 text-teal-800 border border-teal-200"
                  }`}>
                    {standaloneSendStatus.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {standaloneSendStatus.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{standaloneSendStatus.msg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
