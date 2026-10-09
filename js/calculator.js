/**
 * Vtube Community — панель отдела.
 * Услуги отображаются интерактивными кнопками; клик открывает модальное окно
 * с подробным описанием (механика как в портфолио) и добавлением в корзину.
 * Справа — живой расчёт выбранных услуг этого отдела из общей корзины.
 */
'use strict';

var Calculator = (function () {

  /** Копия услуг отдела, отсортированная по возрастанию цены. */
  function sortedServices(dept) {
    return (dept.services || []).slice().sort(function (a, b) {
      return a.price - b.price;
    });
  }

  /** Подпись цены: «от N ₽» для отделов со стартовой ценой, иначе «N ₽». */
  function priceLabel(dept, price) {
    return (dept.priceFrom ? 'от ' : '') + formatPrice(price);
  }

  /** Итог по одному отделу на основе общей корзины. */
  function deptTotal(deptId) {
    return Cart.getItems().reduce(function (sum, item) {
      return item.deptId === deptId ? sum + item.lineTotal : sum;
    }, 0);
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

    var grid = createElement('div', 'service-grid');
    sortedServices(dept).forEach(function (svc) {
      var btn = createElement('button', 'service-btn');
      btn.type = 'button';
      btn.setAttribute('data-service-id', svc.id);

      btn.appendChild(createElement('span', 'service-btn__name', svc.name));
      btn.appendChild(createElement('span', 'service-btn__price', priceLabel(dept, svc.price)));

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
      Cart.getItems().forEach(function (item) {
        if (item.deptId !== dept.id) return;
        any = true;
        var row = createElement('div', 'summary__row');
        row.appendChild(createElement('span', 'summary__name', item.name + ' × ' + item.qty));
        row.appendChild(createElement('span', 'summary__price', formatPrice(item.lineTotal)));
        summaryList.appendChild(row);
      });
      if (!any) {
        summaryList.appendChild(createElement('p', 'summary__empty', 'Выберите услуги слева'));
      }
      totalValue.textContent = formatPrice(deptTotal(dept.id));
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
