/**
 * Vtube Community — панель отдела: список услуг + калькулятор.
 * Слева — услуги с количеством, справа — расчёт и переход в корзину.
 */
'use strict';

var Calculator = (function () {

  /** Обновляет счётчик/кнопку/подсветку карточки услуги. */
  function refreshCard(card, qty) {
    card.qtyValue.textContent = String(qty);
    card.addBtn.disabled = qty < 1;
    card.root.classList.toggle('is-selected', qty > 0);
  }

  /** Пересобирает правый блок расчёта по текущим количествам. */
  function refreshSummary(dept, qtyState, refs) {
    clearNode(refs.list);
    var total = 0;
    var any = false;

    dept.services.forEach(function (svc) {
      var qty = qtyState[svc.id] || 0;
      if (qty < 1) return;
      any = true;
      var line = svc.price * qty;
      total += line;

      var row = createElement('div', 'summary__row');
      row.appendChild(createElement('span', 'summary__name', svc.name + ' × ' + qty));
      row.appendChild(createElement('span', 'summary__price', formatPrice(line)));
      refs.list.appendChild(row);
    });

    if (!any) {
      refs.list.appendChild(createElement('p', 'summary__empty', 'Выберите услуги слева'));
    }
    refs.totalValue.textContent = formatPrice(total);
    refs.addAllBtn.disabled = !any;
  }

  /**
   * Создаёт панель отдела (role=tabpanel) с калькулятором.
   * @param {Object} dept — отдел из SITE_DATA.departments
   * @returns {HTMLElement}
   */
  function createDepartmentPanel(dept) {
    var section = createElement('section', 'panel');
    section.id = 'panel-' + dept.id;
    section.setAttribute('role', 'tabpanel');

    section.appendChild(createElement('h2', 'panel__title', dept.title));
    section.appendChild(createElement('p', 'panel__lead', dept.description));

    if (!dept.services.length) {
      var placeholder = createElement('div', 'placeholder-card');
      placeholder.appendChild(createElement('span', 'placeholder-card__badge', 'Скоро'));
      placeholder.appendChild(createElement('p', 'placeholder-card__text', 'Услуги скоро появятся.'));
      section.appendChild(placeholder);
      return section;
    }

    var calc = createElement('div', 'calc');

    /* ----- Левая часть: список услуг ----- */
    var listCol = createElement('div', 'calc__services');
    var listHead = createElement('div', 'section-head');
    listHead.appendChild(createElement('h3', 'section-head__title', 'Услуги'));
    listCol.appendChild(listHead);

    var qtyState = {};  // serviceId -> выбранное количество
    var cards = {};     // serviceId -> ссылки на элементы карточки

    dept.services.forEach(function (svc) {
      qtyState[svc.id] = 0;

      var card = createElement('article', 'service-card');
      card.setAttribute('data-service-id', svc.id);

      var info = createElement('div', 'service-card__info');
      info.appendChild(createElement('h4', 'service-card__name', svc.name));
      info.appendChild(createElement('p', 'service-card__desc', svc.description));

      var priceRow = createElement('div', 'service-card__price-row');
      priceRow.appendChild(createElement('span', 'service-card__price', formatPrice(svc.price)));
      priceRow.appendChild(createElement('span', 'service-card__unit',
        svc.priceFixed ? 'фиксированная цена' : 'за единицу'));
      info.appendChild(priceRow);

      var controls = createElement('div', 'service-card__controls');

      var qtyBox = createElement('div', 'qty');

      var decBtn = createElement('button', 'qty__btn');
      decBtn.type = 'button';
      decBtn.setAttribute('data-act', 'dec');
      decBtn.setAttribute('aria-label', 'Уменьшить количество: ' + svc.name);
      decBtn.textContent = '−';

      var qtyValue = createElement('span', 'qty__value', '0');
      qtyValue.setAttribute('aria-label', 'Количество: ' + svc.name);

      var incBtn = createElement('button', 'qty__btn');
      incBtn.type = 'button';
      incBtn.setAttribute('data-act', 'inc');
      incBtn.setAttribute('aria-label', 'Увеличить количество: ' + svc.name);
      incBtn.textContent = '+';

      qtyBox.appendChild(decBtn);
      qtyBox.appendChild(qtyValue);
      qtyBox.appendChild(incBtn);

      var addBtn = createElement('button', 'btn btn--small btn--accent service-card__add');
      addBtn.type = 'button';
      addBtn.setAttribute('data-act', 'add');
      addBtn.disabled = true;
      addBtn.textContent = 'В корзину';

      controls.appendChild(qtyBox);
      controls.appendChild(addBtn);

      card.appendChild(info);
      card.appendChild(controls);
      listCol.appendChild(card);

      cards[svc.id] = { root: card, qtyValue: qtyValue, addBtn: addBtn };
    });

    /* ----- Правая часть: блок расчёта ----- */
    var summary = createElement('aside', 'calc__summary');
    summary.appendChild(createElement('h3', 'section-head__title', 'Расчет'));

    var summaryList = createElement('div', 'summary__list');
    summary.appendChild(summaryList);

    var totalBox = createElement('div', 'summary__total');
    totalBox.appendChild(createElement('span', 'summary__total-label', 'Итого:'));
    var totalValue = createElement('strong', 'summary__total-value', formatPrice(0));
    totalBox.appendChild(totalValue);
    summary.appendChild(totalBox);

    var addAllBtn = createElement('button', 'btn btn--primary btn--block', 'Добавить в корзину');
    addAllBtn.type = 'button';
    addAllBtn.setAttribute('data-act', 'add-all');
    addAllBtn.disabled = true;

    var goCartBtn = createElement('button', 'btn btn--block', 'Перейти к корзине');
    goCartBtn.type = 'button';
    goCartBtn.setAttribute('data-act', 'go-cart');

    summary.appendChild(addAllBtn);
    summary.appendChild(goCartBtn);

    var refs = {
      list: summaryList,
      totalValue: totalValue,
      addAllBtn: addAllBtn
    };

    /* ----- Взаимодействие ----- */

    function setQty(serviceId, nextQty) {
      var qty = Math.min(999999, Math.max(0, nextQty));
      qtyState[serviceId] = qty;
      refreshCard(cards[serviceId], qty);
      refreshSummary(dept, qtyState, refs);
    }

    function resetAll() {
      dept.services.forEach(function (svc) {
        qtyState[svc.id] = 0;
        refreshCard(cards[svc.id], 0);
      });
      refreshSummary(dept, qtyState, refs);
    }

    listCol.addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-act]');
      if (!btn || !listCol.contains(btn)) return;
      var cardEl = btn.closest('.service-card');
      if (!cardEl) return;
      var serviceId = cardEl.getAttribute('data-service-id');
      var service = Cart.getService(dept.id, serviceId);
      if (!service) return;

      var act = btn.getAttribute('data-act');
      var current = qtyState[serviceId] || 0;

      if (act === 'inc') {
        setQty(serviceId, current + 1);
      } else if (act === 'dec') {
        setQty(serviceId, current - 1);
      } else if (act === 'add') {
        if (current < 1) return;
        if (Cart.add(dept.id, serviceId, current)) {
          setQty(serviceId, 0);
          showToast('«' + service.name + '» — добавлено в корзину');
        }
      }
    });

    summary.addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-act]');
      if (!btn || !summary.contains(btn)) return;
      var act = btn.getAttribute('data-act');

      if (act === 'add-all') {
        var added = 0;
        dept.services.forEach(function (svc) {
          var qty = qtyState[svc.id] || 0;
          if (qty > 0 && Cart.add(dept.id, svc.id, qty)) added += 1;
        });
        if (added > 0) {
          resetAll();
          showToast('Услуги добавлены в корзину');
        }
      } else if (act === 'go-cart') {
        if (typeof openCart === 'function') openCart();
      }
    });

    /* ----- Сборка панели ----- */
    calc.appendChild(listCol);
    calc.appendChild(summary);
    section.appendChild(calc);

    refreshSummary(dept, qtyState, refs);
    return section;
  }

  return {
    createDepartmentPanel: createDepartmentPanel
  };
})();
