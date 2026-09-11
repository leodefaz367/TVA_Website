import { getSupabase } from "./supabase";
import { ValidationError } from "../utils/validation-error";
export interface BankTransfer {
  bank: string;
  account_type: string;
  account_number: string;
  identification: string;
  holder: string;
}
export const emptyBank: BankTransfer = {
  bank: "",
  account_type: "Ahorros",
  account_number: "",
  identification: "",
  holder: "",
};
export function validateBank(value: BankTransfer): BankTransfer {
  const bank = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item.trim()]),
  ) as unknown as BankTransfer;
  if (
    !bank.bank ||
    !bank.holder ||
    bank.bank.length > 120 ||
    bank.holder.length > 180
  )
    throw new ValidationError(
      "Completa el banco y el nombre completo del titular.",
    );
  if (
    !["Ahorros", "Corriente"].includes(bank.account_type) ||
    !/^\d{5,30}$/.test(bank.account_number) ||
    !/^\d{10}(?:\d{3})?$/.test(bank.identification)
  )
    throw new ValidationError(
      "Revisa el tipo de cuenta, el número de cuenta y la cédula de 10 dígitos o RUC de 13 dígitos.",
    );
  return bank;
}
export async function loadBankTransfer(): Promise<BankTransfer | null> {
  const { data, error } = await getSupabase()
    .from("site_settings")
    .select("value")
    .eq("key", "bank_transfer")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return validateBank(JSON.parse(data.value));
}
export async function saveBankTransfer(value: BankTransfer) {
  const { error } = await getSupabase()
    .from("site_settings")
    .upsert({
      key: "bank_transfer",
      value: JSON.stringify(validateBank(value)),
    });
  if (error) throw error;
}
