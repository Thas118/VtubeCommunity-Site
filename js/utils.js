/**
 * Vtube Community — общие утилиты (форматирование, DOM, буфер обмена).
 * Без внешних зависимостей.
 */
'use strict';

/** Форматирование числа как цены: 1500 -> "1 500 ₽". */
function formatPrice(value) {
  var amount = Number(value);
  if (!isFinite(amount)) amount = 0;
  var formatted;
  try {
    formatted = amount.toLocaleString('ru-RU');
  } catch (e) {
    formatted = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return formatted + ' ₽';
}

/** Экранирование строки для безопасной вставки в HTML (если нужен шаблон). */
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Создание DOM-элемента: createElement('div', 'cls', 'текст'). */
function createElement(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Удалить всех дочерних узлов. */
function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Целое число >= min (защита от мусора в localStorage). */
function toPositiveInt(value, min) {
  var n = parseInt(value, 10);
  if (!isFinite(n)) n = min;
  return n < min ? min : n;
}

/** Копирование текста в буфер обмена. Возвращает Promise<boolean>. */
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(
      function () { return true; },
      function () { return fallbackCopy(text); }
    );
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  try {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (e) {
    return false;
  }
}

/* ---------- Уведомления (тосты) ---------- */

var toastTimer = null;
var toastHideTimer = null;

/** Показать короткое уведомление внизу экрана. */
function showToast(message) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  // Двойной requestAnimationFrame — чтобы браузер успел применить hidden.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('is-show');
    });
  });
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('is-show');
    toastHideTimer = setTimeout(function () {
      toast.hidden = true;
    }, 250);
  }, 2800);
}

