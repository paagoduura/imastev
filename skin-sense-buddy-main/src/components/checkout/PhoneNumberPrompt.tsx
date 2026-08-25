import { useState } from "react";
import { CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type PhoneNumberPromptProps = {
  isOpen: boolean;
  initialPhone?: string;
  onClose: () => void;
  onSaved: (phone: string) => void;
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return value.trim();
};

const isValidPhone = (value: string) => /^(?:\+234|0)\d{10}$/.test(value.replace(/[\s()-]/g, ""));

export function PhoneNumberPrompt({ isOpen, initialPhone = "", onClose, onSaved }: PhoneNumberPromptProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formattedPhone = normalizePhone(phone);
    if (!isValidPhone(formattedPhone)) {
      setError("Enter a valid Nigerian number, for example 0803 350 5038 or +234 803 350 5038.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");

      const { error: saveError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, phone: formattedPhone }, { onConflict: "user_id" });
      if (saveError) throw saveError;

      onSaved(formattedPhone);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save your phone number. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#24160d]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="phone-prompt-title">
      <Card className="w-full max-w-md overflow-hidden rounded-[28px] border-[#3b271b]/10 bg-[#fffdfb] shadow-[0_24px_80px_rgba(36,22,13,.24)]">
        <CardHeader className="border-b border-[#eadfd3] bg-[#f8f1e8] p-6 sm:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#3b271b] text-[#f8f2e8]"><Phone className="h-5 w-5" /></div>
          <CardTitle id="phone-prompt-title" className="font-display text-3xl text-[#3b271b]">One small detail before checkout.</CardTitle>
          <CardDescription className="mt-2 text-sm leading-6 text-[#806f61]">We use your phone number for Quickteller verification and important care or payment updates. Your scan is safe and waiting for you.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="payment-phone" className="text-sm font-semibold text-[#3b271b]">Mobile number</Label>
              <Input id="payment-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setError(null); }} placeholder="0803 350 5038" className="mt-2 h-12 rounded-xl border-[#ddcdbd] bg-white" autoFocus />
              <p className="mt-2 text-xs leading-5 text-[#907d6c]">Use a Nigerian mobile number in the 0XXXXXXXXXX or +234XXXXXXXXXX format.</p>
              {error && <p className="mt-2 text-xs font-medium text-red-700" role="alert">{error}</p>}
            </div>
            <div className="flex gap-2 rounded-xl bg-[#f7eee9] p-3 text-xs leading-5 text-[#806f61]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#a26b43]" /><span>Saved securely to your IMSTEV care profile. You will return to the payment step automatically.</span></div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-11 rounded-full border-[#ddcdbd]">Not now</Button>
              <Button type="submit" disabled={saving} className="h-11 rounded-full bg-[#3b271b] px-5 text-[#fff9f0] hover:bg-[#5a3928]">{saving ? "Saving…" : <><CheckCircle2 className="mr-2 h-4 w-4" />Continue to payment</>}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
