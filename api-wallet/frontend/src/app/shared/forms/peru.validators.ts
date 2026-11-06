import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ADULT_AGE = 18;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const textOf = (control: AbstractControl): string => String(control.value ?? '').trim();

export const requiredText =
  (errorKey: string): ValidatorFn =>
  (control) =>
    textOf(control) ? null : { [errorKey]: true };

export const mustBeTrue =
  (errorKey: string): ValidatorFn =>
  (control) =>
    control.value === true ? null : { [errorKey]: true };

export const phoneValidator: ValidatorFn = (control) => {
  const phone = textOf(control);
  if (!phone) {
    return { phoneRequired: true };
  }
  if (!/^\d{9}$/.test(phone)) {
    return { phoneLength: true };
  }
  return phone.startsWith('9') ? null : { phonePrefix: true };
};

export const documentNumberValidator: ValidatorFn = (control) => {
  const number = textOf(control);
  if (!number) {
    return { documentNumberRequired: true };
  }
  const documentType = control.parent?.get('documentType')?.value;
  if (documentType === 'DNI') {
    return /^\d{8}$/.test(number) ? null : { dniLength: true };
  }
  if (documentType === 'CE') {
    return /^\d{9}$/.test(number) ? null : { ceLength: true };
  }
  return null;
};

export const adultValidator =
  (today: () => Date): ValidatorFn =>
  (control): ValidationErrors | null => {
    const value = textOf(control);
    if (!value) {
      return { birthDateRequired: true };
    }
    const match = ISO_DATE.exec(value);
    if (!match) {
      return { birthDateFormat: true };
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const birthDate = new Date(year, month - 1, day);
    const isRealDate =
      birthDate.getFullYear() === year && birthDate.getMonth() === month - 1 && birthDate.getDate() === day;
    if (!isRealDate || birthDate > today()) {
      return { birthDateFormat: true };
    }
    return ageOn(birthDate, today()) >= ADULT_AGE ? null : { underage: true };
  };

function ageOn(birthDate: Date, today: Date): number {
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  return today.getFullYear() - birthDate.getFullYear() - (hadBirthday ? 0 : 1);
}
