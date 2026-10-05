/**
 * Сквозной UI-тест в jsdom: вкладки, калькулятор, корзина, портфолио.
 * Запуск: node tests/ui.test.js
 * Требуется jsdom во временной папке: npm install jsdom --prefix %TEMP%\vtc-jsdom
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM, VirtualConsole } = require(
  path.join(os.tmpdir(), 'vtc-jsdom', 'node_modules', 'jsdom')
);

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log('  ok - ' + message);
  } else {
    failed += 1;
    console.error('  FAIL - ' + message);
  }
}

function waitForLoad(window) {
  return new Promise((resolve) => {
    if (window.document.readyState === 'complete') {
      resolve();
      return;
    }
    window.addEventListener('load', () => resolve());
  });
}

async function main() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on('jsdomError', (err) => jsdomErrors.push(String(err.message || err)));

  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  const { document } = window;

  /* Подключаем скрипты сайта в порядке из index.html */
  ['js/utils.js', 'js/data.js', 'js/cart.js', 'js/calculator.js', 'js/app.js'].forEach((file) => {
    const script = document.createElement('script');
    script.textContent = fs.readFileSync(path.join(ROOT, file), 'utf8');
    document.body.appendChild(script);
  });
  await waitForLoad(window);

  console.log('1. Шапка и навигация');
  assert(document.querySelectorAll('.nav-tab').length === 5, 'в навигации 5 вкладок');
  assert(document.querySelector('.brand__link').textContent === 'Vtube Community', 'название Vtube Community в шапке');
  assert(document.querySelector('.brand__link').getAttribute('href') === window.SITE_DATA.links.telegram,
    'название ссылается на Telegram-канал');
  assert(document.getElementById('tab-editing').classList.contains('is-active'),
    'первая вкладка активна при загрузке');
  assert(document.querySelectorAll('#panels .panel').length === 5, 'отрендерено 5 панелей');
  assert(document.getElementById('panel-editing').hidden === false, 'панель «Отдел монтажа» видима');
  assert(document.getElementById('panel-programming').hidden === true, 'панель программирования скрыта');
  assert(window.SITE_DATA.departments.every((dept) => dept.services.length >= 1),
    'в каждом отделе есть шаблонные услуги');
  var totalCards = document.querySelectorAll('.service-card').length;
  var expectedCards = window.SITE_DATA.departments.reduce(function (sum, dept) {
    return sum + dept.services.length;
  }, 0);
  assert(totalCards === expectedCards,
    'отделы отображают услуги вместо заглушек');

  /* Добавляем тестовые услуги, чтобы проверить калькулятор и корзину. */
  window.SITE_DATA.departments.find((dept) => dept.id === 'editing').services = [
    { id: 'shorts', name: 'Shorts', description: 'Короткий ролик', price: 500, priceFixed: true },
    { id: 'narrezka', name: 'Нарезка', description: 'Нарезка видео', price: 300 },
    { id: 'edit', name: 'Эдит', description: 'Монтаж', price: 700 }
  ];
  window.SITE_DATA.departments.find((dept) => dept.id === 'programming').services = [
    { id: 'site', name: 'Разработка сайта', description: 'Сайт', price: 5000 },
    { id: 'feature', name: 'Доработка сайта', description: 'Доработка', price: 1500 },
    { id: 'fix', name: 'Исправление ошибок', description: 'Исправление', price: 1000 },
    { id: 'automation', name: 'Скрипт / автоматизация', description: 'Скрипт', price: 2000 }
  ];
  window.buildPanels();
  window.activateSection('editing', false);

  console.log('2. Отдел монтажа: карточки услуг');
  const serviceCards = document.querySelectorAll('#panel-editing .service-card');
  assert(serviceCards.length === 3, '3 карточки услуг (Shorts, Нарезка, Эдит)');
  const shortsCard = document.querySelector('#panel-editing [data-service-id="shorts"]');
  assert(shortsCard.querySelector('.service-card__price').textContent === '500 ₽',
    'у Shorts фиксированная цена 500 ₽');
  assert(shortsCard.querySelector('.service-card__unit').textContent === 'фиксированная цена',
    'подпись «фиксированная цена» у Shorts');
  assert(shortsCard.querySelector('[data-act="add"]').disabled === true, 'кнопка «В корзину» неактивна при количестве 0');
  assert(shortsCard.querySelector('.qty__value').tagName === 'SPAN',
    'количество отображается текстом (только +/-)');

  console.log('3. Калькулятор: количество и подсветка');
  const incShorts = shortsCard.querySelector('[data-act="inc"]');
  incShorts.click();
  incShorts.click();
  incShorts.click();
  assert(shortsCard.querySelector('.qty__value').textContent === '3', 'три клика «+» -> количество 3');
  assert(shortsCard.classList.contains('is-selected'), 'карточка выделена (is-selected)');
  assert(shortsCard.querySelector('[data-act="add"]').disabled === false, 'кнопка «В корзину» активна');

  const summary = document.querySelector('#panel-editing .calc__summary');
  assert(summary.textContent.includes('Shorts × 3'), 'расчёт показывает «Shorts × 3»');
  assert(summary.textContent.includes('1 500'.replace(/ /g, '\u00A0')) ||
    summary.textContent.includes('1 500'), 'стоимость позиции 1 500 ₽ в расчёте');

shortsCard.querySelector('[data-act="dec"]').click();
  assert(shortsCard.querySelector('.qty__value').textContent === '2', 'клик «-» уменьшает количество до 2');
  shortsCard.querySelector('[data-act="inc"]').click();
  assert(shortsCard.querySelector('.qty__value').textContent === '3', 'клик «+» увеличивает количество до 3');

  console.log('4. Добавление в общую корзину');
  shortsCard.querySelector('[data-act="add"]').click();
  const badge = document.getElementById('cart-badge');
  assert(badge.hidden === false && badge.textContent === '3', 'бейдж корзины показывает 3');
  assert(shortsCard.querySelector('.qty__value').textContent === '0', 'калькулятор сброшен после добавления');
  assert(document.getElementById('cart-drawer').hidden === true, 'корзина ещё не открыта');

  /* Добавляем услугу программирования */
  document.getElementById('tab-programming').click();
  assert(document.getElementById('panel-programming').hidden === false, 'вкладка программирования открылась');
  assert(document.getElementById('panel-editing').hidden === true, 'панель монтажа скрылась');
  const progCards = document.querySelectorAll('#panel-programming .service-card');
  assert(progCards.length === 4, '4 карточки услуг программирования');
  const siteCard = document.querySelector('#panel-programming [data-service-id="site"]');
  siteCard.querySelector('[data-act="inc"]').click();
  siteCard.querySelector('[data-act="add"]').click();
  assert(badge.textContent === '4', 'бейдж обновился до 4 (позиции из разных отделов)');
  assert(window.localStorage.getItem('vtc_cart_v1').includes('"serviceId":"site"'),
    'корзина сохранена в localStorage');

  /* ----- Корзина ----- */
  console.log('5. Корзина');
  document.getElementById('cart-button').click();
  const drawer = document.getElementById('cart-drawer');
  assert(drawer.hidden === false, 'шторка корзины открылась');
  assert(document.querySelectorAll('#cart-body .cart-item').length === 2,
    'две позиции из разных отделов в одной корзине');

  const totalEl = document.getElementById('cart-total-value');
  assert(totalEl.textContent.replace(/\s/g, ' ') === '6 500 ₽', 'итог 6 500 ₽ (3×500 + 5000)');
  assert(document.getElementById('order-message-preview').textContent.includes('• Shorts — 3 × 500 ₽'),
    'предпросмотр сообщения показывает выбранные услуги');
  assert(document.querySelector('.cart-note').textContent.includes('отправьте его'),
    'инструкция объясняет, что сообщение нужно отправить в Telegram вручную');

  const deptLabels = Array.from(document.querySelectorAll('#cart-body .cart-item__dept'))
    .map((el) => el.textContent);
  assert(deptLabels.includes('Отдел монтажа') && deptLabels.includes('Отдел программирования'),
    'у каждой позиции указан отдел');

  document.querySelector('#cart-body [data-act="inc"]').click();
  assert(badge.textContent === '5', '«+» в корзине обновляет бейдж до 5');
  assert(totalEl.textContent.replace(/\s/g, ' ') === '7 000 ₽', 'итог пересчитан: 7 000 ₽');

  document.querySelector('#cart-body [data-act="remove"]').click();
  assert(document.querySelectorAll('#cart-body .cart-item').length === 1, 'удаление позиции работает');

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(!drawer.classList.contains('is-open'), 'корзина закрывается по Escape');

  console.log('6. Пустая корзина');
  document.querySelector('#cart-body [data-act="remove"]').click();
  assert(!!document.querySelector('#cart-body .cart-empty'), 'показано состояние «Корзина пуста»');
  assert(document.querySelector('#cart-body .cart-empty').textContent.includes('Корзина пуста'),
    'текст «Корзина пуста» отображается');
  assert(document.getElementById('cart-footer').hidden === true, 'блок итога скрыт при пустой корзине');
  assert(badge.hidden === true, 'бейдж скрыт при пустой корзине');
  window.Cart.add('editing', 'shorts', 2);
  window.Cart.add('programming', 'site', 1);
  assert(document.querySelectorAll('#cart-body .cart-item').length === 2, 'перед очисткой в корзине две позиции');
  document.getElementById('cart-clear').click();
  assert(window.Cart.isEmpty() && document.querySelector('#cart-body .cart-empty'),
    'кнопка очищает все позиции корзины сразу');
  document.getElementById('cart-close').click();

  console.log('7. Портфолио и карточка клиента');
  document.getElementById('tab-portfolio').click();
  const clientCard = document.querySelector('.client-card');
  assert(!!clientCard, 'карточка клиента отрендерена');
  const avatarImg = clientCard.querySelector('img');
  assert(avatarImg.alt.indexOf('HinaMouse') !== -1, 'alt аватара содержит имя клиента');
  assert(avatarImg.getAttribute('src') === 'assets/portfolio/hinamouse/hinamouse.png',
    'для аватара используется заменяемая PNG-заглушка');
  assert(avatarImg.getAttribute('loading') === 'lazy', 'аватар загружается лениво');

  window.SITE_DATA.portfolio[0].orders = 99;
  clientCard.click();
clientCard.click();
  const modal = document.getElementById('client-modal');
  assert(modal.hidden === false, 'модальное окно клиента открылось');
  const content = document.getElementById('modal-content');
  assert(content.textContent.indexOf('HinaMouse') !== -1, 'имя клиента в окне');
  assert(content.querySelectorAll('.work-card').length === 3, 'три выполненные работы (одна без предпросмотра)');
  assert(content.textContent.indexOf('Общее количество работ: 3') !== -1,
    'число заказов автоматически совпадает с числом выполненных работ');
  const workLink = content.querySelector('.work-card__title');
  assert(workLink.getAttribute('target') === '_blank' &&
    workLink.getAttribute('rel') === 'noopener noreferrer', 'внешние ссылки безопасны (rel=noopener)');
  const workPreviews = content.querySelectorAll('.work-card__thumb');
  assert(workPreviews.length === 2 &&
    workPreviews[0].src.indexOf('img.youtube.com/vi/') !== -1,
  'предпросмотры используют миниатюры YouTube');
  assert(content.querySelectorAll('.work-card__play').length === 2,
    'у каждой миниатюры есть кнопка Play');
  assert(content.querySelectorAll('.work-card__cover').length === 0,
    'для выполненных работ не создаются отдельные обложки');
  assert(content.querySelectorAll('.social-link').length === 3 &&
    content.querySelectorAll('.social-link svg').length === 3, 'все соцсети с иконками в стиле сайта');
  assert(content.querySelectorAll('.client__avatar[alt]').length === 1, 'у аватара в карточке клиента есть alt');

  document.getElementById('modal-close').click();
  assert(!modal.classList.contains('is-open'), 'модальное окно закрылось');

  console.log('8. Разделы «Подробнее» и «Наши исполнители»');
  document.getElementById('tab-about').click();
  assert(document.getElementById('panel-about').textContent.indexOf(window.SITE_DATA.about.paragraphs[0]) !== -1,
    'описание сообщества отображается');
  assert(document.querySelectorAll('#panel-about ul, #panel-about ol').length === 0,
    'в разделе «Подробнее» нет списка с буллетами');
  const cta = document.querySelector('#panel-about a.btn--primary');
  assert(cta.getAttribute('href') === window.SITE_DATA.links.telegram &&
    cta.getAttribute('rel') === 'noopener noreferrer', 'CTA «Перейти в Telegram» ведёт в канал безопасно');

  document.getElementById('tab-team').click();
  assert(document.getElementById('panel-team').textContent.indexOf('В разработке') !== -1,
    'плашка «В разработке» в разделе исполнителей');

  console.log('9. Футер и оформление заказа');
  assert(document.getElementById('footer-info').textContent.indexOf('Документы') !== -1,
    'в футере подготовлено место под документы');
  assert(document.getElementById('footer-copy').textContent.indexOf('Vtube Community') !== -1, 'копирайт');

  window.Cart.add('editing', 'narrezka', 2);
  const message = window.Cart.buildOrderMessage();
  assert(message.indexOf('• Нарезка — 2 × 300 ₽') !== -1, 'сообщение заказа формируется автоматически');
  assert(window.Cart.buildShareUrl(message).indexOf(window.SITE_DATA.links.telegramShare + '?') === 0,
    'ссылка Telegram Share построена из настроек');

  const unexpected = jsdomErrors.filter((e) => !/Not implemented/.test(e));
  assert(unexpected.length === 0, 'нет неожиданных ошибок jsdom: ' + unexpected.join('; '));

  console.log('');
  console.log('Итого: ' + passed + ' пройдено, ' + failed + ' упало');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  failed += 1;
  console.error('FAIL - исключение в тесте:', error);
  process.exit(1);
});
