// Форма «Предложить идею» на вкладке «О сайте»: письмо автору через Web3Forms (адрес почты не хранится на сайте).
import { t } from './i18n.ts';

/** Ключ Web3Forms: не секретный, лишь говорит сервису, на какую почту пересылать. Задаётся при сборке. */
const KEY: string = String(import.meta.env.VITE_W3F_KEY || 'ab9c34ee-6e80-4621-a566-2653844c89a8').trim();

export function bindFeedback() {
  const form = document.getElementById('fb-form') as HTMLFormElement | null; if (!form) return;
  const status = document.getElementById('fb-status')!, btn = document.getElementById('fb-send') as HTMLButtonElement;
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const S = t().st, subject = val('fb-subject'), message = val('fb-message'), contact = val('fb-contact');
    status.classList.remove('ok', 'err');
    if (!subject || !message) { status.textContent = S.fbEmpty; status.classList.add('err'); return; }
    if ((form.elements.namedItem('botcheck') as HTMLInputElement).checked) return;   // ловушка для ботов
    if (!navigator.onLine) { status.textContent = t().fbOffline; status.classList.add('err'); return; }
    btn.disabled = true; status.textContent = S.fbSending;
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: KEY, subject: `DotaPick: ${subject}`, from_name: 'DotaPick', message, contact: contact || '—', page: location.href }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !(j as { success?: boolean }).success) throw new Error('send');
      form.reset(); status.textContent = S.fbOk; status.classList.add('ok');
    } catch { status.textContent = S.fbErr; status.classList.add('err'); }
    finally { btn.disabled = false; }
  });
}
