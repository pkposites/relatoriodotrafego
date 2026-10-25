import { Check } from 'lucide-react';
import { fieldOptions, resolve } from '../domain/questionnaire';
import type { Answers, Field, RawValue } from '../domain/types';
import { parseNumberInput } from '../domain/calculations';

/**
 * Campo do questionário. Escolha única → radiogroup com input radio nativo;
 * múltipla → checkboxes nativos. Teclado e leitores de tela funcionam sem JS extra.
 */
export function FieldInput({
  field,
  answers,
  onChange,
  compact,
}: {
  field: Field;
  answers: Answers;
  onChange: (id: string, value: RawValue | undefined) => void;
  compact?: boolean;
}) {
  const label = resolve(field.label, answers);
  const id = `f-${field.id}`;
  const value = answers[field.id];

  if (field.kind === 'text' || field.kind === 'url') {
    return (
      <div>
        <label htmlFor={id} className="label">
          {label} {field.optional && <span className="font-normal text-ink-mute">(opcional)</span>}
        </label>
        <input
          id={id}
          type={field.kind === 'url' ? 'url' : 'text'}
          inputMode={field.kind === 'url' ? 'url' : undefined}
          className="input"
          maxLength={field.maxLength ?? (field.kind === 'url' ? 300 : 200)}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(field.id, e.target.value || undefined)}
          aria-describedby={field.help ? `${id}-help` : undefined}
        />
        {field.help && <p id={`${id}-help`} className="mt-1.5 text-xs text-ink-mute">{field.help}</p>}
      </div>
    );
  }

  if (field.kind === 'number') {
    return (
      <div>
        <label htmlFor={id} className="label">
          {label} {field.optional && <span className="font-normal text-ink-mute">(opcional)</span>}
        </label>
        <input
          id={id}
          inputMode="decimal"
          className="input tabular sm:max-w-[220px]"
          placeholder={field.placeholder}
          defaultValue={typeof value === 'number' ? String(value) : ''}
          onChange={(e) => {
            const n = parseNumberInput(e.target.value);
            onChange(field.id, typeof n === 'number' && n >= 0 ? n : undefined);
          }}
        />
      </div>
    );
  }

  const options = fieldOptions(field, answers);
  const multi = field.kind === 'multi';
  const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const toggle = (optId: string) => {
    if (!multi) return onChange(field.id, optId);
    const opt = options.find((o) => o.id === optId)!;
    let next: string[];
    if (selected.includes(optId)) next = selected.filter((x) => x !== optId);
    else if (opt.exclusive) next = [optId];
    else next = [...selected.filter((x) => !options.find((o) => o.id === x)?.exclusive), optId];
    onChange(field.id, next.length ? next : undefined);
  };

  return (
    <fieldset>
      <legend className={compact ? 'label' : 'label text-[15px]'}>
        {label} {field.optional && <span className="font-normal text-ink-mute">(opcional)</span>}
        {multi && <span className="ml-1 font-normal text-brand">— pode marcar mais de uma</span>}
      </legend>
      {field.help && <p className="-mt-1 mb-2 text-xs text-ink-mute">{field.help}</p>}
      <div role={multi ? 'group' : 'radiogroup'} className={`grid gap-2 ${options.length > 4 && compact ? 'sm:grid-cols-2' : ''}`}>
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <label
              key={o.id}
              className={`group flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-[15px] transition-all duration-150 focus-within:ring-2 focus-within:ring-brand ${
                active ? 'border-brand bg-brand-50/60 shadow-[0_0_0_3px_rgba(8,102,255,0.10)]' : 'border-line hover:border-[#B2CCFF] hover:bg-[#F8FAFF]'
              }`}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={field.id}
                value={o.id}
                checked={active}
                onChange={() => toggle(o.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`grid h-5 w-5 shrink-0 place-items-center border-2 transition-colors ${multi ? 'rounded-md' : 'rounded-full'} ${
                  active ? 'border-brand bg-brand text-white' : 'border-[#D0D5DD] group-hover:border-brand/50'
                }`}
              >
                {active && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span>
                {o.label}
                {o.hint && <span className="ml-1 text-xs text-ink-mute">({o.hint})</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
