import { formatCurrency, toPersianDigits, toEnglishDigits } from "./jalali";
import { MessageTemplate } from "../types";

export const DEFAULT_TELEGRAM_TEMPLATE = `🎉 <b>نتیجه قرعه‌کشی {ماه} {نام_صندوق}</b>

🏆 <b>برنده خوش‌شانس این دوره:</b>
👤 <b>{نام_برنده}</b>

💰 <b>مبلغ تسهیلات:</b> {مبلغ_وام}
📅 <b>تاریخ برگزاری:</b> {تاریخ_قرعه_کشی}
📌 <b>نوع تسهیلات:</b> {نوع_وام}

🎬 <i>ویدیو و شبیه‌سازی انیمیشنی قرعه‌کشی انجام شد.</i>

✨ ضمن تبریک فراوان به برنده محترم، از تمامی اعضای خوش‌حساب صندوق بابت مشارکت صمیمانه سپاسگزاریم! 🙏`;

export const INITIAL_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl_lottery",
    title: "🎉 اعلام برنده قرعه‌کشی ماهانه",
    category: "lottery",
    isDefault: true,
    content: `🎉 <b>نتیجه قرعه‌کشی {ماه} {نام_صندوق}</b>

🏆 <b>برنده خوش‌شانس این دوره:</b>
👤 <b>{نام_برنده}</b>

💰 <b>مبلغ تسهیلات:</b> {مبلغ_وام}
📅 <b>تاریخ برگزاری:</b> {تاریخ_قرعه_کشی}
📌 <b>نوع تسهیلات:</b> {نوع_وام}

🎬 <i>فرآیند قرعه‌کشی و محاسبه امتیازات با موفقیت انجام شد.</i>

✨ تبریک فراوان به برنده عزیز و سپاس از همراهی شما! 🙏`
  },
  {
    id: "tpl_payment_reminder",
    title: "⏰ یادآوری مهلت پرداخت اقساط (قبل از موعد)",
    category: "reminder",
    isDefault: true,
    content: `⏰ <b>یادآوری موعد پرداخت اقساط {ماه}</b>

سلام و احترام خدمت اعضای گرامی <b>{نام_صندوق}</b>،
به استحضار می‌رساند موعد واریز اقساط ماه <b>{ماه}</b> تا <b>{مهلت_پرداخت}</b> می‌باشد.

💰 <b>مبلغ قسط وام:</b> {مبلغ_قسط}
🪙 <b>پس‌انداز صندوق طلا:</b> {مبلغ_پس_انداز}
💳 <b>مجموع قابل پرداخت:</b> {مبلغ_کل}

🌟 <i>واریز تا قبل از موعد شامل امتیاز ویژه خوش‌حسابی در قرعه‌کشی خواهد بود.</i>

لطفاً پس از واریز، تصویر فیش را در پنل کاربری خود بارگذاری فرمایید. 🙏`
  },
  {
    id: "tpl_unpaid_overdue",
    title: "⚠️ اخطار عدم ثبت فیش واریزی (یادآوری اختصاصی)",
    category: "overdue",
    isDefault: true,
    content: `⚠️ <b>یادآوری فوری تسویه و ثبت فیش {ماه}</b>

سلام <b>{نام_عضو}</b> عزیز،
ضمن آرزوی تندرستی، فیش واریزی شما بابت قسط و پس‌انداز ماه <b>{ماه}</b> ({نام_صندوق}) هنوز در سامانه ثبت نشده است.

💳 <b>مبلغ تعهد ماه جاری:</b> {مبلغ_کل}
📊 <b>تعداد سهم:</b> {تعداد_سهم} سهم

خواهشمند است جهت جلوگیری از کسر امتیاز خوش‌حسابی و حفظ نظم صندوق، در اسرع وقت نسبت به واریز و ثبت فیش اقدام فرمایید. با سپاس 🙏`
  },
  {
    id: "tpl_receipt_confirmed",
    title: "✅ تاییدیه دریافت فیش و ثبت امتیاز",
    category: "receipt",
    isDefault: true,
    content: `✅ <b>تاییدیه ثبت فیش واریزی {ماه}</b>

عضو گرامی جناب آقای/سرکار خانم <b>{نام_عضو}</b>،
فیش واریزی شما بابت تعهدات ماه <b>{ماه}</b> در <b>{نام_صندوق}</b> با موفقیت تایید گردید.

💰 <b>مبلغ واریز شده:</b> {مبلغ_کل}
⭐️ <b>امتیاز خوش‌حسابی:</b> ثبت شده در پرونده

از نظم و وقت‌شناسی شما بی‌نهایت سپاسگزاریم! 🌸`
  },
  {
    id: "tpl_new_cycle_announcement",
    title: "📢 اطلاعیه آغاز دوره و ماه جدید",
    category: "announcement",
    isDefault: true,
    content: `📢 <b>آغاز دوره واریز اقساط ماه {ماه}</b>

با سلام و احترام حضور تمامی اعضای محترم <b>{نام_صندوق}</b>،
دوره واریز اقساط و سرمایه‌گذاری پس‌انداز ماه <b>{ماه}</b> آغاز گردید.

💰 <b>قسط وام هر سهم:</b> {مبلغ_قسط}
🪙 <b>پس‌انداز هر سهم (صندوق طلا):</b> {مبلغ_پس_انداز}
📅 <b>مهلت پرداخت و ثبت فیش:</b> {مهلت_پرداخت}

از همیاری و انضباط مالی شما سپاسگزاریم! 🙏`
  }
];

export interface TelegramMessageData {
  winnerName?: string;
  fundName?: string;
  monthName?: string;
  amountStr?: string;
  dateStr?: string;
  loanTypeStr?: string;
  memberName?: string;
  memberPhone?: string;
  installmentAmountStr?: string;
  savingsAmountStr?: string;
  totalAmountStr?: string;
  sharesCountStr?: string;
  dueDateStr?: string;
}

// Convert Iranian / international phone number to proper Telegram link format (+989...)
export function formatPhoneForTelegram(phone: string | undefined | null): string {
  if (!phone) return "";
  const eng = toEnglishDigits(phone).replace(/[^\d+]/g, "");
  if (!eng) return "";
  
  if (eng.startsWith("+98")) {
    return eng;
  }
  if (eng.startsWith("0098")) {
    return "+" + eng.substring(2);
  }
  if (eng.startsWith("98")) {
    return "+" + eng;
  }
  if (eng.startsWith("09")) {
    return "+98" + eng.substring(1);
  }
  if (eng.startsWith("9") && eng.length === 10) {
    return "+98" + eng;
  }
  return eng.startsWith("+") ? eng : `+${eng}`;
}

// Generate direct Telegram deep links
export function getTelegramDirectLink(phone?: string, text?: string): {
  directChatUrl: string;
  shareTextUrl: string;
  tgAppUrl: string;
} {
  const formattedPhone = formatPhoneForTelegram(phone);
  const encodedText = text ? encodeURIComponent(text) : "";
  
  // Telegram web/app direct phone link (e.g. https://t.me/+989123456789)
  const directChatUrl = formattedPhone 
    ? `https://t.me/${formattedPhone}` 
    : `https://t.me/`;

  // Telegram share text URL which allows selecting or sending directly to Telegram chat
  const shareTextUrl = encodedText 
    ? `https://t.me/share/url?url=&text=${encodedText}` 
    : `https://t.me/`;

  // Deep link protocol for Telegram desktop/mobile app
  const tgAppUrl = formattedPhone 
    ? `tg://resolve?phone=${formattedPhone.replace("+", "")}` 
    : `tg://msg?text=${encodedText}`;

  return { directChatUrl, shareTextUrl, tgAppUrl };
}

export function formatTelegramMessage(
  template: string,
  data: TelegramMessageData
): string {
  let msg = template !== undefined && template !== null ? template : DEFAULT_TELEGRAM_TEMPLATE;
  if (!msg) return "";

  if (data.winnerName) msg = msg.replace(/\{نام_برنده\}|\{winner_name\}/g, data.winnerName);
  if (data.fundName) msg = msg.replace(/\{نام_صندوق\}|\{fund_name\}/g, data.fundName);
  if (data.monthName) msg = msg.replace(/\{ماه\}|\{month_name\}/g, data.monthName);
  if (data.amountStr) msg = msg.replace(/\{مبلغ_وام\}|\{amount\}/g, data.amountStr);
  if (data.dateStr) msg = msg.replace(/\{تاریخ_قرعه_کشی\}|\{draw_date\}/g, data.dateStr);
  if (data.loanTypeStr) msg = msg.replace(/\{نوع_وام\}|\{loan_type\}/g, data.loanTypeStr);
  if (data.memberName) msg = msg.replace(/\{نام_عضو\}|\{member_name\}/g, data.memberName);
  if (data.memberPhone) msg = msg.replace(/\{شماره_تلفن\}|\{phone\}/g, data.memberPhone);
  if (data.installmentAmountStr) msg = msg.replace(/\{مبلغ_قسط\}/g, data.installmentAmountStr);
  if (data.savingsAmountStr) msg = msg.replace(/\{مبلغ_پس_انداز\}/g, data.savingsAmountStr);
  if (data.totalAmountStr) msg = msg.replace(/\{مبلغ_کل\}/g, data.totalAmountStr);
  if (data.sharesCountStr) msg = msg.replace(/\{تعداد_سهم\}/g, data.sharesCountStr);
  if (data.dueDateStr) msg = msg.replace(/\{مهلت_پرداخت\}/g, data.dueDateStr);

  return msg;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return {
      success: false,
      error: "توکن ربات یا شناسه چت (Chat ID) گروه تلگرام مشخص نشده است."
    };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageText,
        parse_mode: "HTML"
      })
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data.description || "خطا در ارسال پیام به تلگرام (لطفاً توکن ربات و Chat ID را بررسی کنید)"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "خطای عدم دسترسی یا شبکه هنگام ارتباط با آدرس API تلگرام"
    };
  }
}

export async function sendTelegramVideo(
  botToken: string,
  chatId: string,
  videoBlob: Blob,
  captionText: string,
  fileName: string = "lottery-draw.webm"
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return {
      success: false,
      error: "توکن ربات یا شناسه چت گروه تلگرام مشخص نشده است."
    };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  try {
    // 1. Try sending via sendVideo
    const formData = new FormData();
    formData.append("chat_id", cleanChatId);
    formData.append("video", videoBlob, fileName);
    formData.append("caption", captionText);
    formData.append("parse_mode", "HTML");
    formData.append("supports_streaming", "true");

    const videoUrl = `https://api.telegram.org/bot${cleanToken}/sendVideo`;
    const response = await fetch(videoUrl, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    }

    // 2. Fallback to sendAnimation / sendDocument if video format requires document envelope
    const docFormData = new FormData();
    docFormData.append("chat_id", cleanChatId);
    docFormData.append("document", videoBlob, fileName);
    docFormData.append("caption", captionText);
    docFormData.append("parse_mode", "HTML");

    const docUrl = `https://api.telegram.org/bot${cleanToken}/sendDocument`;
    const docResponse = await fetch(docUrl, {
      method: "POST",
      body: docFormData
    });

    const docData = await docResponse.json();
    if (docData.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: data.description || docData.description || "خطا در ارسال فایل ویدیو به تلگرام"
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "خطای ارتباط شبکه هنگام ارسال ویدیوی قرعه‌کشی به تلگرام"
    };
  }
}

