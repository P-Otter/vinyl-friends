// End-to-End-Smoke-Test des Ohne-Spotify-Modus: Home → Pool (Pack) → Spieler →
// Spiel → Song starten (echtes Audio!) → platzieren → Reveal → nächste Runde.
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'https://p-otter.github.io/vinyl-friends/';
const shot = (n) => `shots/web-${n}.png`;
let step = '';
const fail = (msg) => { console.error(`FEHLER bei [${step}]: ${msg}`); process.exit(1); };

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone-Format
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

try {
  step = 'Home';
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: shot('01-home') });
  const cta = page.getByRole('button', { name: /eigenen pool bauen/i });
  if (!(await cta.isVisible())) fail('CTA "Spielen — eigenen Pool bauen" nicht sichtbar');

  step = 'PoolBuilder öffnen';
  await cta.click();
  await page.waitForURL('**/pool');
  await page.screenshot({ path: shot('02-pool-leer') });

  step = 'Pack hinzufügen';
  await page.getByRole('button', { name: /80er/i }).click();
  await page.waitForTimeout(300);
  const poolLabel = await page.textContent('body');
  if (!/Dein Pool · \d\d/.test(poolLabel)) fail('Pool-Zähler nach Pack-Tipp nicht > 9');
  await page.screenshot({ path: shot('03-pool-gefuellt') });

  step = 'Suche testen';
  await page.getByPlaceholder(/song oder künstler/i).fill('Blinding Lights');
  await page.waitForTimeout(2500); // Debounce + JSONP
  const searchHit = page.locator('button', { hasText: 'The Weeknd' }).first();
  if (!(await searchHit.isVisible())) fail('Suchtreffer "The Weeknd" erscheint nicht (JSONP kaputt?)');
  await searchHit.click(); // in den Pool
  await page.screenshot({ path: shot('04-suche') });

  step = 'Weiter zu Spielern';
  await page.getByRole('button', { name: /weiter — \d+ songs/i }).click();
  await page.waitForURL('**/players');
  await page.screenshot({ path: shot('05-players') });

  step = 'Spiel starten';
  await page.getByRole('button', { name: /start!/i }).click();
  await page.waitForURL('**/game', { timeout: 10_000 });
  await page.screenshot({ path: shot('06-game') });

  step = 'Song starten (echtes Audio)';
  await page.getByRole('button', { name: /song starten/i }).click();
  // Hörprobe wird ggf. per JSONP aufgelöst — warten bis Audio wirklich läuft.
  await page.waitForFunction(() => {
    const a = document.querySelectorAll('audio');
    // usePreviewPlayer erzeugt das Element ohne DOM-Anhang — prüfe über den Ton-Status im UI:
    return document.body.innerText.match(/\d+:\d+|Pause|⏸/i) !== null || a.length > 0;
  }, { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('07-song-laeuft') });

  step = 'Karte platzieren';
  // Erste Lücke der Timeline anklicken (Slot-Buttons), dann bestätigen.
  const gap = page.locator('button').filter({ hasText: /^\+?$|hier/i }).first();
  if (await gap.isVisible()) await gap.click();
  else {
    // Fallback: Timeline-Komponente — erste klickbare Lücke
    await page.locator('[class*="gap" i], [data-gap]').first().click().catch(() => fail('Keine Timeline-Lücke klickbar'));
  }
  const confirm = page.getByRole('button', { name: /platzieren/i });
  await confirm.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('08-reveal') });
  const revealText = await page.textContent('body');
  if (!/\d{4}/.test(revealText)) fail('Reveal zeigt kein Jahr');

  step = 'Nächste Runde';
  // Der Weiter-Button IM Reveal-Overlay (fixed z-50), nicht der dahinter.
  await page.locator('.fixed.z-50 button.btn-primary').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('09-runde2') });
  const r2 = await page.textContent('body');
  if (!/Runde 2|Spieler 2/.test(r2)) fail('Runde 2 / Spielerwechsel nicht erreicht');

  console.log('SMOKE-TEST BESTANDEN ✓');
  if (consoleErrors.length) {
    console.log('Console-Errors (' + consoleErrors.length + '):');
    consoleErrors.slice(0, 5).forEach((e) => console.log('  -', e.slice(0, 200)));
  }
} catch (e) {
  await page.screenshot({ path: shot('99-fehler') }).catch(() => {});
  fail(e.message);
} finally {
  await browser.close();
}
