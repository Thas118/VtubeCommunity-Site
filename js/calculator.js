/**
 * Vtube Community — панель отдела.
 * Услуги отображаются интерактивными кнопками; клик открывает модальное окно
 * с подробным описанием (механика как в портфолио) и добавлением в корзину.
 * Справа — живой расчёт выбранных услуг этого отдела из общей корзины.
 */
'use strict';

var Calculator = (function () {

  /** Подпись цены услуги. Учитывает «по договорённости», диапазон и «от N ₽». */
  function priceLabel(dept, service) {
    // Почасовая тарификация
    if (service.pricePerHour) return '100 ₽/час';
    // Тарифи по длительности
    if (service.durations && service.durations.length) {
      return 'по длительности: ' + service.durations.map(d => d.label + ' ' + d.price + ' ₽').join(', ');
    }
    // Цена по договорённости
    if (service.priceNegotiable) return 'цена по договорённости';
    // Диапазон "от ... до ..."
    if (typeof service.priceMax === 'number' && service.priceMax > service.price) {
      return 'от ' + formatPrice(service.price) + ' до ' + formatPrice(service.priceMax);
    }
    // Обычная цена от N ₽
    return (dept.priceFrom ? 'от ' : '') + formatPrice(service.price);
  }

  /**
   * Создаёт панель отдела (role=tabpanel).
   * @param {Object} dept — отдел из SITE_DATA.departments
   * @returns {HTMLElement}
   */
  function createDepartmentPanel(dept) {
    var section = createElement('section', 'panel');
    section.id = 'panel-' + dept.id;
    section.setAttribute('role', 'tabpanel');

    section.appendChild(createElement('h2', 'panel__title', dept.title));
    section.appendChild(createElement('p', 'panel__lead', dept.description));

    if (!dept.services || !dept.services.length) {
      var placeholder = createElement('div', 'placeholder-card');
      placeholder.appendChild(createElement('span', 'placeholder-card__badge', 'Скоро'));
      placeholder.appendChild(createElement('p', 'placeholder-card__text', 'Услуги скоро появятся.'));
      section.appendChild(placeholder);
      return section;
    }

    var calc = createElement('div', 'calc');

    /* ----- Левая часть: кнопки услуг ----- */
    var listCol = createElement('div', 'calc__services');
    var listHead = createElement('div', 'section-head');
    listHead.appendChild(createElement('h3', 'section-head__title', 'Услуги'));
    listHead.appendChild(createElement('p', 'section-head__hint',
      'Нажмите на услугу, чтобы открыть подробное описание и добавить в корзину.'));
    listCol.appendChild(listHead);

    /* Условия отрисовки: сначала услуги по цене (дешёвые → дорогие),
       индивидуальный заказ (priceNegotiable) всегда в конец. */
    var services = (dept.services || []).slice();
    services.sort(function (a, b) {
      var aNeg = !!a.priceNegotiable;
      var bNeg = !!b.priceNegotiable;
      if (aNeg && !bNeg) return 1;
      if (!aNeg && bNeg) return -1;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });

    var grid = createElement('div', 'service-grid');
    var btnByServiceId = {}; // id -> кнопка карточки (для визуального состояния «в корзине»)
    services.forEach(function (svc) {
      var btn = createElement('button', 'service-btn');
      btn.type = 'button';
      btn.setAttribute('data-service-id', svc.id);
      btnByServiceId[svc.id] = btn;

      btn.appendChild(createElement('span', 'service-btn__name', svc.name));
      var priceSpan = createElement('span', 'service-btn__price', priceLabel(dept, svc));
      // Длинную подпись «цена по договорённости» держим в одну строку.
      if (svc.priceNegotiable) priceSpan.classList.add('service-btn__price--negotiable');
      btn.appendChild(priceSpan);

      btn.addEventListener('click', function () {
        if (typeof openServiceModal === 'function') {
          openServiceModal(dept.id, svc.id);
        }
      });
      grid.appendChild(btn);
    });
    listCol.appendChild(grid);

    /* ----- Правая часть: живой расчёт по общей корзине ----- */
    var summary = createElement('aside', 'calc__summary');
    summary.appendChild(createElement('h3', 'section-head__title', 'Расчет'));

    var summaryList = createElement('div', 'summary__list');
    summary.appendChild(summaryList);

    var totalBox = createElement('div', 'summary__total');
    totalBox.appendChild(createElement('span', 'summary__total-label', 'Итого:'));
    var totalValue = createElement('strong', 'summary__total-value', formatPrice(0));
    totalBox.appendChild(totalValue);
    summary.appendChild(totalBox);

    var goCartBtn = createElement('button', 'btn btn--primary btn--block', 'Перейти к корзине');
    goCartBtn.type = 'button';
    summary.appendChild(goCartBtn);

    function refreshSummary() {
      clearNode(summaryList);
      var any = false;
      var inCartIds = {}; // id услуг этого отдела, которые уже в корзине (для подсветки карточек)
      Cart.getItems().forEach(function (item) {
        any = true;
        if (item.deptId === dept.id) inCartIds[item.serviceId] = true;
        var row = createElement('div', 'summary__row');
        row.appendChild(createElement('span', 'summary__name', item.name + ' × ' + item.qty));
        row.appendChild(createElement('span', 'summary__price', formatPrice(item.lineTotal)));
        summaryList.appendChild(row);
      });
      if (!any) {
        summaryList.appendChild(createElement('p', 'summary__empty', 'Выберите услуги слева'));
      }
      totalValue.textContent = formatPrice(Cart.getTotal());

      /* Только визуальное состояние карточек — логика корзины не меняется. */
      Object.keys(btnByServiceId).forEach(function (svcId) {
        btnByServiceId[svcId].classList.toggle('is-in-cart', !!inCartIds[svcId]);
      });
    }

    goCartBtn.addEventListener('click', function () {
      if (typeof openCart === 'function') openCart();
    });

    Cart.subscribe(refreshSummary);

    calc.appendChild(listCol);
    calc.appendChild(summary);
    section.appendChild(calc);

    refreshSummary();
    return section;
  }

  return {
    createDepartmentPanel: createDepartmentPanel
  };
})();
