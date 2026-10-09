/**
 * Vtube Community — инициализация сайта:
 * вкладки, панели разделов, корзина-шторка, карточка клиента, футер.
 */
'use strict';

/* =========================================================
 * Вкладки и панели
 * ========================================================= */

var navTabsEl = null;
var panelsEl = null;
var tabButtons = {}; // id вкладки -> кнопка
var panels = {};     // id вкладки -> панель

function buildNav() {
  clearNode(navTabsEl);
  SITE_DATA.sections.forEach(function (section) {
    var btn = createElement('button', 'nav-tab');
    btn.type = 'button';
    btn.id = 'tab-' + section.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'panel-' + section.id);
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = section.label;
    btn.addEventListener('click', function () {
      activateSection(section.id, true);
    });
    navTabsEl.appendChild(btn);
    tabButtons[section.id] = btn;
  });
}

function buildPanels() {
  clearNode(panelsEl);
  SITE_DATA.sections.forEach(function (section) {
    var panel = null;
    if (section.type === 'department') {
      var dept = Cart.getDepartment(section.id);
      if (dept) {
        panel = Calculator.createDepartmentPanel(dept);
      } else {
        console.warn('Отдел не найден в SITE_DATA.departments:', section.id);
      }
    } else if (section.type === 'portfolio') {
      panel = createPortfolioPanel();
    } else if (section.type === 'about') {
      panel = createAboutPanel();
    } else if (section.type === 'team') {
      panel = createTeamPanel();
    } else if (section.type === 'promo') {
      panel = createPromoPanel();
    } else if (section.type === 'howto') {
      panel = createHowtoPanel();
    }

    if (!panel) return;
    panel.id = 'panel-' + section.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + section.id);
    panelsEl.appendChild(panel);
    panels[section.id] = panel;
  });
}

/** Активация вкладки: показывает панель, подсвечивает кнопку, обновляет hash. */
function activateSection(id, updateHash) {
  if (!panels[id]) {
    id = SITE_DATA.sections.length ? SITE_DATA.sections[0].id : '';
  }
  if (!panels[id]) return;

  SITE_DATA.sections.forEach(function (section) {
    var isActive = section.id === id;
    var panel = panels[section.id];
    var btn = tabButtons[section.id];
    if (panel) panel.hidden = !isActive;
    if (btn) {
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        try {
          btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        } catch (e) {
          /* scrollIntoView может быть недоступен — не критично */
        }
      }
    }
  });

  if (updateHash && window.location.hash !== '#' + id) {
    try {
      history.replaceState(null, '', '#' + id);
    } catch (e) {
      window.location.hash = id;
    }
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* =========================================================
 * Статические панели разделов
 * ========================================================= */

function pluralizeWorks(count) {
  var mod10 = count % 10;
  var mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'работа';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'работы';
  return 'работ';
}

/** Склонение слова «ролик». */
function pluralizeClips(count) {
  var mod10 = count % 10;
  var mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ролик';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'ролика';
  return 'роликов';
}

/** Является ли работа видео (плейлист или одиночный YouTube-ролик). */
function isVideoWork(work) {
  if (work && Array.isArray(work.videos)) return true;
  return !!parseYouTubeUrl(work && work.url ? work.url : '').videoId;
}

/** Сколько роликов в работе (для подписи рядом с названием). */
function getWorkClipCount(work) {
  if (work && Array.isArray(work.videos) && work.videos.length) return work.videos.length;
  if (typeof work.count === 'number' && work.count > 0) return work.count;
  return 1;
}

/** Количество работ клиента с дедупликацией видео между плейлистами. */
function clientWorkCount(client) {
  var seen = {};
  var count = 0;
  (client.works || []).forEach(function (work) {
    if (isVideoWork(work)) {
      if (Array.isArray(work.videos) && work.videos.length) {
        work.videos.forEach(function (id) {
          var key = client.id + ':' + id;
          if (!seen[key]) {
            seen[key] = true;
            count += 1;
          }
        });
      } else {
        var info = parseYouTubeUrl(work.url || '');
        var key = client.id + ':' + (info.videoId || work.url);
        if (!seen[key]) {
          seen[key] = true;
          count += 1;
        }
      }
    } else {
      count += 1; // не-видео deliverable (например, бот) считается одной работой
    }
  });
  return count;
}

function createPortfolioPanel() {
  var section = createElement('section', 'panel');
  section.appendChild(createElement('h2', 'panel__title', 'Портфолио'));
  section.appendChild(createElement('p', 'panel__lead',
    'Наши клиенты. Нажмите на карточку, чтобы открыть подробную информацию.'));

  var grid = createElement('div', 'portfolio-grid');

  SITE_DATA.portfolio.forEach(function (client) {
    var card = createElement('button', 'client-card');
    card.type = 'button';
    card.setAttribute('data-client-id', client.id);

    var avatar = createElement('img', 'client-card__avatar');
    avatar.alt = 'Аватар клиента ' + client.name;
    avatar.setAttribute('loading', 'lazy');
    avatar.width = 96;
    avatar.height = 96;
    setAvatarFallback(avatar, client.avatar);

    card.appendChild(avatar);
    card.appendChild(createElement('span', 'client-card__name', client.name));
    var count = clientWorkCount(client);
    card.appendChild(createElement('span', 'client-card__meta',
      count + ' ' + pluralizeWorks(count)));

    card.addEventListener('click', function () {
      openClientModal(client.id);
    });
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

function createPromoPanel() {
  var data = SITE_DATA.promo;
  var section = createElement('section', 'panel');
  section.appendChild(createElement('h2', 'panel__title', data.title));

  var plate = createElement('div', 'placeholder-card');
  plate.appendChild(createElement('span', 'placeholder-card__badge', data.badge));
  plate.appendChild(createElement('p', 'placeholder-card__text', data.text));

  section.appendChild(plate);
  return section;
}

function createHowtoPanel() {
  var data = SITE_DATA.howto;
  var section = createElement('section', 'panel');
  section.appendChild(createElement('h2', 'panel__title', data.title));

  var card = createElement('div', 'about-card card');
  data.paragraphs.forEach(function (text) {
    card.appendChild(createElement('p', 'about-card__text', text));
  });

  var cta = createElement('a', 'btn btn--primary', data.ctaLabel);
  cta.href = SITE_DATA.links.telegram;
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  card.appendChild(cta);

  section.appendChild(card);
  return section;
}

function createAboutPanel() {
  var data = SITE_DATA.about;
  var section = createElement('section', 'panel');
  section.appendChild(createElement('h2', 'panel__title', data.title));

  var card = createElement('div', 'about-card card');
  data.paragraphs.forEach(function (text) {
    card.appendChild(createElement('p', 'about-card__text', text));
  });

  if (data.note) {
    card.appendChild(createElement('p', 'about-card__note', data.note));
  }

  var cta = createElement('a', 'btn btn--primary', data.ctaLabel);
  cta.href = SITE_DATA.links.telegram;
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  card.appendChild(cta);

  section.appendChild(card);
  return section;
}

function createTeamPanel() {
  var data = SITE_DATA.team;
  var section = createElement('section', 'panel');
  section.appendChild(createElement('h2', 'panel__title', data.title));

  var plate = createElement('div', 'placeholder-card');
  plate.appendChild(createElement('span', 'placeholder-card__badge', data.badge));
  plate.appendChild(createElement('p', 'placeholder-card__text', data.text));

  section.appendChild(plate);
  return section;
}

/* =========================================================
 * Корзина (шторка)
 * ========================================================= */

var cartDrawer = null;
var cartBody = null;
var cartFooter = null;
var cartTotalValue = null;
var cartBadge = null;
var cartButton = null;
var cartCloseBtn = null;
var checkoutBtn = null;
var backdropEl = null;
var cartOpen = false;
var modalOpen = false;
var lastFocused = null;

/** Показ/скрытие общего фона и блокировка прокрутки страницы. */
function syncOverlay() {
  var anyOpen = cartOpen || modalOpen || serviceModalOpen;
  document.body.classList.toggle('no-scroll', anyOpen);
  if (anyOpen) {
    backdropEl.hidden = false;
    requestAnimationFrame(function () {
      if (cartOpen || modalOpen || serviceModalOpen) backdropEl.classList.add('is-open');
    });
  } else {
    backdropEl.classList.remove('is-open');
    setTimeout(function () {
      if (!cartOpen && !modalOpen && !serviceModalOpen) backdropEl.hidden = true;
    }, 300);
  }
}

function openCart() {
  if (modalOpen) closeClientModal();
  if (serviceModalOpen) closeServiceModal();
  if (cartOpen) return;
  cartOpen = true;
  cartDrawer.hidden = false;
  requestAnimationFrame(function () {
    cartDrawer.classList.add('is-open');
  });
  syncOverlay();
  if (cartButton) cartButton.setAttribute('aria-expanded', 'true');
  lastFocused = document.activeElement;
  if (cartCloseBtn) cartCloseBtn.focus();
}

function closeCart() {
  if (!cartOpen) return;
  cartOpen = false;
  cartDrawer.classList.remove('is-open');
  setTimeout(function () {
    if (!cartOpen) cartDrawer.hidden = true;
  }, 300);
  syncOverlay();
  if (cartButton) cartButton.setAttribute('aria-expanded', 'false');
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
}

function renderCartItem(item) {
  var row = createElement('div', 'cart-item');

  var top = createElement('div', 'cart-item__top');
  top.appendChild(createElement('span', 'cart-item__dept', item.deptTitle));

  var removeBtn = createElement('button', 'cart-item__remove');
  removeBtn.type = 'button';
  removeBtn.setAttribute('data-act', 'remove');
  removeBtn.setAttribute('data-dept', item.deptId);
  removeBtn.setAttribute('data-service', item.serviceId);
  removeBtn.setAttribute('aria-label', 'Удалить из корзины: ' + item.name);
  removeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>';
  top.appendChild(removeBtn);

  var main = createElement('div', 'cart-item__main');
  var info = createElement('div', 'cart-item__info');
  info.appendChild(createElement('span', 'cart-item__name', item.name));
  info.appendChild(createElement('span', 'cart-item__unit', formatPrice(item.price) + ' за единицу'));

  var controls = createElement('div', 'cart-item__controls');

  var qtyBox = createElement('div', 'qty qty--small');
  var decBtn = createElement('button', 'qty__btn');
  decBtn.type = 'button';
  decBtn.setAttribute('data-act', 'dec');
  decBtn.setAttribute('data-dept', item.deptId);
  decBtn.setAttribute('data-service', item.serviceId);
  decBtn.setAttribute('aria-label', 'Уменьшить количество: ' + item.name);
  decBtn.textContent = '−';

  var qtyValue = createElement('span', 'qty__value', String(item.qty));

  var incBtn = createElement('button', 'qty__btn');
  incBtn.type = 'button';
  incBtn.setAttribute('data-act', 'inc');
  incBtn.setAttribute('data-dept', item.deptId);
  incBtn.setAttribute('data-service', item.serviceId);
  incBtn.setAttribute('aria-label', 'Увеличить количество: ' + item.name);
  incBtn.textContent = '+';

  qtyBox.appendChild(decBtn);
  qtyBox.appendChild(qtyValue);
  qtyBox.appendChild(incBtn);

  controls.appendChild(qtyBox);
  controls.appendChild(createElement('span', 'cart-item__line', formatPrice(item.lineTotal)));

  main.appendChild(info);
  main.appendChild(controls);

  row.appendChild(top);
  row.appendChild(main);
  return row;
}

function renderCart() {
  /* Бейдж на кнопке корзины */
  var count = Cart.getCount();
  if (cartBadge) {
    cartBadge.hidden = count === 0;
    cartBadge.textContent = count > 99 ? '99+' : String(count);
  }

  if (!cartBody) return;
  clearNode(cartBody);

  if (Cart.isEmpty()) {
    var empty = createElement('div', 'cart-empty');
    empty.appendChild(createElement('p', 'cart-empty__title', 'Корзина пуста'));
    empty.appendChild(createElement('p', 'cart-empty__text',
      'Добавьте услуги в разделах «Отдел монтажа» и «Отдел программирования».'));
    cartBody.appendChild(empty);
    cartFooter.hidden = true;
    return;
  }

  cartFooter.hidden = false;
  cartTotalValue.textContent = formatPrice(Cart.getTotal());

  var list = createElement('div', 'cart-list');
  Cart.getItems().forEach(function (item) {
    list.appendChild(renderCartItem(item));
  });
  cartBody.appendChild(list);
  updateOrderPreview();
}

/** Читает данные заказчика из полей оформления в шторке корзины. */
function readOrderDetails() {
  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }
  var botHostingEl = document.getElementById('order-bot-hosting');
  return {
    name: val('order-name'),
    contact: val('order-contact'),
    viewers: val('order-viewers'),
    botHosting: !!(botHostingEl && botHostingEl.checked)
  };
}

/** Обновляет предпросмотр сообщения с учётом заполненных данных. */
function updateOrderPreview() {
  var messagePreview = document.getElementById('order-message-preview');
  if (messagePreview) messagePreview.textContent = Cart.buildOrderMessage(readOrderDetails());
}

/** Формирует сообщение заказа и открывает Telegram. */
function checkout() {
  var message = Cart.buildOrderMessage();
  if (!message) {
    showToast('Корзина пуста');
    return;
  }

  // Проверяем оба согласия непосредственно перед отправкой (#4.1).
  var pdCheckbox = document.getElementById('consent-pd');
  var offerCheckbox = document.getElementById('consent-offer');
  if (!pdCheckbox || !pdCheckbox.checked || !offerCheckbox || !offerCheckbox.checked) {
    showToast('Отметьте оба согласия: обработка данных и оферта');
    return;
  }

  message = Cart.buildOrderMessage(readOrderDetails());

  copyTextToClipboard(message).then(function (ok) {
    showToast(ok
      ? 'Сообщение скопировано — выберите чат Vtube Community'
      : 'Открывается Telegram с готовым сообщением заказа');
  });

  var url = Cart.buildShareUrl(message);
  var opened = null;
  try {
    opened = window.open(url, '_blank', 'noopener');
  } catch (e) {
    opened = null;
  }
  if (!opened) {
    window.location.href = url;
  }
}

/* =========================================================
 * Подробная карточка клиента (модальное окно)
 * ========================================================= */

var modalEl = null;
var modalContent = null;
var modalCloseBtn = null;

function findClient(clientId) {
  var list = SITE_DATA.portfolio || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === clientId) return list[i];
  }
  return null;
}

function setAvatarFallback(image, source) {
  image.src = source;
  image.addEventListener('error', function () {
    var fallback = 'assets/avatar-placeholder.png';
    if (image.getAttribute('src') !== fallback) image.src = fallback;
  }, { once: true });
}

/**
 * Извлекает videoId и playlistId из ссылки YouTube.
 * @param {string} url
 * @returns {{ videoId: string, playlistId: string }}
 */
function parseYouTubeUrl(url) {
  var result = { videoId: '', playlistId: '' };
  var parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return result;
  }
  var host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'youtube.com' && host !== 'm.youtube.com' &&
      host !== 'youtube-nocookie.com' && host !== 'youtu.be') return result;

  result.videoId = parsed.searchParams.get('v') || '';
  var pathParts = parsed.pathname.split('/').filter(Boolean);
  if (!result.videoId && host === 'youtu.be') result.videoId = pathParts[0] || '';
  if (!result.videoId && (pathParts[0] === 'shorts' || pathParts[0] === 'embed')) {
    result.videoId = pathParts[1] || '';
  }
  result.playlistId = parsed.searchParams.get('list') || '';
  return result;
}

function getYouTubeThumbnailUrl(url) {
  var info = parseYouTubeUrl(url);
  if (!info.videoId) return '';
  return 'https://img.youtube.com/vi/' + encodeURIComponent(info.videoId) + '/hqdefault.jpg';
}

function getYouTubeEmbedUrl(url) {
  var info = parseYouTubeUrl(url);
  if (!info.videoId && !info.playlistId) return '';
  var embedPath = info.videoId ? '/embed/' + encodeURIComponent(info.videoId) : '/embed/videoseries';
  var params = [];
  if (info.playlistId) params.push('list=' + encodeURIComponent(info.playlistId));
  return 'https://www.youtube-nocookie.com' + embedPath +
    (params.length ? '?' + params.join('&') : '');
}

/**
 * Ищет SVG-иконку для соцсети по строке (label + url).
 * Возвращает HTML строку с <svg> или null для неизвестной площадки.
 */
function getSocialIconSvg(haystack) {
  var h = haystack.toLowerCase();
  var icons = {
    telegram: 'M21.7 3.3a1.3 1.3 0 0 0-1.4-.2L2.7 10.2a1.2 1.2 0 0 0 .1 2.3l4.5 1.5 1.7 5.1a1.2 1.2 0 0 0 2.1.4l2.5-3.1 4.5 3.3a1.3 1.3 0 0 0 2-.8l2.5-14.3a1.3 1.3 0 0 0-.9-1.3ZM9 13.5l8.8-6.1-6.7 7.7-.3 2.5-1.3-4.1-3.4-1.1 13.3-5.5L9 13.5Z',
    youtube: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z',
    twitch: 'M3.5 2h18v13.5H15v4.5l-4.5-4.5H7L3.5 12V2ZM7 5.5v6l2.5 2.5H13l3 3v-3h3V5.5H7Z'
  };

  for (var key in icons) {
    if (icons.hasOwnProperty(key) && h.indexOf(key) !== -1) {
      return '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="' + icons[key] + '"/></svg>';
    }
  }

  return null;
}

function createSocialLink(linkData) {
  var link = createElement('a', 'social-link');
  var label = String(linkData.label || '');
  var url = String(linkData.url || '');
  var combined = label + ' ' + url;

  var iconSvg = getSocialIconSvg(combined);
  if (iconSvg) {
    var icon = createElement('span', 'social-link__icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconSvg;
    link.appendChild(icon);
  }

  var labelSpan = createElement('span', 'social-link__label', label);
  link.appendChild(labelSpan);

  link.setAttribute('aria-label', label);
  link.title = label;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function buildClientContent(client) {
  clearNode(modalContent);

  var wrap = createElement('div', 'client');

  var avatar = createElement('img', 'client__avatar');
  avatar.alt = 'Аватар клиента ' + client.name;
  avatar.width = 128;
  avatar.height = 128;
  setAvatarFallback(avatar, client.avatar);

  var name = createElement('h3', 'client__name', client.name);
  name.id = 'client-modal-title';

  wrap.appendChild(avatar);
  wrap.appendChild(name);

  /* Работы */
  var worksTitle = createElement('h4', 'client__section-title', 'Выполненные работы');
  wrap.appendChild(worksTitle);

  var worksList = createElement('div', 'works-list');
  client.works.forEach(function (work) {
    var workCard = createElement('article', 'work-card');

    var headRow = createElement('div', 'work-card__head');
    var titleLink = createElement('a', 'work-card__title', work.title);
    titleLink.href = work.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    headRow.appendChild(titleLink);

    // Рядом с названием плейлиста показываем количество роликов.
    // Если ролик всего один — бейдж не показываем.
    if (isVideoWork(work)) {
      var clipCount = getWorkClipCount(work);
      if (clipCount > 1) {
        var clipBadge = createElement('span', 'work-card__count',
          clipCount + ' ' + pluralizeClips(clipCount));
        headRow.appendChild(clipBadge);
      }
    }
    workCard.appendChild(headRow);

    var thumbUrl = getYouTubeThumbnailUrl(work.url);
    if (thumbUrl) {
      var previewLink = createElement('a', 'work-card__preview-link');
      previewLink.href = work.url;
      previewLink.target = '_blank';
      previewLink.rel = 'noopener noreferrer';
      previewLink.setAttribute('aria-label', 'Открыть видео: ' + work.title);

      var thumbImg = createElement('img', 'work-card__thumb');
      thumbImg.src = thumbUrl;
      thumbImg.alt = '';
      thumbImg.setAttribute('loading', 'lazy');
      thumbImg.width = 320;
      thumbImg.height = 180;
      thumbImg.addEventListener('error', function () {
        // Если миниатюра не загрузилась, скрываем блок предпросмотра
        previewLink.hidden = true;
      }, { once: true });

      var playIcon = createElement('span', 'work-card__play');
      playIcon.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

      previewLink.appendChild(thumbImg);
      previewLink.appendChild(playIcon);
      workCard.appendChild(previewLink);
    }

    worksList.appendChild(workCard);
  });
  wrap.appendChild(worksList);

  /* Количество работ клиента (с дедупликацией видео между плейлистами) */
  var orders = createElement('p', 'client__orders');
  orders.appendChild(document.createTextNode('Общее количество работ: '));
  var ordersStrong = createElement('strong', null, String(clientWorkCount(client)));
  orders.appendChild(ordersStrong);
  wrap.appendChild(orders);

  /* Ссылки */
  if (client.links && client.links.length) {
    wrap.appendChild(createElement('h4', 'client__section-title', 'Ссылки'));
    var linksRow = createElement('div', 'client__links');
    client.links.forEach(function (linkData) {
      linksRow.appendChild(createSocialLink(linkData));
    });
    wrap.appendChild(linksRow);
  }

  modalContent.appendChild(wrap);
}

function openClientModal(clientId) {
  var client = findClient(clientId);
  if (!client) return;
  if (cartOpen) closeCart();

  buildClientContent(client);
  modalOpen = true;
  modalEl.hidden = false;
  requestAnimationFrame(function () {
    modalEl.classList.add('is-open');
  });
  syncOverlay();
  lastFocused = document.activeElement;
  if (modalCloseBtn) modalCloseBtn.focus();
}

function closeClientModal() {
  if (!modalOpen) return;
  modalOpen = false;
  modalEl.classList.remove('is-open');
  setTimeout(function () {
    if (!modalOpen) modalEl.hidden = true;
  }, 250);
  syncOverlay();
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
}

/* =========================================================
 * Модальное окно услуги (открывается кнопкой услуги)
 * ========================================================= */

var serviceModalEl = null;
var serviceModalContent = null;
var serviceModalCloseBtn = null;
var serviceModalOpen = false;

/** Отрисовывает содержимое окна услуги: описание, цена, количество, «В корзину». */
function buildServiceContent(dept, service) {
  clearNode(serviceModalContent);

  var wrap = createElement('div', 'service-modal');

  var head = createElement('div', 'service-modal__head');
  var nameEl = createElement('h3', 'service-modal__name', service.name);
  nameEl.id = 'service-modal-title';
  head.appendChild(nameEl);
  var priceTag = createElement('span', 'service-modal__price',
    (dept.priceFrom ? 'от ' : '') + formatPrice(service.price) +
    (service.priceFixed ? ' · фиксированная цена' : ' · за единицу'));
  head.appendChild(priceTag);
  wrap.appendChild(head);

  wrap.appendChild(createElement('p', 'service-modal__desc', service.description));

  // Текущее количество в общей корзине (если услугу уже добавили).
  var inCart = 0;
  Cart.getItems().forEach(function (item) {
    if (item.deptId === dept.id && item.serviceId === service.id) inCart = item.qty;
  });
  if (inCart > 0) {
    var inCartNote = createElement('p', 'service-modal__incart');
    inCartNote.textContent = 'Уже в корзине: ' + inCart + ' шт.';
    wrap.appendChild(inCartNote);
  }

  var controls = createElement('div', 'service-modal__controls');

  var qtyBox = createElement('div', 'qty');
  var decBtn = createElement('button', 'qty__btn');
  decBtn.type = 'button';
  decBtn.setAttribute('data-svc-act', 'dec');
  decBtn.setAttribute('aria-label', 'Уменьшить количество');
  decBtn.textContent = '−';

  var qtyValue = createElement('span', 'qty__value', '1');
  qtyValue.setAttribute('data-role', 'qty');

  var incBtn = createElement('button', 'qty__btn');
  incBtn.type = 'button';
  incBtn.setAttribute('data-svc-act', 'inc');
  incBtn.setAttribute('aria-label', 'Увеличить количество');
  incBtn.textContent = '+';

  qtyBox.appendChild(decBtn);
  qtyBox.appendChild(qtyValue);
  qtyBox.appendChild(incBtn);

  var addBtn = createElement('button', 'btn btn--primary', 'В корзину');
  addBtn.type = 'button';
  addBtn.setAttribute('data-svc-act', 'add');

  controls.appendChild(qtyBox);
  controls.appendChild(addBtn);
  wrap.appendChild(controls);

  var state = { qty: 1 };

  controls.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-svc-act]');
    if (!btn || !controls.contains(btn)) return;
    var act = btn.getAttribute('data-svc-act');

    if (act === 'inc') {
      state.qty = Math.min(999, state.qty + 1);
    } else if (act === 'dec') {
      state.qty = Math.max(1, state.qty - 1);
    } else if (act === 'add') {
      if (Cart.add(dept.id, service.id, state.qty)) {
        showToast('«' + service.name + '» — добавлено в корзину');
        state.qty = 1;
        buildServiceContent(dept, service);
        return;
      }
    }
    qtyValue.textContent = String(state.qty);
  });

  serviceModalContent.appendChild(wrap);
}

function openServiceModal(deptId, serviceId) {
  var dept = Cart.getDepartment(deptId);
  if (!dept) return;
  var service = Cart.getService(deptId, serviceId);
  if (!service) return;

  if (modalOpen) closeClientModal();
  if (cartOpen) closeCart();

  buildServiceContent(dept, service);
  serviceModalOpen = true;
  serviceModalEl.hidden = false;
  requestAnimationFrame(function () {
    serviceModalEl.classList.add('is-open');
  });
  syncOverlay();
  lastFocused = document.activeElement;
  if (serviceModalCloseBtn) serviceModalCloseBtn.focus();
}

function closeServiceModal() {
  if (!serviceModalOpen) return;
  serviceModalOpen = false;
  serviceModalEl.classList.remove('is-open');
  setTimeout(function () {
    if (!serviceModalOpen) serviceModalEl.hidden = true;
  }, 250);
  syncOverlay();
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
  }
}

/* =========================================================
 * Нижняя часть сайта
 * ========================================================= */

function renderFooter() {
  var info = document.getElementById('footer-info');
  var copy = document.getElementById('footer-copy');
  var madeBy = document.getElementById('footer-madeby');
  if (!info) return;

  clearNode(info);

  var footer = SITE_DATA.footer || {};
  var docs = footer.documents;

  /* Раздел «Документы»: реквизиты исполнителя. */
  if (docs) {
    var card = createElement('div', 'footer-block footer-docs');
    card.appendChild(createElement('h4', 'footer-block__title', docs.title));

    var list = createElement('dl', 'footer-docs__list');
    function addRow(term, value) {
      var dt = createElement('dt', 'footer-docs__term', term);
      var dd = createElement('dd', 'footer-docs__value', value);
      list.appendChild(dt);
      list.appendChild(dd);
    }
    addRow('ФИО исполнителя', docs.fullName);
    addRow('ИНН', docs.inn);
    if (docs.email) {
      var mailLink = createElement('a', 'footer-docs__value');
      mailLink.href = 'mailto:' + docs.email;
      mailLink.textContent = docs.email;
      list.appendChild(createElement('dt', 'footer-docs__term', 'Электронная почта'));
      list.appendChild(mailLink);
    }
    addRow('Режим ответа на обращения', docs.responseTime);
    card.appendChild(list);

    /* Кнопки-ссылки на документы. */
    if (footer.documentLinks && footer.documentLinks.length) {
      var linksRow = createElement('div', 'footer-docs__links');
      footer.documentLinks.forEach(function (docLink) {
        var a = createElement('a', 'btn btn--small', docLink.label);
        var href = SITE_DATA.links && docLink.url in SITE_DATA.links
          ? SITE_DATA.links[docLink.url]
          : (docLink.url || '#');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        linksRow.appendChild(a);
      });
      card.appendChild(linksRow);
    }

    info.appendChild(card);
  }

  if (madeBy) madeBy.textContent = footer.madeBy || '';
  if (copy) copy.textContent = footer.copyright || '';
}

/* =========================================================
 * Инициализация
 * ========================================================= */

/** Проставляет ссылку на документ для чекбокса согласия. */
function wireConsentLink(checkboxId, linkKey) {
  var box = document.getElementById(checkboxId);
  if (!box || !box.parentElement) return;
  var link = box.parentElement.querySelector('a');
  if (link && SITE_DATA.links && SITE_DATA.links[linkKey]) {
    link.href = SITE_DATA.links[linkKey];
  }
}

function initApp() {
  /* Элементы */
  navTabsEl = document.getElementById('nav-tabs');
  panelsEl = document.getElementById('panels');
  backdropEl = document.getElementById('backdrop');
  cartDrawer = document.getElementById('cart-drawer');
  cartBody = document.getElementById('cart-body');
  cartFooter = document.getElementById('cart-footer');
  cartTotalValue = document.getElementById('cart-total-value');
  cartBadge = document.getElementById('cart-badge');
  cartButton = document.getElementById('cart-button');
  cartCloseBtn = document.getElementById('cart-close');
  checkoutBtn = document.getElementById('checkout-button');
  modalEl = document.getElementById('client-modal');
  modalContent = document.getElementById('modal-content');
  modalCloseBtn = document.getElementById('modal-close');
  serviceModalEl = document.getElementById('service-modal');
  serviceModalContent = document.getElementById('service-modal-content');
  serviceModalCloseBtn = document.getElementById('service-modal-close');

  if (!navTabsEl || !panelsEl || !cartDrawer || !modalEl || !serviceModalEl) {
    console.error('Vtube Community: не найдены обязательные элементы разметки.');
    return;
  }

  /* Шапка: название -> Telegram */
  var brandLink = document.getElementById('brand-link');
  if (brandLink) brandLink.href = SITE_DATA.links.telegram;

  /* Ссылки согласий на документы (оферта / политика). */
  wireConsentLink('consent-pd', 'privacy');
  wireConsentLink('consent-offer', 'offer');

  /* Разделы */
  buildNav();
  buildPanels();

  var hash = String(window.location.hash || '').replace(/^#/, '');
  activateSection(hash && panels[hash] ? hash : SITE_DATA.sections[0].id, false);

  window.addEventListener('hashchange', function () {
    var id = String(window.location.hash || '').replace(/^#/, '');
    if (id && panels[id]) activateSection(id, false);
  });

  /* Корзина */
  Cart.subscribe(renderCart);
  renderCart();

  cartButton.addEventListener('click', function () {
    if (cartOpen) {
      closeCart();
    } else {
      openCart();
    }
  });
  cartCloseBtn.addEventListener('click', closeCart);
  checkoutBtn.addEventListener('click', checkout);
  var cartClearBtn = document.getElementById('cart-clear');
  if (cartClearBtn) {
    cartClearBtn.addEventListener('click', function () {
      Cart.clear();
      showToast('Корзина очищена');
    });
  }

  cartBody.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn || !cartBody.contains(btn)) return;
    var deptId = btn.getAttribute('data-dept');
    var serviceId = btn.getAttribute('data-service');
    var act = btn.getAttribute('data-act');

    if (act === 'inc') {
      Cart.changeQty(deptId, serviceId, 1);
    } else if (act === 'dec') {
      Cart.changeQty(deptId, serviceId, -1);
    } else if (act === 'remove') {
      var service = Cart.getService(deptId, serviceId);
      Cart.remove(deptId, serviceId);
      if (service) showToast('«' + service.name + '» — удалено из корзины');
    }
  });

  /* Модальное окно клиента */
  modalCloseBtn.addEventListener('click', closeClientModal);

  /* Модальное окно услуги */
  if (serviceModalCloseBtn) {
    serviceModalCloseBtn.addEventListener('click', closeServiceModal);
  }

  /* Поля оформления: живое обновление предпросмотра сообщения */
  ['order-name', 'order-contact', 'order-viewers', 'order-bot-hosting'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateOrderPreview);
      el.addEventListener('change', updateOrderPreview);
    }
  });

  /* Общий фон закрывает верхнее открытое окно */
  backdropEl.addEventListener('click', function () {
    if (serviceModalOpen) {
      closeServiceModal();
    } else if (modalOpen) {
      closeClientModal();
    } else if (cartOpen) {
      closeCart();
    }
  });

  /* Escape */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (serviceModalOpen) {
      closeServiceModal();
    } else if (modalOpen) {
      closeClientModal();
    } else if (cartOpen) {
      closeCart();
    }
  });

  /* Нижняя часть */
  renderFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

