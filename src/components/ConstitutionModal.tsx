import React from "react";
import { X, BookOpen, Users, HelpCircle, Landmark, CheckCircle } from "lucide-react";
import { toPersianDigits } from "../utils/jalali";

interface ConstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundName?: string;
}

export default function ConstitutionModal({ isOpen, onClose, fundName }: ConstitutionModalProps) {
  if (!isOpen) return null;

  const rules = [
    "داشتن مجوز و فعالیت به عنوان خانه بوم‌گردی",
    "پذیرفتن مرام نانوشته‌ای در راستای همیاری، همراهی و دست‌گیری یکدیگر به خصوص در مواقع ناچاری",
    "پرداخت حق عضویت تعیین شده در موعد مقرر",
    "تعهد به پرداخت اقساط به حرمت نان و نمک و پذیرفتن نتایج قرعه‌کشی، که هرماه به گونه‌ای شفاف برگزار می‌شود.",
    "در صورتی که شخصی بنا بر ضرورت تقاضای دریافت وام خارج از نوبت قرعه‌کشی را دارد، درخواست را تا ۲۰ام هر ماه به یکی از اعضای هیات امنا ارسال و در صورت تایید اعضای هیات امنا، پرداخت خارج از قرعه‌کشی انجام می‌شود و تمامی اعضا ملزم به پذیرش هستند. در صورتی که تعداد متقاضیان از دو نفر بیشتر باشد، هیات امنا نسبت به دو نفر تصمیم‌گیری می‌کند.",
    "درخواست ورود یا خروج یا تغییر سهام صندوق تنها تا دو ماه پس از شروع به کار صندوق قابل قبول است و پس از آن افراد ملزم به حضور تا پایان دوره هستند.",
    "اضافه شدن به صندوق با تایید حداقل یکی از اعضای صندوق و تایید هیات امنا قابل انجام است.",
    "اگر فردی در پرداخت بیش از دو قسط، بیش از دو روز پس از انجام قرعه‌کشی، تاخیر داشته باشد، در دو قرعه‌کشی پس از دومین تاخیر شرکت داده نخواهد شد.",
    "همه اعضای صندوق مبلغ ماهیانه را به حساب افرادی که در قرعه‌کشی یا از سوی هیات امنا انتخاب شده‌اند، بر اساس شماره حساب‌های اعلامی توسط هیات امنا واریز می‌کنند.",
    "در هر ماه قرعه‌کشی به صورت شفاف بین افراد برگزار شده و نفر(ات) واجد دریافت مبلغ ماهیانه صندوق به صورت مساوی هستند.",
    "حق عضویت ماهانه با تصویب اعضا، تعیین می‌شود که هرماه حداکثر دو روز پس از اعلام نتایج قرعه‌کشی به حساب‌های اعلامی واریز خواهد گردید. اعضا فیش واریزی را با نام اقامتگاه در گروه ارسال نمایند."
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="constitution-modal">
      <div 
        className="relative bg-[#faf7f0] border-2 border-teal-200 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right font-sans"
        dir="rtl"
      >
        {/* Header styling matching mud-straw/cozy warmth */}
        <div className="bg-teal-800 text-white px-6 py-5 flex items-center justify-between border-b border-teal-900 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-teal-200" />
            <h3 className="text-base font-black tracking-tight text-white">اساسنامه و منشور همدلی {fundName || "صندوق قرض‌الحسنه و پس‌انداز حامی بومگردی"}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 rounded-lg bg-teal-900/40 hover:bg-teal-950/60 text-teal-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable constitution content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-slate-800 leading-relaxed text-xs md:text-sm">
          {/* Historical intro context with nice earthy background */}
          <div className="p-5 bg-teal-100/50 rounded-xl border border-teal-200 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 text-teal-900">
              <Landmark className="w-4.5 h-4.5" />
              <span className="font-bold">پیشینه و اصالت صندوق:</span>
            </div>
            <p className="leading-relaxed">
              پیشنهاد تاسیس این صندوق در تاریخ <span className="font-bold underline text-teal-900">{toPersianDigits("1403/05/18")}</span> در دومین نشست انتقال تجربه‌های اقامتگاه‌های بومگردی و با هدف حضور فعالانه در چارچوب افزایش مشارکت، همراهی و همگرایی بیشتر بین اقامتگاه‌های بومگردی مطرح شد.
            </p>
            <p className="leading-relaxed">
              پس از آن با همکاری و پیگیری تعدادی از اقامتگاه‌ها در تاریخ <span className="font-bold underline text-teal-900">{toPersianDigits("1405/03/01")}</span> به صورت رسمی فعالیتش را آغاز کرد.
            </p>
            <p className="leading-relaxed text-slate-600 italic">
              قوانین برای یک دوره فعالیت صندوق تصویب شده و با شروع دوره کاری بعد با توجه به شرایط دوره اول، ممکن است تغییر کند و این تغییرات به آگاهی تمامی اعضای قدیم و جدید خواهد رسید.
            </p>
          </div>

          {/* Board of Trustees info */}
          <div className="flex items-start gap-4 p-4 bg-teal-50 rounded-xl border border-teal-150 shadow-sm">
            <div className="w-9 h-9 bg-teal-700 text-white rounded-full flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-black text-teal-900 mb-1">هیات امنای سه نفره صندوق:</h4>
              <p className="text-slate-700">
                بر اساس توافق همه‌جانبه اعضای صندوق، افراد مسئول زیر به عنوان هیات امنا ناظر بر فرآیندهای مالی صندوق انتخاب شده‌اند:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["اکبر رضوانیان", "صادق کاظمیان", "ترگل انوری نژاد"].map((trustee) => (
                  <span key={trustee} className="bg-teal-200/50 text-teal-950 font-bold px-3 py-1 rounded text-xs border border-teal-200">
                    {trustee}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Rules and guidelines core header */}
          <div>
            <h4 className="font-black text-slate-800 mb-3 text-sm flex items-center gap-2 border-b pb-2 border-slate-200">
              <CheckCircle className="w-4 h-4 text-teal-700" />
              <span>قوانین عضویت و تعهدات اقامتگاه‌های بومگردی:</span>
            </h4>
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex gap-3.5 p-3 rounded-lg hover:bg-teal-100/20 transition-all border border-transparent hover:border-teal-100">
                  <div className="w-6 h-6 rounded bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-sm">
                    {toPersianDigits(idx + 1)}
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">{toPersianDigits(rule)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/60 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="py-2 px-6 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            متوجه شدم و می‌پذیرم
          </button>
        </div>
      </div>
    </div>
  );
}
