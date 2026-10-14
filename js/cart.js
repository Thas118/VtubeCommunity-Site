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

  /* ---------- Доп. услуги ---------- */

  /** Список доступных доп. услуг для услуги (всегда массив). */
  function getServiceAddons(service) {
    return (service && Array.isArray(service.addons)) ? service.addons : [];
  }

  /** Оставляет только валидные и уникальные id доп. услуг для данной услуги. */
  function normalizeAddonIds(service, addonIds) {
    if (!Array.isArray(addonIds)) return [];
    var valid = getServiceAddons(service).map(function (a) { return a.id; });
    var out = [];
    addonIds.forEach(function (id) {
      if (valid.indexOf(id) !== -1 && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  /** Объединяет два набора id доп. услуг без дублей. */
  function unionAddonIds(a, b) {
    var out = (Array.isArray(a) ? a : []).slice();
    (Array.isArray(b) ? b : []).forEach(function (id) {
      if (out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  /** Доп. услуги позиции с данными (id, name, price) — только валидные. */
  function resolveAddons(service, addonIds) {
    var ids = Array.isArray(addonIds) ? addonIds : [];
    return getServiceAddons(service).filter(function (a) {
      return ids.indexOf(a.id) !== -1;
    });
  }

  /** Базовая цена услуги числом. */
  function basePrice(service) {
    var p = service ? Number(service.price) : 0;
    return isFinite(p) ? p : 0;
  }

  /** Сумма фиксированных цен выбранных доп. услуг (допы-множители не входят). */
  function addonsTotal(service, addonIds) {
    return resolveAddons(service, addonIds).reduce(function (sum, a) {
      if (typeof a.multiplier === 'number') return sum;
      var p = Number(a.price);
      return sum + (isFinite(p) ? p : 0);
    }, 0);
  }

  /** Произведение множителей выбранных доп. услуг (по умолчанию 1). */
  function addonsMultiplier(service, addonIds) {
    return resolveAddons(service, addonIds).reduce(function (mul, a) {
      var m = Number(a.multiplier);
      return (isFinite(m) && m > 0) ? mul * m : mul;
    }, 1);
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
        var svc = getService(entry.deptId, entry.serviceId);
        if (!svc) return;
        if (findItemIndex(entry.deptId, entry.serviceId) !== -1) return;
        items.push({
          deptId: String(entry.deptId),
          serviceId: String(entry.serviceId),
          qty: qty,
          addonIds: normalizeAddonIds(svc, entry.addonIds)
        });
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

  /** Добавить услугу (qty суммируется с уже добавленной; выбранные допы объединяются). */
  function add(deptId, serviceId, qty, addonIds) {
    var amount = toPositiveInt(qty, 0);
    if (amount < 1) return false;
    var service = getService(deptId, serviceId);
    if (!service) return false;
    var chosen = normalizeAddonIds(service, addonIds);
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) {
      items.push({ deptId: deptId, serviceId: serviceId, qty: amount, addonIds: chosen });
    } else {
      items[index].qty += amount;
      items[index].addonIds = unionAddonIds(items[index].addonIds, chosen);
    }
    commit();
    return true;
  }

  /** Заменить набор доп. услуг у позиции в корзине. */
  function setAddons(deptId, serviceId, addonIds) {
    var index = findItemIndex(deptId, serviceId);
    if (index === -1) return false;
    var service = getService(deptId, serviceId);
    items[index].addonIds = normalizeAddonIds(service, addonIds);
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

  /** Позиции с данными услуги для отображения: deptTitle, service, qty, addons, lineTotal. */
  function getItems() {
    return items.map(function (entry) {
      var dept = getDepartment(entry.deptId);
      var service = getService(entry.deptId, entry.serviceId);
      var addons = resolveAddons(service, entry.addonIds);
      var extra = addonsTotal(service, entry.addonIds);
      var mult = addonsMultiplier(service, entry.addonIds);
      var base = basePrice(service);
      var negotiable = !!(service && service.priceNegotiable);
      // Цена за единицу = база + сумма фикс. доп. услуг;
      // итог позиции = цена за единицу × количество × множитель доп. услуг.
      var unitPrice = negotiable ? 0 : base + extra;
      return {
        deptId: entry.deptId,
        deptTitle: dept ? dept.title : '',
        serviceId: entry.serviceId,
        name: service.name,
        description: service.description,
        price: base,
        priceFixed: !!(service && service.priceFixed),
        negotiable: negotiable,
        addons: addons,
        addonsTotal: extra,
        multiplier: mult,
        unitPrice: unitPrice,
        qty: entry.qty,
        lineTotal: unitPrice * entry.qty * mult
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
      if (!service) return sum;
      var negotiable = !!service.priceNegotiable;
      var unit = negotiable ? 0 : basePrice(service) + addonsTotal(service, entry.addonIds);
      var mult = addonsMultiplier(service, entry.addonIds);
      return sum + unit * entry.qty * mult;
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
   * Текст сообщения для Telegram.
   * @param {Object} [details] — данные заказчика (имя, контакты) и согласия (consentPd, consentOffer).
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
      if (item.negotiable) {
        lines.push('• ' + item.name + ' — ' + item.qty + ' шт. (цена по договорённости)');
      } else {
        lines.push('• ' + item.name + ' — ' + item.qty + ' × ' + formatPrice(item.unitPrice));
      }
      // Выбранные доп. услуги — подпунктами под услугой.
      item.addons.forEach(function (addon) {
        if (typeof addon.multiplier === 'number') {
          lines.push('    + ' + addon.name + ' — ×' + addon.multiplier);
        } else {
          lines.push('    + ' + addon.name + ' — ' + formatPrice(addon.price));
        }
      });
    });
    lines.push('');
    lines.push('Итого: ' + formatPrice(getTotal()));

    // Дополнительные данные заказчика. Добавляются только заполненные поля.
    var extra = [];
    if (details) {
      if (details.name) extra.push('Имя: ' + details.name);
      if (details.contact) extra.push('Контакты: ' + details.contact);
    }
    if (extra.length) {
      lines.push('');
      lines.push(extra.join('\n'));
    }

    // Согласия — попадают в сообщение только если отмечены.
    var consents = [];
    if (details && details.consentPd) consents.push('- Я согласен на обработку персональных данных');
    if (details && details.consentOffer) consents.push('- Я согласен с офертой');
    if (consents.length) {
      lines.push('');
      lines.push(consents.join('\n'));
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
    setAddons: setAddons,
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
