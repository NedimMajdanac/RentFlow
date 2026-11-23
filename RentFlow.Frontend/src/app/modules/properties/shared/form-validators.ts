import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseDecimal } from '../wizard/shared/parse-number';

export const MAX_AMOUNT = 100_000_000; // same limit as the backend validators

/** required that also rejects whitespace-only input */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

/** Positive number up to a maximum; comma or dot is accepted as the decimal separator. */
export function decimalValidator(required: boolean, max: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const n = parseDecimal(c.value);
    if (n === null) return required ? { required: true } : null;
    if (Number.isNaN(n)) return { number: true };
    if (n <= 0) return { positive: true };
    if (n > max) return { max: true };
    return null;
  };
}

/** Money input: at most two decimals and within the allowed range. */
export function moneyValidator(opts: { required: boolean; allowZero: boolean }): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const text = String(c.value ?? '').trim().replace(',', '.');
    if (!text) return opts.required ? { required: true } : null;
    if (!/^\d+(\.\d+)?$/.test(text)) return { number: true };
    if ((text.split('.')[1]?.length ?? 0) > 2) return { decimals: true };

    const n = parseDecimal(text);
    if (n === null || Number.isNaN(n)) return { number: true };
    if (n > MAX_AMOUNT) return { max: true };
    if (!opts.allowZero && n <= 0) return { positive: true };
    return null;
  };
}

/** Group validator: the floor must not be higher than the total number of floors. */
export const floorVsTotal: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const floor = group.get('floor')?.value as number | null;
  const total = group.get('totalFloors')?.value as number | null;
  return floor !== null && total !== null && floor > total ? { floorAboveTotal: true } : null;
};