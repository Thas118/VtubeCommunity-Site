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
    siteUrl: '',
    // TODO: заменить на реальные ссылки на документы (оферта и политика).
    offer: '#',
    privacy: '#'
  },

  /**
   * Порядок вкладок навигации.
   * type: 'department' — панель строится из departments (услуги + калькулятор),
   *       иначе — статическая панель ('portfolio' | 'about' | 'team' | 'promo' | 'howto').
   * Новый отдел: добавьте запись сюда + объект в departments — корзина заработает сама.
   */
  sections: [
    { id: 'editing', label: 'Отдел монтажа', type: 'department' },
    { id: 'programming', label: 'Отдел программирования', type: 'department' },
    { id: 'portfolio', label: 'Портфолио', type: 'portfolio' },
    { id: 'team', label: 'Наши исполнители', type: 'team' },
    { id: 'promo', label: 'Акции', type: 'promo' },
    { id: 'howto', label: 'Как заказать', type: 'howto' },
    { id: 'about', label: 'Подробнее', type: 'about' }
  ],

  /**
   * Отделы и услуги.
   * Добавьте услуги: id (уникален внутри отдела), name, description, price (число, ₽ за единицу),
   * optional priceFixed — цена фиксированная и не зависит от количества,
   * optional priceFrom — показывать цену как «от N ₽» (для отделов со стартовой ценой).
   * Услуги внутри отдела автоматически сортируются по возрастанию цены.
   */
  departments: [
    {
      id: 'editing',
      title: 'Отдел монтажа',
      description: 'Монтаж, нарезка и обработка видео под ключ.',
      // Цены отдела монтажа отображаются в формате «от N ₽».
      priceFrom: true,
      services: [
        {
          id: 'shorts',
          name: 'Shorts',
          description: 'Короткий вертикальный ролик до 60 секунд: динамичный монтаж, титры, эффекты и звук. Идеально для TikTok, YouTube Shorts и Reels.',
          price: 500,
          priceFixed: true
        },
        {
          id: 'edit',
          name: 'Эдит',
          description: 'Полноценный эдит с эффектами, переходами, цветокоррекцией и работой со звуком. Подходит для оформления лучших моментов стрима.',
          price: 750
        },
        {
          id: 'narrezka',
          name: 'Нарезка',
          description: 'Нарезка видео или полного стрима на готовые клипы. Сохраняем ключевые моменты, добавляем титры и превью для каждой нарезки.',
          price: 2000
        }
      ]
    },
    {
      id: 'programming',
      title: 'Отдел программирования',
      description: 'Разработка сайтов, ботов и Telegram-инструментов.',
      services: [
        {
          id: 'tgbp',
          name: 'Telegram бот-предложка',
          description: 'Бот-предложка для приёма идей, предложений и обратной связи от зрителей. Настройка сценариев, модерация сообщений и пересылка в нужный чат.',
          price: 3000
        },
        {
          id: 'site',
          name: 'Разработка сайта',
          description: 'Лендинг или многостраничный сайт «под ключ»: адаптивная вёрстка, современный дизайн и подключение к домену.',
          price: 5000
        },
        {
          id: 'bot',
          name: 'Телеграм-бот на заказ',
          description: 'Индивидуальный Telegram-бот любой сложности: приём заявок, рассылки, интеграции с внешними сервисами и хостинг.',
          price: 4000
        }
      ]
    }
  ],

  /**
   * Портфолио. Новый клиент = новый объект в массиве.
   * client: id, name, avatar, works[{ title, url, videos?[], count? }], links[{ label, url }]
   *
   * Подсчёт видео:
   *  - work.videos — массив ID видео плейлиста; количество роликов = videos.length.
   *  - одиночное видео без videos считается как 1 ролик (по ссылке).
   *  - work.count — запасной вариант, если ID видео неизвестны (только для показа).
   * Общее число работ и число роликов пересчитываются автоматически,
   * одинаковые видео в разных плейлистах не удваиваются (дедуп по ID).
   */
  portfolio: [
    //{ -------------------------------------------<ШАБЛОН>-------------------------------------------------------------------
      //id: '',
      //name: '',
      //// Замените путь на файл клиента в формате JPG, PNG или другом формате изображений.
      //avatar: 'assets/portfolio/aleriaVT/aleriaVT.png',
      //works: [
        //{
          //title: 'Серия нарезок по ...',
          //url: 'https://www.youtube.com/playlist?list=...',
          //// TODO: перечислите ID видео плейлиста — количество посчитается автоматически.
          //videos: ['id1', 'id2', 'id3']
        //}
      //],
      //links: [
        //// TODO: реальные ссылки клиента.
        //{ label: 'Telegram', url: 'https://t.me/...' },
        //{ label: 'YouTube', url: 'https://www.youtube.com/@...' }
      //]
    //} -------------------------------------------<ШАБЛОН>-------------------------------------------------------------------
    {
      id: 'hinamouse',
      name: 'HinaMouse',
      avatar: 'assets/portfolio/hinamouse/hinamouse.png',
      works: [
        {
          title: 'Серия нарезок по Creepy Support',
          url: 'https://www.youtube.com/watch?v=-k8UnKfmboM&list=PLRbM4003x3_I&pp=0gcJCbwFa94AFGB0',
          // TODO: замените на реальные ID видео плейлиста. Сейчас 6 заглушек под пример «6 роликов».
          videos: ['-k8UnKfmboM', 'creepy2', 'creepy3', 'creepy4', 'creepy5', 'creepy6']
        },
        {
          title: 'Серия нарезок по Photomaly',
          url: 'https://www.youtube.com/watch?v=UfKHz38vi24&list=PLQIzcRtjRfp4',
          // TODO: замените на реальные ID видео плейлиста.
          videos: ['UfKHz38vi24', 'photo2', 'photo3', 'photo4']
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
    },
    {
      id: 'baltichka_chan',
      name: 'baltichka_chan',
      avatar: 'assets/portfolio/baltichka_chan/baltichka_chan.png',
      works: [
        {
          title: 'Нашла ЛУЧШИЙ способ лечить менталочку Аме 💀 #реакция #needystreameroverload',
          url: 'https://youtube.com/shorts/2gtvXd4HIeo?si=K6pKk9t44IbZbIuz'
        },
        {
          title: 'Свидание в Тяндер с макакой 🦍 #реакция #needystreameroverload',
          url: 'https://youtube.com/shorts/sz6mhphiu_c?si=FAQZEHwfC5DqY0SN'
        }
      ],
      links: [
        { label: 'Twitch', url: 'https://www.twitch.tv/aleriavt' },
        { label: 'YouTube', url: 'https://www.youtube.com/@AleriaVT' },
        { label: 'Telegram', url: 'https://t.me/aleria_vtuber' }
      ]
    }
  ],

  /** Раздел «Подробнее». */
  about: {
    title: 'Подробнее',
    paragraphs: [
    ''
    ],
    ctaLabel: 'Перейти в Telegram'
  },

  /** Раздел «Акции» — заглушка до появления актуальных предложений. */
  promo: {
    title: 'Акции',
    badge: 'Скоро',
    text: 'Здесь появятся акции и специальные предложения для наших клиентов.'
  },

  /** Раздел «Как заказать». */
  howto: {
    title: 'Как заказать',
    paragraphs: [
      'Услуги оказывает самозанятый ПЛЮЩАВЫЙ ХУЕСОС под обозначением Vtube Community. С порядком оформления заказа можно ознакомиться во вкладке „Как заказать“. Оформление заказа и оплата происходят через личные сообщения в нашем Telegram-канале'
    ],
    ctaLabel: 'Перейти в Telegram'
  },

  /** Раздел «Наши исполнители» — заглушка до полного каталога. */
  team: {
    title: 'Наши исполнители',
    badge: 'В разработке',
    text: 'Каталог исполнителей сообщества скоро появится здесь.'
  },

  /** Нижняя часть сайта — документы, контакты исполнителя и подпись автора. */
  footer: {
    // TODO: заполнить по факту (ФИО, ИНН, e-mail, ссылки на оферту и политику).
    documents: {
      title: 'Документы',
      fullName: '[ПЛЮЩ]',
      inn: '[ИНН]',
      email: '[EMAIL]',
      responseTime: 'Режим ответа на обращения: с 08:00 до 22:00'
    },
    documentLinks: [
      { label: 'Оферта', url: 'offer' },
      { label: 'Политика персональных данных', url: 'privacy' }
    ],
    madeBy: 'made by Thas118',
    copyright: 'Vtube Community'
  }
};
