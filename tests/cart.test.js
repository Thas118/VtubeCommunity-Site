/**
 * Автотесты логики Vtube Community (без браузера).
 * Запуск: node tests/cart.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const STORAGE_KEY = 'vtc_cart_v1';

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

/** Создаёт изолированное окружение (как «вкладку браузера») с общим localStorage. */
function createSession(sharedStorage) {
  const storage = sharedStorage || { data: {} };
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(storage.data, k) ? storage.data[k] : null),
      setItem: (k, v) => { storage.data[k] = String(v); },
      removeItem: (k) => { delete storage.data[k]; }
    },
    document: { getElementById: () => null },
    navigator: {},
    window: null
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  ['js/utils.js', 'js/data.js'].forEach((file) => {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  });

  sandbox.SITE_DATA.departments.find((dept) => dept.id === 'editing').services = [
    { id: 'shorts', name: 'Shorts', description: '', price: 500 },
    { id: 'narrezka', name: 'Нарезка', description: '', price: 300 },
    { id: 'edit', name: 'Эдит', description: '', price: 700 }
  ];
  sandbox.SITE_DATA.departments.find((dept) => dept.id === 'programming').services = [
    { id: 'site', name: 'Разработка сайта', description: '', price: 5000 }
  ];
  const cartCode = fs.readFileSync(path.join(ROOT, 'js/cart.js'), 'utf8');
  vm.runInContext(cartCode, sandbox, { filename: 'js/cart.js' });

  return { sandbox, storage };
}

console.log('1. Форматирование цены');
{
  const { sandbox } = createSession();
  assert(vm.runInContext('formatPrice(500)', sandbox) === '500 ₽', 'formatPrice(500) === "500 ₽"');
  assert(vm.runInContext('formatPrice(7800)', sandbox).replace(/\s/g, ' ') === '7 800 ₽',
    'formatPrice(7800) === "7 800 ₽" (NBSP допустим)');
  assert(vm.runInContext('formatPrice("abc")', sandbox) === '0 ₽', 'нечисловое значение -> 0 ₽');
}

console.log('2. Добавление из разных отделов, суммирование и итог');
const shared = { data: {} };
{
  const { sandbox } = createSession(shared);
  vm.runInContext(`
    Cart.add('editing', 'shorts', 3);
    Cart.add('editing', 'narrezka', 2);
    Cart.add('editing', 'edit', 1);
    Cart.add('programming', 'site', 1);
  `, sandbox);

  assert(vm.runInContext('Cart.getCount()', sandbox) === 7, 'суммарное количество = 7');
  assert(vm.runInContext('Cart.getTotal()', sandbox) === 7800, 'итог = 7800 (3*500 + 2*300 + 700 + 5000)');

  vm.runInContext("Cart.add('editing', 'shorts', 2)", sandbox);
  assert(vm.runInContext('Cart.getCount()', sandbox) === 9, 'повторное добавление суммирует количество');
  assert(vm.runInContext("Cart.getItems().find(i => i.serviceId === 'shorts').qty", sandbox) === 5,
    'количество Shorts = 5');

  assert(vm.runInContext("Cart.add('editing', 'nope', 1)", sandbox) === false,
    'несуществующая услуга не добавляется');
  assert(vm.runInContext("Cart.add('editing', 'shorts', 0)", sandbox) === false,
    'количество 0 не добавляется');
}

console.log('3. Сообщение для Telegram');
{
  const { sandbox } = createSession(shared);
  const message = vm.runInContext('Cart.buildOrderMessage()', sandbox);
  assert(typeof message === 'string' && message.indexOf('Хочу оформить заказ в Vtube Community.') === 0,
    'шапка сообщения совпадает с ТЗ (без «Здравствуйте!»)');
  assert(message.includes('• Shorts — 5 × 500 ₽'), 'строка Shorts корректна');
  assert(message.includes('• Нарезка — 2 × 300 ₽'), 'строка Нарезка корректна');
  assert(message.includes('Итого: ' + vm.runInContext('formatPrice(Cart.getTotal())', sandbox)),
    'итоговая сумма в сообщении равна сумме корзины');

  // Данные заказчика добавляются в сообщение.
  const withDetails = vm.runInContext(
    "Cart.buildOrderMessage({ name: 'Иван', contact: '@ivan', viewers: '10к', botHosting: true })",
    sandbox);
  assert(withDetails.includes('Имя: Иван'), 'имя заказчика попадает в сообщение');
  assert(withDetails.includes('Контакты: @ivan'), 'контакты заказчика попадают в сообщение');
  assert(withDetails.includes('Данные зрителей: 10к'), 'данные зрителей попадают в сообщение');
  assert(withDetails.includes('Бот размещается на хостинге исполнителя: да'),
    'информация о размещении бота попадает в сообщение');
  assert(!withDetails.includes('Здравствуйте'), 'в новом шаблоне нет приветствия');

  const shareUrl = vm.runInContext('Cart.buildShareUrl(Cart.buildOrderMessage())', sandbox);
  assert(shareUrl.startsWith(sandbox.SITE_DATA.links.telegramShare + '?'), 'ссылка Telegram Share построена');
  assert(shareUrl.includes('text='), 'текст сообщения закодирован в ссылке');
}

console.log('4. Сохранение корзины (симуляция перезагрузки страницы)');
{
  const { sandbox } = createSession(shared);
  assert(vm.runInContext('Cart.getCount()', sandbox) === 9, 'корзина восстановлена из localStorage после «перезагрузки»');
  assert(vm.runInContext('Cart.getTotal()', sandbox) === 8800,
    'итог после восстановления = 8800 (5*500 + 2*300 + 700 + 5000)');
}

console.log('5. Изменение количества и удаление');
{
  const { sandbox } = createSession(shared);
  vm.runInContext("Cart.changeQty('editing', 'shorts', -2)", sandbox);
  assert(vm.runInContext("Cart.getItems().find(i => i.serviceId === 'shorts').qty", sandbox) === 3,
    'уменьшение количества работает');

  vm.runInContext("Cart.setQty('editing', 'shorts', 0)", sandbox);
  assert(vm.runInContext("Cart.getItems().some(i => i.serviceId === 'shorts')", sandbox) === false,
    'количество 0 удаляет позицию');

  vm.runInContext("Cart.remove('editing', 'narrezka')", sandbox);
  assert(vm.runInContext("Cart.getItems().some(i => i.serviceId === 'narrezka')", sandbox) === false,
    'удаление позиции работает');

  vm.runInContext('Cart.clear()', sandbox);
  assert(vm.runInContext('Cart.isEmpty()', sandbox) === true, 'очистка корзины');
  assert(vm.runInContext('Cart.buildOrderMessage()', sandbox) === null,
    'для пустой корзины сообщение не формируется');
}

console.log('6. Защита от мусора в localStorage');
{
  const dirty = { data: {} };
  dirty.data[STORAGE_KEY] = JSON.stringify([
    { deptId: 'editing', serviceId: 'shorts', qty: 2 },
    { deptId: 'ghost', serviceId: 'unknown', qty: 5 },   // удалённая услуга
    { deptId: 'editing', serviceId: 'edit', qty: -3 },   // отрицательное количество
    { deptId: 'editing', serviceId: 'edit', qty: 'NaN' },// не число
    'мусорная строка'
  ]);
  const { sandbox } = createSession(dirty);
  const items = vm.runInContext('JSON.stringify(Cart.getItems().map(i => i.serviceId))', sandbox);
  assert(items === '["shorts"]', 'из хранилища остаются только валидные позиции');
  assert(vm.runInContext('Cart.getTotal()', sandbox) === 1000, 'итог по валидным позициям = 1000');
}

console.log('7. Ошибка хранилища не ломает сайт');
{
  const sandbox = {
    console,
    document: { getElementById: () => null },
    navigator: {},
    window: null,
    localStorage: {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  ['js/utils.js', 'js/data.js'].forEach((file) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  });
  sandbox.SITE_DATA.departments.find((dept) => dept.id === 'editing').services = [
    { id: 'shorts', name: 'Shorts', description: '', price: 500 }
  ];
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/cart.js'), 'utf8'), sandbox, { filename: 'js/cart.js' });
  let ok = true;
  try {
    vm.runInContext("Cart.add('editing', 'shorts', 1)", sandbox);
  } catch (e) {
    ok = false;
  }
  assert(ok && vm.runInContext('Cart.getCount()', sandbox) === 1,
    'корзина работает в памяти при недоступном localStorage');
}

console.log('');
console.log('Итого: ' + passed + ' пройдено, ' + failed + ' упало');
process.exit(failed > 0 ? 1 : 0);
