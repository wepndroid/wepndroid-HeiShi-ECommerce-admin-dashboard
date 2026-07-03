import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export type ModalField = {
  name: string;
  label: string;
  kind?: 'text' | 'textarea' | 'select' | 'file';
  options?: { value: string; label: string }[];
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
};

export type ModalConfig = {
  title: string;
  description?: string;
  fields: ModalField[];
  submitLabel?: string;
  destructive?: boolean;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
};

/**
 * Controlled in-app modal used across the admin pages in place of window.prompt().
 * Renders a focus-friendly overlay with typed fields and Cancel / Confirm actions.
 */
export function FormModal({ config, onClose }: { config: ModalConfig | null; onClose: () => void }) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = config !== null;

  useEffect(() => {
    if (!config) return;
    const init: Record<string, string> = {};
    for (const f of config.fields) {
      init[f.name] = f.initialValue ?? (f.kind === 'select' ? f.options?.[0]?.value ?? '' : '');
    }
    setValues(init);
    setTouched(false);
    setBusy(false);
  }, [config]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!config) return null;

  const missingRequired = config.fields.some((f) => f.required && !values[f.name]?.trim());

  async function submit() {
    if (!config) return;
    setTouched(true);
    if (missingRequired) return;
    setBusy(true);
    try {
      await config.onSubmit(values);
      onClose();
    } catch {
      // Caller surfaces its own error; keep the modal open so input isn't lost.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
            {config.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            aria-label={t('cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          {config.fields.map((f) => {
            const invalid = touched && f.required && !values[f.name]?.trim();
            const id = `fm-${f.name}`;
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={id}>{f.label}</Label>
                {f.kind === 'textarea' ? (
                  <Textarea
                    id={id}
                    value={values[f.name] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    rows={3}
                    className={cn(invalid && 'border-destructive')}
                  />
                ) : f.kind === 'file' ? (
                  <div className="space-y-2">
                    {values[f.name] ? (
                      <img
                        src={values[f.name]}
                        alt=""
                        className="h-24 w-full rounded-md border border-border object-cover"
                      />
                    ) : null}
                    <input
                      id={id}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          setValues((v) => ({ ...v, [f.name]: String(reader.result) }));
                        reader.readAsDataURL(file);
                      }}
                      className={cn(
                        'block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80',
                        invalid && 'rounded-md ring-1 ring-destructive',
                      )}
                    />
                  </div>
                ) : f.kind === 'select' ? (
                  <select
                    id={id}
                    value={values[f.name] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    className={cn(
                      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      invalid && 'border-destructive',
                    )}
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={id}
                    value={values[f.name] ?? ''}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    className={cn(invalid && 'border-destructive')}
                  />
                )}
              </div>
            );
          })}

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant={config.destructive ? 'destructive' : 'default'} disabled={busy || missingRequired}>
              {config.submitLabel ?? t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
