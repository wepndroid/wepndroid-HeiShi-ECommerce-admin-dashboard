import { useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { adminApi, setToken } from '@/api/client';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('0499999001');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const tokens = await adminApi.login(phone, password);
      setToken(tokens.accessToken);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-gradient-to-br from-background via-background to-accent/40 px-4 py-10">
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-info/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t('opsConsole')}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground">
            {t('loginHeroTitle')}
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            {t('loginHeroBody')}
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {[t('loginFeature1'), t('loginFeature2'), t('loginFeature3')].map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {line}
              </li>
            ))}
          </ul>
        </div>

        <Card className="border-border/70 bg-card/95 p-8 shadow-[var(--shadow-elevated)] backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-md">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('appTitle')}</p>
              <h2 className="text-lg font-semibold text-foreground">{t('loginSignIn')}</h2>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('language')}</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'zh')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('langEnglish')}</SelectItem>
                  <SelectItem value="zh">{t('langChinese')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('loading') : t('login')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
