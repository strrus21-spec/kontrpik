// Все строки интерфейса. Каждая новая строка добавляется сразу в оба словаря.
export type Lang = 'ru' | 'en';

const fmtDate = (lang: Lang, t: number, year: boolean) =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(t * 1000).replace(/\s*г\.$/, '');

/** «31 октября – 2 ноября 2026» / «October 31 – November 2, 2026» (секунды Unix). */
export function dateRange(lang: Lang, from: number, to: number): string {
  const sameYear = new Date(from * 1000).getUTCFullYear() === new Date(to * 1000).getUTCFullYear();
  return `${fmtDate(lang, from, !sameYear)} – ${fmtDate(lang, to, true)}`;
}
export const dateOne = (lang: Lang, t: number) => fmtDate(lang, t, true);

/** Русское склонение: 1 игра, 2 игры, 5 игр. */
export function plural(n: number, forms: [string, string, string], lang: Lang = 'ru'): string {
  if (lang !== 'ru') return forms[n === 1 ? 0 : 2];
  const m10 = n % 10, m100 = n % 100;
  return forms[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2];
}

const ru = {
  attr: { str: 'Сила', agi: 'Ловкость', int: 'Интеллект', all: 'Универсальный' },
  role: { Carry: 'Керри', Support: 'Саппорт', Nuker: 'Нюкер', Disabler: 'Контроль', Initiator: 'Инициатор', Durable: 'Танк', Escape: 'Побег', Pusher: 'Пушер' } as Record<string, string>,
  src: { all: 'Паблик · все ранги', low: 'Паблик · Рекрут–Герой', mid: 'Паблик · Легенда–Властелин', high: 'Паблик · Божество–Титан', pro: 'Про-сцена' },
  posn: { 1: 'Керри', 2: 'Мид', 3: 'Офлейн', 4: 'Саппорт', 5: 'Полный саппорт' } as Record<number, string>,
  tcat: { line: 'Линия', farm: 'Фарм', map: 'Карта', control: 'Управление', items: 'Предметы', heroes: 'Против героев', draft: 'Драфт' } as Record<string, string>,
  tlvl: { 1: 'Новичок', 2: 'Средний', 3: 'Продвинутый' } as Record<string, string>,
  troles: { 'Керри': 'Керри', 'Саппорт': 'Саппорт', 'Мид': 'Мид', 'Офлейн': 'Офлейн' } as Record<string, string>,
  remove: 'Убрать', you: 'Ты', youTag: 'ТЫ', empty: 'пусто', noBans: 'нет банов',
  noHero: 'Такого героя нет. Попробуй английское имя или прозвище, например «Pudge» или «пудж».',
  legend: (a: boolean) => `Число у героя показывает, на сколько процентов чаще он выигрывает против этого пика${a ? ' и с твоими союзниками' : ''}, чем обычно. Больше 3 — хороший выбор.`,
  notePro: (date: string) => `Про-сцена: матчапы из профессиональных матчей OpenDota, выгружены ${date}. Выборки маленькие (в среднем около 40 игр на пару), поэтому синергия здесь не считается, а редкие пары показаны бледнее.`,
  notePub: (g: string, range: string) => `Паблик: ${g} рейтинговых матчей из OpenDota за ${range}. Преимущество — насколько пара выигрывает чаще, чем ожидалось бы по общим винрейтам двух героев. Малые выборки сглажены.`,
  notePos: ' Позиции героев определены по про-матчам за последние полгода: по линии и золоту внутри линии. В пабликах героев иногда играют иначе.',
  noPick: 'Отметь вражеских героев слева (или своих союзников), и здесь появятся лучшие пики.',
  games: 'игр', pairWr: 'винрейт пары',
  vs: 'против ', with: 'вместе с ', and: ' и ', strongest: 'Сильнее всего ', alsoJoin: ', а также ', even: 'Ровно против всего пика', careful: '. Осторожно с ',
  verdict: ['Отличный выбор', 'Хороший выбор', 'Нормально', 'Не советую'], place: (n: number) => `${n} место`,
  vsEnemies: 'Против врагов', withAllies: 'С союзниками', take: 'Беру его', more: 'Ещё варианты',
  bansH: 'Кого банить', bansS: 'Эти герои сильнее всего против твоей команды', bansT: 'Сильнее всего против', bansN: 'Нажми на героя, чтобы отметить его как бан.',
  anyPos: 'Любая позиция', allRoles: 'Все роли', tipOfDay: '★ Фишка дня', of: ' из ',
  learned: (k: number, n: number) => `Изучено ${k} из ${n}`, learnHint: 'Отмечай фишки, которые уже знаешь, и следи за прогрессом',
  noTips: 'Ничего не нашлось. Сбрось фильтры или измени запрос.', known: 'Знаю', allCats: 'Все', anyLvl: 'Любой уровень',
  vsTipsH: 'Как играть против этого пика', allTips: 'Все фишки',
  loading: 'Загружаю статистику…', loadError: 'Не удалось загрузить статистику. Проверь интернет и обнови страницу.',
  // этап 2: мои герои
  medals: ['Рекрут', 'Страж', 'Рыцарь', 'Герой', 'Легенда', 'Властелин', 'Божество', 'Титан'],
  meH: 'Мои герои', meS: 'Рекомендации из героев, на которых ты играешь',
  meLoad: 'Загрузить', meLoading: 'Загружаю профиль…', meChange: 'Сменить', meForget: 'Забыть профиль',
  meHint: 'Нет ID под рукой? Отметь своих героев звёздочкой: режим «★ Мои» в списке героев.',
  meClosed: 'Профиль закрыт. Включи в Dota: Настройки → Общедоступная история матчей, подожди пару минут и попробуй снова.',
  meNotFound: 'Игрок не найден. Проверь ID.',
  meBad: 'Не понимаю этот ID. Вставь число из профиля Dotabuff или OpenDota, Steam ID или ссылку на профиль.',
  meVanity: 'Короткие ссылки Steam (/id/имя) не подходят. Открой свой профиль на Dotabuff и вставь ссылку оттуда.',
  meNet: 'OpenDota не отвечает. Попробуй через минуту.',
  meOnly: 'Только мои герои', meNoRank: 'без ранга',
  mePool: (n: number) => `В пуле ${n} ${plural(n, ['герой', 'героя', 'героев'], 'ru')}: от 5 игр за 90 дней и отмеченные ★`,
  meEmpty: 'Твой пул пуст. Введи Steam ID или отметь героев звёздочкой.',
  meNoFit: 'Из твоего пула никто не подходит под фильтр. Сними фильтр позиции или добавь героев.',
  meGames: (g: number, w: number) => `у тебя ${g} ${plural(g, ['игра', 'игры', 'игр'], 'ru')}, винрейт ${w}%`,
  meStar: 'отмечен ★', meBonus: (b: string) => `${b} за личный винрейт`,
  starOn: 'Отметить своим', starOff: 'Убрать из своих',
  // что купить
  buyH: 'Что купить против этого пика', buyCore: 'для керри, мида и офлейна', buySup: 'для саппорта',
  buyNone: 'Для этих героев особых предметов не нужно.',
  threat: {
    evasion: 'уклонение', invis: 'невидимость', illusions: 'иллюзии', heal: 'сильное лечение', magic_burst: 'много магического урона',
    silence: 'немота', disable_heavy: 'сильный контроль', physical_burst: 'быстрый урон атаками', passive_break: 'сильные пассивки',
    summons: 'призванные юниты', mana_burn: 'сжигание маны', pierce_bkb: 'ульта сквозь BKB', lifesteal: 'вампиризм', push: 'быстрый пуш',
  } as Record<string, string>,
  threatSpecial: { 'Techies:invis': 'невидимые мины' } as Record<string, string>,
  buyReason: (heroes: string, what: string) => `у ${heroes} ${what}`,
  // этап 3: страница героя
  heroClose: 'Закрыть', heroPos: 'Позиции (про-матчи)', heroWr: 'Винрейт по рангам', heroBeats: 'Кого он контрит', heroLoses: 'Кто контрит его',
  heroWith: 'С кем лучше всего', heroTips: 'Фишки с этим героем', heroBuy: 'Что покупать против него', heroEnemy: 'Отметить врагом',
  heroSrc: (src: string) => `Матчапы: ${src}`, heroNoGames: 'нет игр', heroOpen: 'Открыть карточку героя',
  heroPoolTitle: 'Клик — в драфт. Правый клик или долгое нажатие — карточка героя.',
  heroNotFound: 'Такого героя нет.',
  // моя линия
  laneH: 'Твоя линия', laneVs: (names: string) => `против ${names}`, laneFor: (h: string) => `для ${h}`,
  laneLevel: { easy: 'лёгкая', mid: 'средняя', hard: 'тяжёлая' } as Record<string, string>,
  laneHint: {
    hardCore: 'Не спорь за каждого крипа: добивай под своей башней и держись за крипами.',
    hardSup: 'Если линия проигрывается, не стой в ней без дела: пулл и стак помогут керри.',
    hardMid: 'Отдай пару крипов, но не опыт. Зови помощь, когда появится руна.',
    easyCore: 'Линия твоя: забирай всех крипов и дави соперника, пока у него мало уровней.',
    easySup: 'Бей соперников каждый раз, когда они подходят добить крипа.',
    easyMid: 'Линия твоя: дави соперника, бери руны и иди помогать на соседние линии.',
    midCore: 'Ровная линия: решит добивание. Не выходи из-за крипов без нужды.',
    midSup: 'Ровная линия: поставь вард у реки, чтобы видеть ганки, и следи за пуллами.',
    midMid: 'Ровная линия: решат руны. Подходи к ним заранее.',
    startCore: 'Старт: Tango, Healing Salve, а ближнему бою ещё Quelling Blade.',
    startSup: 'Старт: Tango, Observer Ward и Healing Salve для своего керри.',
    startMid: 'Старт: Tango, Faerie Fire, а Bottle — как только хватит золота.',
    stick: 'Купи Magic Stick: {h} часто применяет способности, палка быстро копит заряды.',
    armor: 'Против {h} добавь в старт брони: Ring of Protection.',
    dust: 'Держи Dust of Appearance: {h} уходит в невидимость.',
    pudge: 'Стой за своими крипами: хук {h} цепляет первую цель.',
  } as Record<string, string>,
  // ссылка
  copyLink: 'Скопировать ссылку', copied: 'Ссылка скопирована', copyFail: 'Скопируй ссылку вручную:',
  st: {
    title: 'Контрпик Dota 2', h1a: 'Dota 2 ', h1b: 'помощник', sub: 'Подбор контрпика по статистике матчей и сборник фишек, которые помогают выигрывать.',
    nav1: 'Контрпик', nav2: 'Фишки', cpTitle: 'Контрпик', cpSub: 'Отметь врагов и союзников. Справа появятся герои, которые лучше всех играют против этого пика и сочетаются с твоей командой.',
    radiant: 'Силы Света', radiantSub: 'твоя команда', dire: 'Силы Тьмы', direSub: 'враги ', example: '· пример пика', bans: 'Баны', clear: 'Очистить',
    mEnemy: 'Враг', mAlly: 'Союзник', mBan: 'Бан', q: 'Поиск: пудж, фантомка, Invoker…', best: 'Лучшие пики',
    tipsTitle: 'Фишки', tipsSub: 'Короткие приёмы, которые знают не все. Метка 7.41 — про текущий патч.', tq: 'Найти фишку…', hideKnown: 'скрыть изученные',
    src1: 'Изменения патча: ', src2: 'официальные заметки 7.41', src3: '. Статистика: ',
    navLabel: 'Разделы', draftLabel: 'Драфт', heroesLabel: 'Герои', modeLabel: 'Куда добавлять героя', searchLabel: 'Поиск героя',
    resultsLabel: 'Рекомендации', srcLabel: 'Статистика', roleLabel: 'Фильтр по роли', posLabel: 'Позиция',
    tipsLabel: 'Фишки', catLabel: 'Тема', lvlLabel: 'Уровень', tqLabel: 'Поиск по фишкам',
    mStar: '★ Мои', meInput: 'Steam ID или ссылка на профиль Dotabuff, OpenDota или Steam', copyLink: 'Скопировать ссылку',
  } as Record<string, string>,
};

type Dict = typeof ru;

const en: Dict = {
  attr: { str: 'Strength', agi: 'Agility', int: 'Intelligence', all: 'Universal' },
  role: { Carry: 'Carry', Support: 'Support', Nuker: 'Nuker', Disabler: 'Disabler', Initiator: 'Initiator', Durable: 'Durable', Escape: 'Escape', Pusher: 'Pusher' },
  src: { all: 'Pubs · all ranks', low: 'Pubs · Herald–Archon', mid: 'Pubs · Legend–Ancient', high: 'Pubs · Divine–Immortal', pro: 'Pro scene' },
  posn: { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft support', 5: 'Hard support' },
  tcat: { line: 'Laning', farm: 'Farming', map: 'Map', control: 'Controls', items: 'Items', heroes: 'Vs heroes', draft: 'Draft' },
  tlvl: { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' },
  troles: { 'Керри': 'Carry', 'Саппорт': 'Support', 'Мид': 'Mid', 'Офлейн': 'Offlane' },
  remove: 'Remove', you: 'You', youTag: 'YOU', empty: 'empty', noBans: 'no bans',
  noHero: 'No such hero. Try the English name, for example “Pudge”.',
  legend: a => `The number shows how many percentage points more often the hero wins against this draft${a ? ' and with your allies' : ''} than usual. Above 3 is a good pick.`,
  notePro: date => `Pro scene: matchups from professional matches on OpenDota, pulled on ${date}. Samples are small (about 40 games per pair on average), so synergy is not counted here and rare pairs are shown faded.`,
  notePub: (g, range) => `Pubs: ${g} ranked matches from OpenDota, ${range}. Advantage means how much more often the pair wins than expected from the two heroes' overall win rates. Small samples are smoothed.`,
  notePos: ' Hero positions come from pro matches over the last six months, by lane and gold within the lane. Pub players sometimes play heroes differently.',
  noPick: 'Mark enemy heroes on the left (or your allies), and the best picks will appear here.',
  games: 'games', pairWr: 'pair win rate',
  vs: 'against ', with: 'with ', and: ' and ', strongest: 'Strongest ', alsoJoin: ', and also ', even: 'Even against the whole draft', careful: '. Careful with ',
  verdict: ['Great pick', 'Good pick', 'Okay', 'Not advised'], place: n => ['', '1st', '2nd', '3rd'][n] + ' place',
  vsEnemies: 'Against enemies', withAllies: 'With allies', take: 'Pick him', more: 'More options',
  bansH: 'Who to ban', bansS: 'These heroes are strongest against your team', bansT: 'Strongest against', bansN: 'Click a hero to mark it as banned.',
  anyPos: 'Any position', allRoles: 'All roles', tipOfDay: '★ Tip of the day', of: ' of ',
  learned: (k, n) => `Learned ${k} of ${n}`, learnHint: 'Mark the tips you already know and track your progress',
  noTips: 'Nothing found. Reset the filters or change the search.', known: 'Got it', allCats: 'All', anyLvl: 'Any level',
  vsTipsH: 'How to play against this draft', allTips: 'All tips',
  loading: 'Loading statistics…', loadError: 'Could not load the statistics. Check your connection and reload the page.',
  medals: ['Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'],
  meH: 'My heroes', meS: 'Recommendations from the heroes you actually play',
  meLoad: 'Load', meLoading: 'Loading profile…', meChange: 'Change', meForget: 'Forget profile',
  meHint: 'No ID at hand? Star your heroes: the “★ Mine” mode in the hero list.',
  meClosed: 'The profile is private. In Dota, turn on Settings → Expose Public Match Data, wait a couple of minutes and try again.',
  meNotFound: 'Player not found. Check the ID.',
  meBad: 'Can’t read this ID. Paste the number from your Dotabuff or OpenDota profile, a Steam ID or a profile link.',
  meVanity: 'Short Steam links (/id/name) won’t work. Open your Dotabuff profile and paste that link.',
  meNet: 'OpenDota is not responding. Try again in a minute.',
  meOnly: 'Only my heroes', meNoRank: 'unranked',
  mePool: n => `${n} ${n === 1 ? 'hero' : 'heroes'} in your pool: 5+ games in 90 days and ★ starred`,
  meEmpty: 'Your pool is empty. Enter your Steam ID or star some heroes.',
  meNoFit: 'No hero from your pool fits the filter. Clear the position filter or add heroes.',
  meGames: (g, w) => `you: ${g} ${g === 1 ? 'game' : 'games'}, ${w}% win rate`,
  meStar: '★ starred', meBonus: b => `${b} for your win rate`,
  starOn: 'Star as mine', starOff: 'Unstar',
  buyH: 'What to buy against this draft', buyCore: 'for carry, mid and offlane', buySup: 'for supports',
  buyNone: 'No special items needed against these heroes.',
  threat: {
    evasion: 'evasion', invis: 'invisibility', illusions: 'illusions', heal: 'strong healing', magic_burst: 'heavy magic damage',
    silence: 'silences', disable_heavy: 'heavy disables', physical_burst: 'fast physical damage', passive_break: 'strong passives',
    summons: 'summons', mana_burn: 'mana burn', pierce_bkb: 'an ultimate that goes through BKB', lifesteal: 'lifesteal', push: 'fast push',
  },
  threatSpecial: { 'Techies:invis': 'invisible mines' },
  buyReason: (heroes, what) => `${heroes}: ${what}`,
  heroClose: 'Close', heroPos: 'Positions (pro matches)', heroWr: 'Win rate by rank', heroBeats: 'Who he counters', heroLoses: 'Who counters him',
  heroWith: 'Best teammates', heroTips: 'Tips with this hero', heroBuy: 'What to buy against him', heroEnemy: 'Mark as enemy',
  heroSrc: src => `Matchups: ${src}`, heroNoGames: 'no games', heroOpen: 'Open hero card',
  heroPoolTitle: 'Click: add to draft. Right-click or long press: hero card.',
  heroNotFound: 'No such hero.',
  laneH: 'Your lane', laneVs: names => `against ${names}`, laneFor: h => `for ${h}`,
  laneLevel: { easy: 'easy', mid: 'even', hard: 'hard' },
  laneHint: {
    hardCore: 'Don’t fight for every creep: last-hit under your tower and stay behind your creeps.',
    hardSup: 'If the lane is lost, don’t idle in it: pulls and stacks will help your carry.',
    hardMid: 'Give up a couple of creeps but not the experience. Call for help when a rune spawns.',
    easyCore: 'Your lane: take every creep and push the opponent back while he’s low level.',
    easySup: 'Hit the opponents every time they step up to last-hit.',
    easyMid: 'Your lane: pressure, take the runes and go help the side lanes.',
    midCore: 'Even lane: last-hitting decides it. Don’t leave your creeps without a reason.',
    midSup: 'Even lane: ward the river to see ganks and watch the pull timings.',
    midMid: 'Even lane: runes decide it. Get to them early.',
    startCore: 'Start: Tango, Healing Salve, plus Quelling Blade for melee heroes.',
    startSup: 'Start: Tango, Observer Ward and a Healing Salve for your carry.',
    startMid: 'Start: Tango, Faerie Fire, and a Bottle as soon as you can afford it.',
    stick: 'Get a Magic Stick: {h} casts a lot, the stick charges fast.',
    armor: 'Against {h}, add armor to your start: Ring of Protection.',
    dust: 'Keep Dust of Appearance: {h} goes invisible.',
    pudge: 'Stay behind your creeps: {h}’s hook grabs the first target.',
  },
  copyLink: 'Copy link', copied: 'Link copied', copyFail: 'Copy the link manually:',
  st: {
    title: 'Dota 2 Counterpick', h1a: 'Dota 2 ', h1b: 'helper', sub: 'Counterpicks based on match statistics and a collection of tips that help you win.',
    nav1: 'Counterpick', nav2: 'Tips', cpTitle: 'Counterpick', cpSub: 'Mark enemies and allies. On the right you will see the heroes that do best against this draft and fit your team.',
    radiant: 'The Radiant', radiantSub: 'your team', dire: 'The Dire', direSub: 'enemies ', example: '· sample draft', bans: 'Bans', clear: 'Clear',
    mEnemy: 'Enemy', mAlly: 'Ally', mBan: 'Ban', q: 'Search: Pudge, Invoker…', best: 'Best picks',
    tipsTitle: 'Tips', tipsSub: 'Short tricks not everyone knows. The 7.41 tag means the current patch.', tq: 'Find a tip…', hideKnown: 'hide learned',
    src1: 'Patch changes: ', src2: 'official 7.41 notes', src3: '. Statistics: ',
    navLabel: 'Sections', draftLabel: 'Draft', heroesLabel: 'Heroes', modeLabel: 'Where to add the hero', searchLabel: 'Hero search',
    resultsLabel: 'Recommendations', srcLabel: 'Statistics', roleLabel: 'Role filter', posLabel: 'Position',
    tipsLabel: 'Tips', catLabel: 'Topic', lvlLabel: 'Level', tqLabel: 'Search tips',
    mStar: '★ Mine', meInput: 'Steam ID or a Dotabuff, OpenDota or Steam profile link', copyLink: 'Copy link',
  },
};

export const I18N: Record<Lang, Dict> = { ru, en };

const LANG_KEY = 'kontrpik-lang';
export function initialLang(): Lang {
  let l: string | null = null;
  try { l = localStorage.getItem(LANG_KEY); } catch { /* приватный режим */ }
  if (l !== 'ru' && l !== 'en') l = (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  return l as Lang;
}
export function saveLang(l: Lang) { try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ } }

export let LANG: Lang = 'ru';
export const setLang = (l: Lang) => { LANG = l; };
/** Текущий словарь. */
export const t = (): Dict => I18N[LANG];
