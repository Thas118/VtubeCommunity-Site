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
  assert(document.querySelectorAll('.nav-tab').length === 7, 'в навигации 7 вкладок');
  assert(document.querySelector('.brand__link').textContent === 'Vtube Community', 'название Vtube Community в шапке');
  assert(document.querySelector('.brand__link').getAttribute('href') === window.SITE_DATA.links.telegram,
    'название ссылается на Telegram-канал');
  assert(document.getElementById('tab-editing').classList.contains('is-active'),
    'первая вкладка активна при загрузке');
  assert(document.querySelectorAll('#panels .panel').length === 7, 'отрендерено 7 панелей');
  assert(document.getElementById('panel-editing').hidden === false, 'панель «Отдел монтажа» видима');
  assert(document.getElementById('panel-programming').hidden === true, 'панель программирования скрыта');
  assert(!!document.getElementById('tab-promo'), 'вкладка «Акции» присутствует');
  assert(!!document.getElementById('tab-howto'), 'вкладка «Как заказать» присутствует');
  assert(!!document.getElementById('service-modal'), 'модальное окно услуги есть в разметке');
  assert(window.SITE_DATA.departments.every((dept) => dept.services.length >= 1),
    'в каждом отделе есть шаблонные услуги');
  var totalCards = document.querySelectorAll('.service-btn').length;
  var expectedCards = window.SITE_DATA.departments.reduce(function (sum, dept) {
    return sum + dept.services.length;
  }, 0);
  assert(totalCards === expectedCards,
    'отделы отображают услуги интерактивными кнопками');

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

  console.log('2. Отдел монтажа: кнопки услуг и сортировка по цене');
  const serviceBtns = document.querySelectorAll('#panel-editing .service-btn');
  assert(serviceBtns.length === 3, '3 кнопки услуг (Shorts, Нарезка, Эдит)');
  // Сортировка по возрастанию цены. Тестовые цены: Нарезка 300, Shorts 500, Эдит 700.
  const btnPrices = Array.from(serviceBtns).map((b) => b.querySelector('.service-btn__price').textContent);
  assert(btnPrices[0].includes('300'), 'первая (дешёвая) услуга — Нарезка 300 ₽');
  assert(btnPrices[0].startsWith('от '), 'цена в формате «от N ₽» в отделе монтажа');
  assert(btnPrices[1].includes('500'), 'вторая услуга — Shorts 500 ₽');
  assert(btnPrices[2].includes('700'), 'третья (дорогая) услуга — Эдит 700 ₽');

  console.log('3. Открытие услуги в модальном окне и добавление в корзину');
  const shortsBtn = document.querySelector('#panel-editing [data-service-id="shorts"]');
  shortsBtn.click();
  const serviceModal = document.getElementById('service-modal');
  assert(serviceModal.hidden === false, 'модальное окно услуги открылось по клику на кнопку');
  const svcContent = document.getElementById('service-modal-content');
  assert(svcContent.textContent.includes('Shorts'), 'в окне название услуги');
  assert(svcContent.querySelector('.service-modal__price').textContent.includes('от 500 ₽'),
    'в окне цена в формате «от 500 ₽»');
  assert(svcContent.querySelector('.service-modal__price').textContent.includes('фиксированная цена'),
    'в окне пометка фиксированной цены');
  assert(svcContent.querySelector('.qty__value').textContent === '1', 'количество по умолчанию 1');

  svcContent.querySelector('[data-svc-act="inc"]').click();
  svcContent.querySelector('[data-svc-act="inc"]').click();
  assert(svcContent.querySelector('.qty__value').textContent === '3', 'два клика «+» -> количество 3 (старт с 1)');
  svcContent.querySelector('[data-svc-act="dec"]').click();
  assert(svcContent.querySelector('.qty__value').textContent === '2', 'клик «-» уменьшает количество до 2');
  svcContent.querySelector('[data-svc-act="inc"]').click();
  assert(svcContent.querySelector('.qty__value').textContent === '3', 'клик «+» увеличивает количество до 3');

  console.log('4. Добавление в общую корзину');
  svcContent.querySelector('[data-svc-act="add"]').click();
  const badge = document.getElementById('cart-badge');
  assert(badge.hidden === false && badge.textContent === '3', 'бейдж корзины показывает 3');
  assert(document.getElementById('cart-drawer').hidden === true, 'корзина ещё не открыта');
  // Живой расчёт отдела обновился.
  const summary = document.querySelector('#panel-editing .calc__summary');
  assert(summary.textContent.includes('Shorts × 3'), 'расчёт отдела показывает «Shorts × 3»');
  assert(summary.textContent.replace(/\s/g, ' ').includes('1 500'),
    'стоимость позиции 1 500 ₽ в расчёте');

  /* Добавляем услугу программирования через её же окно */
  document.getElementById('tab-programming').click();
  assert(document.getElementById('panel-programming').hidden === false, 'вкладка программирования открылась');
  assert(document.getElementById('panel-editing').hidden === true, 'панель монтажа скрылась');
  const progBtns = document.querySelectorAll('#panel-programming .service-btn');
  assert(progBtns.length === 4, '4 кнопки услуг программирования');
  const siteBtn = document.querySelector('#panel-programming [data-service-id="site"]');
  siteBtn.click();
  const svcContent2 = document.getElementById('service-modal-content');
  svcContent2.querySelector('[data-svc-act="add"]').click();
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
  assert(document.getElementById('panel-portfolio').textContent.includes('Наши клиенты. Нажмите на карточку'),
    'текст под портфолио обновлён');
  assert(!document.querySelector('.portfolio-total'), 'общая плашка количества работ в портфолио убрана');
  assert(document.querySelector('.client-card__meta').textContent.includes('11 работ'),
    'на карточке клиента снова отображается количество работ');
  const clientCard = document.querySelector('.client-card');
  assert(!!clientCard, 'карточка клиента отрендерена');
  const avatarImg = clientCard.querySelector('img');
  assert(avatarImg.alt.indexOf('HinaMouse') !== -1, 'alt аватара содержит имя клиента');
  assert(avatarImg.getAttribute('src') === 'assets/portfolio/hinamouse/hinamouse.png',
    'для аватара используется заменяемая PNG-заглушка');
  assert(avatarImg.getAttribute('loading') === 'lazy', 'аватар загружается лениво');

  clientCard.click();
  const modal = document.getElementById('client-modal');
  assert(modal.hidden === false, 'модальное окно клиента открылось');
  const content = document.getElementById('modal-content');
  assert(content.textContent.indexOf('HinaMouse') !== -1, 'имя клиента в окне');
  assert(content.querySelectorAll('.work-card').length === 3, 'три работы (2 плейлиста + бот)');
  // Количество работ клиента снова отображается (6 + 4 + 1 = 11).
  assert(content.textContent.indexOf('Общее количество работ: 11') !== -1,
    'количество работ клиента отображается снова');
  // Рядом с названием плейлиста показываем число роликов.
  const clipBadges = Array.from(content.querySelectorAll('.work-card__count')).map((el) => el.textContent);
  assert(clipBadges.length === 2, 'рядом с двумя плейлистами показано количество роликов');
  assert(clipBadges[0].includes('6 роликов'), 'у «Creepy Support» указано 6 роликов');
  assert(clipBadges[1].includes('4 ролика'), 'у «Photomaly» указано 4 ролика');
  // У бота (не видео) бейджа количества роликов нет.
  const workTitles = Array.from(content.querySelectorAll('.work-card__head'));
  const botHead = workTitles.find((h) => h.textContent.includes('ТГ-бот'));
  assert(botHead && !botHead.querySelector('.work-card__count'),
    'у работы-бота не отображается количество роликов');
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

  // Клиент с одиночным видео: бейдж «1 ролик» не показывается.
  document.querySelector('[data-client-id="aleriaVT"]').click();
  const content2 = document.getElementById('modal-content');
  assert(content2.querySelectorAll('.work-card').length === 1, 'у aleriaVT одна работа');
  assert(content2.querySelectorAll('.work-card__count').length === 0,
    'для одиночного видео бейдж количества роликов не отображается');
  document.getElementById('modal-close').click();

  console.log('8. Разделы «Подробнее», «Наши исполнители», «Акции», «Как заказать»');
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

  document.getElementById('tab-promo').click();
  assert(document.getElementById('panel-promo').textContent.indexOf('Акции') !== -1,
    'вкладка «Акции» отображается');

  document.getElementById('tab-howto').click();
  assert(document.getElementById('panel-howto').textContent.indexOf('самозанятый') !== -1,
    'вкладка «Как заказать» содержит текст про самозанятого');
  assert(document.getElementById('panel-howto').textContent.indexOf('Telegram-канале') !== -1,
    'вкладка «Как заказать» упоминает оформление через Telegram');

  console.log('9. Футер, документы, согласия и оформление заказа');
  assert(document.getElementById('footer-info').textContent.indexOf('Документы') !== -1,
    'в футере раздел «Документы»');
  assert(document.getElementById('footer-info').textContent.indexOf('ФИО исполнителя') !== -1,
    'в документах указано ФИО исполнителя');
  assert(document.getElementById('footer-info').textContent.indexOf('ИНН') !== -1,
    'в документах указан ИНН');
  assert(document.getElementById('footer-info').textContent.indexOf('с 08:00 до 22:00') !== -1,
    'указан режим ответа на обращения');
  const docLinks = document.querySelectorAll('#footer-info .footer-docs__links a');
  assert(docLinks.length === 2, 'две кнопки-ссылки на документы (оферта и политика)');
  assert(document.getElementById('footer-madeby').textContent === 'made by Thas118',
    'плашка made by Thas118 внизу сайта');
  assert(document.getElementById('footer-copy').textContent.indexOf('Vtube Community') !== -1, 'копирайт');

  // Согласия по умолчанию выключены.
  assert(document.getElementById('consent-pd').checked === false, 'согласие на обработку данных выключено по умолчанию');
  assert(document.getElementById('consent-offer').checked === false, 'согласие с офертой выключено по умолчанию');
  const consentLinks = document.querySelectorAll('#cart-footer .cart-consents a');
  assert(consentLinks.length === 2, 'каждое согласие содержит ссылку на документ');

  window.Cart.add('editing', 'narrezka', 2);
  const message = window.Cart.buildOrderMessage();
  assert(message.indexOf('Хочу оформить заказ в Vtube Community.') === 0,
    'новый шаблон сообщения без «Здравствуйте!»');
  assert(message.indexOf('• Нарезка — 2 × 300 ₽') !== -1, 'сообщение заказа формируется автоматически');
  assert(window.Cart.buildShareUrl(message).indexOf(window.SITE_DATA.links.telegramShare + '?') === 0,
    'ссылка Telegram Share построена из настроек');

  // Без обеих галочек отправка запрещена: оформление не должно открывать Telegram.
  const beforeHref = window.location.href;
  document.getElementById('checkout-button').click();
  assert(window.location.href === beforeHref, 'без согласий заказ не отправляется');
  assert(document.getElementById('toast').textContent.includes('согласия'),
    'показана подсказка отметить оба согласия');

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
