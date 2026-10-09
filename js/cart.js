/**
 * Vtube Community — модель единой корзины.
 * Хранение: localStorage (без сервера). Позиции отделов объединяются в один список.
 */
'use strict';

var Cart = (function () {
  var STORAGE_KEY = 'vtc_cart_v1';
  var items = []; // [{ deptId, serviceId, qty }]
  var listeners = [];

  /* ---------- Поиск данных ---------- */

  function getDepartment(deptId) {
    var departments = SITE_DATA.departments || [];
    for (var i = 0; i < departments.length; i++) {
      if (departments[i].id === deptId) return departments[i];
    }
    return null;
  }

  function getService(deptId, serviceId) {
    var dept = getDepartment(deptId);
    if (!dept) return null;
    var services = dept.services || [];
    for (var i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) return services[i];
    }
    return null;
  }

  function findItemIndex(deptId, serviceId) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].deptId === deptId && items[i].serviceId === serviceId) return i;
    }
    return -1;
  }

  /* ---------- Хранилище ---------- */

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    items = [];
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        var qty = toPositiveInt(entry.qty, 0);
        if (qty < 1) return;
        // Отфильтровываем позиции, которых больше нет в прайсе.
        if (!getService(entry.deptId, entry.serviceId)) return;
        if (findItemIndex(entry.deptId, entry.serviceId) !== -1) return;
        items.push({ deptId: String(entry.deptId), serviceId: String(entry.serviceId), qty: qty });
      });
    } catch (e) {
      items = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* приватный режим или переполненное хранилище — корзина работает в памяти */
    }
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (e) { /* не мешаем остальным подписчикам */ }
    });
  }

  function commit() {
    save();
    notify();
  }

  /* ---------- Операции ---------- */

  /** Добавить услугу (qty суммируется с уже добавленной). */
  function add(deptId, serviceId, qty) {
    var amount = toPositiveInt(qty, 0);
    if (amount < 1) return false;
    if (!getService(deptId, serviceId)) return false;
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) {
      items.push({ deptId: deptId, serviceId: serviceId, qty: amount });
    } else {
      items[index].qty += amount;
    }
    commit();
    return true;
  }

  /** Установить количество; 0 удаляет позицию. */
  function setQty(deptId, serviceId, qty) {
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) return false;
    var amount = toPositiveInt(qty, 0);
    if (amount < 1) {
      items.splice(index, 1);
    } else {
      items[index].qty = amount;
    }
    commit();
    return true;
  }

  function changeQty(deptId, serviceId, delta) {
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) return false;
    return setQty(deptId, serviceId, items[index].qty + delta);
  }

  function remove(deptId, serviceId) {
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) return false;
    items.splice(index, 1);
    commit();
    return true;
  }

  function clear() {
    if (!items.length) return;
    items = [];
    commit();
  }

  /* ---------- Выборки ---------- */

  /** Позиции с данными услуги для отображения: deptTitle, service, qty, lineTotal. */
  function getItems() {
    return items.map(function (entry) {
      var dept = getDepartment(entry.deptId);
      var service = getService(entry.deptId, entry.serviceId);
      return {
        deptId: entry.deptId,
        deptTitle: dept ? dept.title : '',
        serviceId: entry.serviceId,
        name: service.name,
        description: service.description,
        price: service.price,
        qty: entry.qty,
        lineTotal: service.price * entry.qty
      };
    });
  }

  /** Суммарное количество товаров (для бейджа). */
  function getCount() {
    return items.reduce(function (sum, entry) { return sum + entry.qty; }, 0);
  }

  function getTotal() {
    return items.reduce(function (sum, entry) {
      var service = getService(entry.deptId, entry.serviceId);
      return sum + (service ? service.price * entry.qty : 0);
    }, 0);
  }

  function isEmpty() {
    return items.length === 0;
  }

  /** Подписка на изменения корзины. */
  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  /* ---------- Оформление заказа ---------- */

  /**
   * Текст сообщения для Telegram по формату из ТЗ.
   * @param {Object} [details] — данные заказчика (имя, контакты, зрители, хостинг бота).
   * @returns {string|null} null при пустой корзине.
   */
  function buildOrderMessage(details) {
    if (isEmpty()) return null;
    var lines = [
      'Хочу оформить заказ в Vtube Community.',
      '',
      'Услуги:'
    ];
    getItems().forEach(function (item) {
      lines.push('• ' + item.name + ' — ' + item.qty + ' × ' + formatPrice(item.price));
    });
    lines.push('');
    lines.push('Итого: ' + formatPrice(getTotal()));

    // Дополнительные данные заказчика (по ТЗ). Добавляются только заполненные поля.
    var extra = [];
    if (details) {
      if (details.name) extra.push('Имя: ' + details.name);
      if (details.contact) extra.push('Контакты: ' + details.contact);
      if (details.viewers) extra.push('Данные зрителей: ' + details.viewers);
      if (details.botHosting) extra.push('Бот размещается на хостинге исполнителя: да');
    }
    if (extra.length) {
      lines.push('');
      lines.push(extra.join('\n'));
    }
    return lines.join('\n');
  }

  /** Ссылка Telegram Share с готовым сообщением. */
  function buildShareUrl(message) {
    var params = [];
    if (SITE_DATA.links.siteUrl) {
      params.push('url=' + encodeURIComponent(SITE_DATA.links.siteUrl));
    }
    params.push('text=' + encodeURIComponent(message));
    return SITE_DATA.links.telegramShare + '?' + params.join('&');
  }

  load();

  return {
    add: add,
    setQty: setQty,
    changeQty: changeQty,
    remove: remove,
    clear: clear,
    getItems: getItems,
    getCount: getCount,
    getTotal: getTotal,
    isEmpty: isEmpty,
    subscribe: subscribe,
    buildOrderMessage: buildOrderMessage,
    buildShareUrl: buildShareUrl,
    getDepartment: getDepartment,
    getService: getService
  };
})();
