/**
 * Vtube Community — все данные сайта в одном месте.
 *
 * Чтобы изменить прайс, услуги, портфолио, ссылки или тексты,
 * достаточно отредактировать этот файл — логику сайта трогать не нужно.
 *
 * ВАЖНО: значения, помеченные "TODO", нужно заменить на финальные
 * (цены из прайса, реальные ссылки Telegram/YouTube и т.д.).
 */
'use strict';

var SITE_DATA = {
  /** Ссылки сайта. Меняются в одном месте. */
  links: {
    // TODO: заменить на реальную ссылку сообщества в Telegram.
    telegram: 'https://t.me/Vtubecommunepohui',
    // Шаблон официального Telegram Share — открывает Telegram с готовым текстом.
    telegramShare: 'https://t.me/Vtubecommunepohui?direct',
    // Адрес самого сайта (подставляется в Telegram Share). После деплоя заполнить.
    siteUrl: ''
  },

  /**
   * Порядок вкладок навигации.
   * type: 'department' — панель строится из departments (услуги + калькулятор),
   *       иначе — статическая панель ('portfolio' | 'about' | 'team').
   * Новый отдел: добавьте запись сюда + объект в departments — корзина заработает сама.
   */
  sections: [
    { id: 'editing', label: 'Отдел монтажа', type: 'department' },
    { id: 'programming', label: 'Отдел программирования', type: 'department' },
    { id: 'portfolio', label: 'Портфолио', type: 'portfolio' },
    { id: 'team', label: 'Наши исполнители', type: 'team' },
    { id: 'about', label: 'Подробнее', type: 'about' }
  ],

  /**
   * Отделы и услуги.
   * Добавьте услуги в пустой массив: id (уникален внутри отдела), name, description, price (число, ₽ за единицу),
   * optional priceFixed — пометка, что цена фиксированная и не зависит от количества.
   */
  departments: [
    {
      id: 'editing',
      title: 'Отдел монтажа',
      description: 'Монтаж, нарезка и обработка видео под ключ.',
      services: [
        { id: 'shorts', name: 'Shorts', description: 'Короткий вертикальный ролик до 60 секунд', price: 500, priceFixed: true },
        { id: 'narrezka', name: 'Нарезка', description: 'Нарезка видео любой длины', price: 2000 },
        { id: 'edit', name: 'Эдит', description: 'Полноценный монтаж с эффектами', price: 750 }
      ]
    },
    {
      id: 'programming',
      title: 'Отдел программирования',
      description: 'Разработка сайтов, ботов и Telegram-инструментов.',
      services: [
        { id: 'tgbp', name: 'Telegram бот-предложка', description: 'Telegram бот-предложка', price: 3000 }
      ]
    }
  ],

  /**
   * Портфолио. Новый клиент = новый объект в массиве.
   * client: id, name, avatar, works[{ title, url }], links[{ label, url }]
   */
  portfolio: [
    //{ -------------------------------------------<ШАБЛОН>-------------------------------------------------------------------
      //id: '',
      //name: '',
      //// Замените путь на файл клиента в формате JPG, PNG или другом формате изображений.
      //avatar: 'assets/portfolio/aleriaVT/aleriaVT.png',
      //works: [
        //{
          //title: 'Серия нарезок по Creepy Support',
          //// TODO: ссылка на плейлист/видео.
          //url: 'https://www.youtube.com/watch?v=-k8UnKfmboM&list=PLRbM4003x3_I&pp=0gcJCbwFa94AFGB0'
        //},
        //{
          //title: 'Серия нарезок по Photomaly',
          //// TODO: ссылка на плейлист/видео.
          //url: 'https://www.youtube.com/watch?v=UfKHz38vi24&list=PLQIzcRtjRfp4'
        //}
      //],
      //links: [
        //// TODO: реальные ссылки клиента.
        //{ label: 'Telegram', url: 'https://t.me/aleria_vtuber' },
        //{ label: 'YouTube', url: 'https://www.youtube.com/@hinamouse' }
      //]
    //} -------------------------------------------<ШАБЛОН>-------------------------------------------------------------------
    {
      id: 'hinamouse',
      name: 'HinaMouse',
      avatar: 'assets/portfolio/hinamouse/hinamouse.png',
      works: [
        {
          title: 'Серия нарезок по Creepy Support',
          url: 'https://www.youtube.com/watch?v=-k8UnKfmboM&list=PLRbM4003x3_I&pp=0gcJCbwFa94AFGB0'
        },
        {
          title: 'Серия нарезок по Photomaly',
          url: 'https://www.youtube.com/watch?v=UfKHz38vi24&list=PLQIzcRtjRfp4'
        },
        {
          title: 'ТГ-бот предложка',
          url: '@chmouse_118bot'
        }
      ],
      links: [
        { label: 'Twitch', url: 'https://www.twitch.tv/hinamouse' },
        { label: 'YouTube', url: 'https://www.youtube.com/@hinamouse' },
        { label: 'Telegram', url: 'https://t.me/hinamouse' }
      ]
    },
    {
      id: 'aleriaVT',
      name: 'aleriaVT',
      avatar: 'assets/portfolio/aleriaVT/aleriaVT.png',
      works: [
        {
          title: 'Получаем по башке от всех | DmC: Devil May Cry',
          url: 'https://youtube.com/watch?v=nZxH8Y_ersM'
        }
      ],
      links: [
        { label: 'Twitch', url: 'https://www.twitch.tv/aleriavt' },
        { label: 'YouTube', url: 'https://www.youtube.com/@AleriaVT' },
        { label: 'Telegram', url: 'https://t.me/aleria_vtuber' }
      ]
    }
  ],

  /** Раздел «Подробнее». Текст предварительный — заменить по финальной редакции. */
  about: {
    title: 'Подробнее',
    paragraphs: [
    '💟 Привет Друзья!',
    'Vtube community - это объединение талантливых исполнителей по всевозможным услугам, которые могут понадобиться прекрасным втуберам!💕'

    ],
    ctaLabel: 'Перейти в Telegram'
  },

  /** Раздел «Наши исполнители» — заглушка до полного каталога. */
  team: {
    title: 'Наши исполнители',
    badge: 'В разработке',
    text: 'Каталог исполнителей сообщества скоро появится здесь.'
  },

  /** Нижняя часть сайта — место под документы и дополнительную информацию. */
  footer: {
    // TODO: заполнить по факту (оферта, политика конфиденциальности, контакты).
    blocks: [
      {
        title: 'Документы и информация',
        text: 'Create by Писяки Мусисяки'
      }
    ],
    copyright: '© Vtube Community'
  }
};
