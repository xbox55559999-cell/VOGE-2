
import { RawData, SaleRecord } from '../types';

// Helper to parse DD.MM.YYYY
const parseDate = (dateStr: string | undefined): Date => {
  if (!dateStr) return new Date(0); // Return epoch if date is missing
  const parts = dateStr.split('.');
  if (parts.length !== 3) return new Date(0);
  // Month is 0-indexed in JS Date
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// Helper to determine brand from model name
const determineBrand = (modelName: string): string => {
  const lowerName = modelName.toLowerCase();
  if (lowerName.includes('voge')) return 'VOGE';
  if (lowerName.includes('loncin')) return 'Loncin';
  return 'Другое';
};

// Helper to determine city from dealer name
const determineCity = (dealerName: string): string => {
    const lowerName = dealerName.toLowerCase();
    
    // 1. Try to find text inside parentheses, e.g., "Dealer (Tula)"
    const match = dealerName.match(/\((.*?)\)/);
    if (match && match[1]) {
        // Exclude generic terms if they appear in brackets
        const candidate = match[1].trim();
        // Ignore generic legal terms inside brackets
        if (candidate.length > 2 && 
            !['ооо', 'ип', 'ao', 'зао', 'пао', 'ltd', 'gmbh'].includes(candidate.toLowerCase())) {
            return candidate;
        }
    }

    // 2. Keyword matching for known/mock data
    // Order matters: specific cities first, then broader matches
    if (lowerName.includes('санкт-петербург') || lowerName.includes('спб') || lowerName.includes('питер')) return 'Санкт-Петербург';
    if (lowerName.includes('нижний новгород') || lowerName.includes('нижний') || lowerName.includes('тятюшкин')) return 'Нижний Новгород';
    if (lowerName.includes('ростов-на-дону') || lowerName.includes('ростов')) return 'Ростов-на-Дону';
    if (lowerName.includes('москва') || lowerName.includes('авилон') || lowerName.includes('акцент') || lowerName.includes('major') || lowerName.includes('мкад')) return 'Москва';
    if (lowerName.includes('тула')) return 'Тула';
    if (lowerName.includes('казань')) return 'Казань';
    if (lowerName.includes('екатеринбург')) return 'Екатеринбург';
    if (lowerName.includes('краснодар')) return 'Краснодар';
    if (lowerName.includes('новосибирск')) return 'Новосибирск';
    if (lowerName.includes('уфа')) return 'Уфа';
    if (lowerName.includes('челябинск')) return 'Челябинск';
    if (lowerName.includes('самара')) return 'Самара';
    if (lowerName.includes('омск')) return 'Омск';
    if (lowerName.includes('красноярск')) return 'Красноярск';
    if (lowerName.includes('воронеж')) return 'Воронеж';
    if (lowerName.includes('пермь')) return 'Пермь';
    if (lowerName.includes('волгоград')) return 'Волгоград';
    if (lowerName.includes('тюмень')) return 'Тюмень';
    if (lowerName.includes('саратов')) return 'Саратов';
    if (lowerName.includes('тольятти')) return 'Тольятти';
    if (lowerName.includes('барнаул')) return 'Барнаул';
    if (lowerName.includes('ижевск')) return 'Ижевск';
    if (lowerName.includes('ульяновск')) return 'Ульяновск';
    if (lowerName.includes('иркутск')) return 'Иркутск';
    if (lowerName.includes('хабаровск')) return 'Хабаровск';
    if (lowerName.includes('ярославль')) return 'Ярославль';
    if (lowerName.includes('владивосток')) return 'Владивосток';
    if (lowerName.includes('махачкала')) return 'Махачкала';
    if (lowerName.includes('томск')) return 'Томск';
    if (lowerName.includes('оренбург')) return 'Оренбург';
    if (lowerName.includes('кемерово')) return 'Кемерово';
    if (lowerName.includes('новокузнецк')) return 'Новокузнецк';
    if (lowerName.includes('рязань')) return 'Рязань';
    if (lowerName.includes('астрахань')) return 'Астрахань';
    if (lowerName.includes('набережные челны')) return 'Набережные Челны';
    if (lowerName.includes('пенза')) return 'Пенза';
    if (lowerName.includes('липецк')) return 'Липецк';
    if (lowerName.includes('киров')) return 'Киров';
    if (lowerName.includes('чебоксары')) return 'Чебоксары';
    if (lowerName.includes('калининград')) return 'Калининград';
    if (lowerName.includes('курск')) return 'Курск';
    if (lowerName.includes('улан-удэ')) return 'Улан-Удэ';
    if (lowerName.includes('ставрополь')) return 'Ставрополь';
    if (lowerName.includes('сочи')) return 'Сочи';
    if (lowerName.includes('тверь')) return 'Тверь';
    if (lowerName.includes('магнитогорск')) return 'Магнитогорск';
    if (lowerName.includes('иваново')) return 'Иваново';
    if (lowerName.includes('брянск')) return 'Брянск';
    if (lowerName.includes('белгород')) return 'Белгород';
    if (lowerName.includes('сургут')) return 'Сургут';
    if (lowerName.includes('владимир')) return 'Владимир';
    if (lowerName.includes('чита')) return 'Чита';
    if (lowerName.includes('архангельск')) return 'Архангельск';
    if (lowerName.includes('нижний тагил')) return 'Нижний Тагил';
    if (lowerName.includes('калуга')) return 'Калуга';
    if (lowerName.includes('якутск')) return 'Якутск';
    if (lowerName.includes('грозный')) return 'Грозный';
    if (lowerName.includes('волжский')) return 'Волжский';
    if (lowerName.includes('смоленск')) return 'Смоленск';
    if (lowerName.includes('саранск')) return 'Саранск';
    if (lowerName.includes('череповец')) return 'Череповец';
    if (lowerName.includes('курган')) return 'Курган';
    if (lowerName.includes('вологда')) return 'Вологда';
    if (lowerName.includes('орёл') || lowerName.includes('орел')) return 'Орёл';
    if (lowerName.includes('владикавказ')) return 'Владикавказ';
    if (lowerName.includes('мурманск')) return 'Мурманск';
    if (lowerName.includes('тамбов')) return 'Тамбов';
    if (lowerName.includes('стерлитамак')) return 'Стерлитамак';
    if (lowerName.includes('петрозаводск')) return 'Петрозаводск';
    if (lowerName.includes('кострома')) return 'Кострома';
    if (lowerName.includes('нижневартовск')) return 'Нижневартовск';
    if (lowerName.includes('новороссийск')) return 'Новороссийск';
    if (lowerName.includes('йошкар-ола')) return 'Йошкар-Ола';
    if (lowerName.includes('химки')) return 'Химки';
    if (lowerName.includes('таганрог')) return 'Таганрог';
    if (lowerName.includes('балашиха')) return 'Балашиха';
    if (lowerName.includes('сыктывкар')) return 'Сыктывкар';
    if (lowerName.includes('нальчик')) return 'Нальчик';
    if (lowerName.includes('шахты')) return 'Шахты';
    if (lowerName.includes('братск')) return 'Братск';
    if (lowerName.includes('дзержинск')) return 'Дзержинск';
    if (lowerName.includes('великий новгород')) return 'Великий Новгород';
    if (lowerName.includes('орск')) return 'Орск';
    if (lowerName.includes('ангарск')) return 'Ангарск';
    if (lowerName.includes('благовещенск')) return 'Благовещенск';
    if (lowerName.includes('старый оскол') || lowerName.includes('старый оскол')) return 'Старый Оскол';
    if (lowerName.includes('псков')) return 'Псков';
    if (lowerName.includes('люберцы')) return 'Люберцы';
    if (lowerName.includes('южно-сахалинск')) return 'Южно-Сахалинск';
    if (lowerName.includes('бийск')) return 'Бийск';
    if (lowerName.includes('прокопьевск')) return 'Прокопьевск';
    if (lowerName.includes('абакан')) return 'Абакан';
    if (lowerName.includes('армавир')) return 'Армавир';
    if (lowerName.includes('норильск')) return 'Норильск';
    if (lowerName.includes('рыбинск')) return 'Рыбинск';
    if (lowerName.includes('северодвинск')) return 'Северодвинск';
    if (lowerName.includes('петропавловск-камчатский')) return 'Петропавловск-Камчатский';
    if (lowerName.includes('красногорск')) return 'Красногорск';
    if (lowerName.includes('уссурийск')) return 'Уссурийск';
    if (lowerName.includes('каменск-уральский')) return 'Каменск-Уральский';
    if (lowerName.includes('сызрань')) return 'Сызрань';
    if (lowerName.includes('златоуст')) return 'Златоуст';
    if (lowerName.includes('новочеркасск')) return 'Новочеркасск';
    if (lowerName.includes('альметьевск')) return 'Альметьевск';
    if (lowerName.includes('электросталь')) return 'Электросталь';
    if (lowerName.includes('керчь')) return 'Керчь';
    if (lowerName.includes('миасс')) return 'Миасс';
    if (lowerName.includes('салават')) return 'Салават';
    if (lowerName.includes('пятигорск')) return 'Пятигорск';
    if (lowerName.includes('копейск')) return 'Копейск';
    if (lowerName.includes('находка')) return 'Находка';
    if (lowerName.includes('рубцовск')) return 'Рубцовск';
    if (lowerName.includes('майкоп')) return 'Майкоп';
    if (lowerName.includes('коломна')) return 'Коломна';
    if (lowerName.includes('одинцово')) return 'Одинцово';
    if (lowerName.includes('домодедово')) return 'Домодедово';
    if (lowerName.includes('ковров')) return 'Ковров';
    if (lowerName.includes('нефтекамск')) return 'Нефтекамск';
    if (lowerName.includes('каспийск')) return 'Каспийск';
    if (lowerName.includes('нефтеюганск')) return 'Нефтеюганск';
    if (lowerName.includes('кисловодск')) return 'Кисловодск';
    if (lowerName.includes('новочебоксарск')) return 'Новочебоксарск';
    if (lowerName.includes('батайск')) return 'Батайск';
    if (lowerName.includes('щелково') || lowerName.includes('щёлково')) return 'Щёлково';
    if (lowerName.includes('дербент')) return 'Дербент';
    if (lowerName.includes('серпухов')) return 'Серпухов';
    if (lowerName.includes('назрань')) return 'Назрань';
    if (lowerName.includes('раменское')) return 'Раменское';
    if (lowerName.includes('черкесск')) return 'Черкесск';
    if (lowerName.includes('новомосковск')) return 'Новомосковск';
    if (lowerName.includes('кызыл')) return 'Кызыл';
    if (lowerName.includes('первоуральск')) return 'Первоуральск';
    if (lowerName.includes('новый уренгой')) return 'Новый Уренгой';
    if (lowerName.includes('орехово-зуево')) return 'Орехово-Зуево';
    if (lowerName.includes('долгопрудный')) return 'Долгопрудный';
    if (lowerName.includes('обнинск')) return 'Обнинск';
    if (lowerName.includes('невинномысск')) return 'Невинномысск';
    if (lowerName.includes('ессентуки')) return 'Ессентуки';
    if (lowerName.includes('октябрьский')) return 'Октябрьский';
    if (lowerName.includes('димитровград')) return 'Димитровград';
    if (lowerName.includes('пушкино')) return 'Пушкино';
    if (lowerName.includes('камышин')) return 'Камышин';
    if (lowerName.includes('евпатория')) return 'Евпатория';
    if (lowerName.includes('симферополь')) return 'Симферополь';
    if (lowerName.includes('севастополь')) return 'Севастополь';
    if (lowerName.includes('реутов')) return 'Реутов';
    if (lowerName.includes('жуковский')) return 'Жуковский';
    if (lowerName.includes('северск')) return 'Северск';
    if (lowerName.includes('муром')) return 'Муром';
    if (lowerName.includes('новошахтинск')) return 'Новошахтинск';
    if (lowerName.includes('артём') || lowerName.includes('артем')) return 'Артём';
    if (lowerName.includes('ачинск')) return 'Ачинск';
    if (lowerName.includes('бердск')) return 'Бердск';
    if (lowerName.includes('элиста')) return 'Элиста';
    if (lowerName.includes('арзамас')) return 'Арзамас';
    if (lowerName.includes('ханты-мансийск')) return 'Ханты-Мансийск';
    if (lowerName.includes('ногинск')) return 'Ногинск';
    if (lowerName.includes('елец')) return 'Елец';
    if (lowerName.includes('железногорск')) return 'Железногорск';
    if (lowerName.includes('зеленодольск')) return 'Зеленодольск';

    return 'Не указан';
};

export const CITY_COORDINATES: Record<string, [number, number]> = {
    'Москва': [55.7558, 37.6173],
    'Санкт-Петербург': [59.9343, 30.3351],
    'Новосибирск': [55.0084, 82.9357],
    'Екатеринбург': [56.8389, 60.6057],
    'Казань': [55.8304, 49.0661],
    'Нижний Новгород': [56.3269, 44.0059],
    'Челябинск': [55.1644, 61.4368],
    'Красноярск': [56.0153, 92.8932],
    'Самара': [53.2415, 50.2212],
    'Уфа': [54.7388, 55.9721],
    'Ростов-на-Дону': [47.2357, 39.7015],
    'Омск': [54.9885, 73.3242],
    'Краснодар': [45.0355, 38.9753],
    'Воронеж': [51.6683, 39.1919],
    'Пермь': [58.0105, 56.2294],
    'Волгоград': [48.7080, 44.5133],
    'Саратов': [51.5462, 46.0054],
    'Тюмень': [57.1613, 65.5250],
    'Тольятти': [53.5088, 49.4189],
    'Барнаул': [53.3548, 83.7698],
    'Ижевск': [56.8619, 53.2324],
    'Махачкала': [42.9831, 47.5046],
    'Хабаровск': [48.4814, 135.0721],
    'Ульяновск': [54.3141, 48.4031],
    'Иркутск': [52.2870, 104.2810],
    'Владивосток': [43.1198, 131.8869],
    'Ярославль': [57.6261, 39.8845],
    'Севастополь': [44.6166, 33.5254],
    'Ставрополь': [45.0428, 41.9734],
    'Томск': [56.5010, 84.9924],
    'Кемерово': [55.3547, 86.0875],
    'Набережные Челны': [55.7437, 52.3968],
    'Оренбург': [51.7666, 55.0993],
    'Новокузнецк': [53.7596, 87.1216],
    'Балашиха': [55.7982, 37.9680],
    'Рязань': [54.6095, 39.7126],
    'Чебоксары': [56.1184, 47.2445],
    'Пенза': [53.2273, 45.0000],
    'Липецк': [52.6012, 39.5711],
    'Калининград': [54.7104, 20.4522],
    'Астрахань': [46.3497, 48.0408],
    'Тула': [54.1931, 37.6171],
    'Киров': [58.6035, 49.6668],
    'Сочи': [43.6028, 39.7342],
    'Курск': [51.7080, 36.1732],
    'Улан-Удэ': [51.8348, 107.5845],
    'Тверь': [56.8596, 35.9118],
    'Магнитогорск': [53.4129, 59.0016],
    'Сургут': [61.2559, 73.3845],
    'Брянск': [53.2435, 34.3634],
    'Иваново': [57.0003, 40.9739],
    'Якутск': [62.0355, 129.6755],
    'Владимир': [56.1290, 40.4065],
    'Симферополь': [44.9572, 34.1108],
    'Белгород': [50.5997, 36.5983],
    'Нижний Тагил': [57.9194, 59.9650],
    'Калуга': [54.5293, 36.2754],
    'Чита': [52.0336, 113.5010],
    'Грозный': [43.3169, 45.6985],
    'Волжский': [48.7858, 44.7797],
    'Смоленск': [54.7903, 32.0504],
    'Саранск': [54.1808, 45.1867],
    'Череповец': [59.1223, 37.9045],
    'Курган': [55.4388, 65.3400],
    'Подольск': [55.4312, 37.5458],
    'Вологда': [59.2205, 39.8915],
    'Орёл': [52.9668, 36.0625],
    'Владикавказ': [43.0211, 44.6819],
    'Тамбов': [52.7236, 41.4423],
    'Мурманск': [68.9585, 33.0827],
    'Петрозаводск': [61.7849, 34.3469],
    'Нижневартовск': [60.9385, 76.5589],
    'Кострома': [57.7679, 40.9269],
    'Йошкар-Ола': [56.6388, 47.8861],
    'Новороссийск': [44.7154, 37.7619],
    'Стерлитамак': [53.6333, 55.9500],
    'Химки': [55.8941, 37.4439],
    'Таганрог': [47.2196, 38.9172],
    'Мытищи': [55.9116, 37.7308],
    'Сыктывкар': [61.6688, 50.8178],
    'Комсомольск-на-Амуре': [50.5499, 137.0079],
    'Нижнекамск': [55.6356, 51.8090],
    'Нальчик': [43.4853, 43.6071],
    'Шахты': [47.7086, 40.2160],
    'Дзержинск': [56.2389, 43.4631],
    'Энгельс': [51.4982, 46.1213],
    'Благовещенск': [50.2743, 127.5277],
    'Королёв': [55.9167, 37.8286],
    'Братск': [56.1555, 101.6214],
    'Великий Новгород': [58.5256, 31.2742],
    'Орск': [51.2316, 58.4678],
    'Старый Оскол': [51.2968, 37.8296],
    'Ангарск': [52.5444, 103.8882],
    'Псков': [57.8136, 28.3496],
    'Люберцы': [55.6796, 37.8890],
    'Южно-Сахалинск': [46.9541, 142.7360],
    'Бийск': [52.5364, 85.2074],
    'Абакан': [53.7211, 91.4424],
    'Прокопьевск': [53.8869, 86.7323],
    'Армавир': [45.0003, 41.1328],
    'Балаково': [52.0322, 47.7786],
    'Норильск': [69.3558, 88.1893],
    'Рыбинск': [58.0497, 38.8584],
    'Северодвинск': [64.5635, 39.8302],
    'Петропавловск-камчатский': [53.0452, 158.6559],
    'Красногорск': [55.8310, 37.3292],
    'Уссурийск': [43.8009, 131.9603],
    'Каменск-Уральский': [56.4185, 61.9189],
    'Сызрань': [53.1598, 48.4682],
    'Златоуст': [55.1711, 59.6508],
    'Новочеркасск': [47.4223, 40.0937],
    'Электросталь': [55.7937, 38.4389],
    'Альметьевск': [54.9014, 52.2978],
    'Салават': [53.3610, 55.9238],
    'Миасс': [55.0445, 60.1084],
    'Керчь': [45.3619, 36.4710],
    'Находка': [42.8138, 132.8735],
    'Копейск': [55.1105, 61.6144],
    'Пятигорск': [44.0492, 43.0545],
    'Рубцовск': [51.5152, 81.2087],
    'Березники': [59.4186, 56.8143],
    'Коломна': [55.0969, 38.7633],
    'Майкоп': [44.6089, 40.1007],
    'Одинцово': [55.6789, 37.2644],
    'Хасавюрт': [43.2435, 46.5861],
    'Ковров': [56.3609, 41.3191],
    'Кисловодск': [43.9009, 42.7196],
    'Нефтекамск': [56.0966, 54.2635],
    'Нефтеюганск': [61.0998, 72.6034],
    'Новочебоксарск': [56.1214, 47.4817],
    'Серпухов': [54.9141, 37.4168],
    'Щёлково': [55.9202, 37.9915],
    'Новомосковск': [54.0102, 38.2919],
    'Батайск': [47.1398, 39.7364],
    'Первоуральск': [56.9083, 59.9433],
    'Домодедово': [55.4384, 37.7739],
    'Дербент': [42.0628, 48.2891],
    'Черкесск': [44.2273, 42.0478],
    'Орехово-Зуево': [55.8073, 38.9745],
    'Невинномысск': [44.6293, 41.9392],
    'Димитровград': [54.2138, 49.6184],
    'Назрань': [43.2276, 44.7618],
    'Кызыл': [51.7199, 94.4377],
    'Октябрьский': [54.4815, 53.4710],
    'Обнинск': [55.0938, 36.6133],
    'Каспийск': [42.8817, 47.6407],
    'Новый Уренгой': [66.0840, 76.6324],
    'Раменское': [55.5752, 38.2265],
    'Камышин': [50.0863, 45.4024],
    'Муром': [55.5755, 42.0528],
    'Жуковский': [55.5953, 38.1143],
    'Новошахтинск': [47.7556, 39.9189],
    'Северск': [56.5961, 84.8841],
    'Ессентуки': [44.0416, 42.8596],
    'Ноябрьск': [63.1979, 75.4533],
    'Артём': [43.3556, 132.1866],
    'Пушкино': [56.0106, 37.8472],
    'Евпатория': [45.1904, 33.3668],
    'Ачинск': [56.2694, 90.4993],
    'Елец': [52.6253, 38.5043],
    'Сергиев Посад': [56.3000, 38.1333],
    'Арзамас': [55.3949, 43.8399],
    'Долгопрудный': [55.9353, 37.5141],
    'Элиста': [46.3078, 44.2558],
    'Бердск': [54.7578, 83.1043],
    'Новокуйбышевск': [53.0955, 49.9272],
    'Ногинск': [55.8569, 38.4407],
    'Железногорск': [52.3389, 35.3522]
};

export const getCityCoordinates = (city: string): {lat: number, lng: number} | null => {
    if (!city) return null;
    
    // Normalize input function
    const normalize = (s: string) => s.toLowerCase().replace(/^(г\.|г|город)\s+/, '').trim();
    const normalizedInput = normalize(city);

    // 1. Try exact match from keys
    if (CITY_COORDINATES[city]) {
        return { lat: CITY_COORDINATES[city][0], lng: CITY_COORDINATES[city][1] };
    }

    // 2. Try normalized match
    const foundKey = Object.keys(CITY_COORDINATES).find(key => {
        const normalizedKey = normalize(key);
        // Strict equality first, then startsWith for safety
        return normalizedKey === normalizedInput || normalizedKey.startsWith(normalizedInput) || (normalizedInput.length > 4 && normalizedKey.includes(normalizedInput));
    });

    if (foundKey) {
        return { lat: CITY_COORDINATES[foundKey][0], lng: CITY_COORDINATES[foundKey][1] };
    }

    return null;
};

export const processData = (data: RawData): SaleRecord[] => {
  const records: SaleRecord[] = [];

  if (!data || !data.items) return records;

  // Iterate Dealers
  Object.entries(data.items).forEach(([dealerId, dealer]) => {
    if (!dealer.models) return;

    // Determine city: prioritize existing city field, then fallback to parser
    const city = dealer.city || determineCity(dealer.name);

    // Iterate Models
    Object.entries(dealer.models).forEach(([modelId, model]) => {
      
      const brand = determineBrand(model.name);

      if (!model.offers) return;

      // Iterate Offers (Variants)
      Object.entries(model.offers).forEach(([offerId, offer]) => {
        // To calculate individual unit price averages (since JSON gives totals per offer)
        // We will distribute the totals evenly among the sold vehicles in this offer block
        // This is an approximation based on the structure, assuming vehicles in same offer group have similar pricing
        
        // Handle varying fields for different data sources (Sales vs Inventory)
        const count = offer.count_sold ?? offer.count_free ?? 0;
        const totalBuy = offer.total_buy_price ?? 0;
        const totalSold = offer.total_sold_price ?? 0;

        const avgBuyPrice = count > 0 ? totalBuy / count : 0;
        const avgSoldPrice = count > 0 ? totalSold / count : 0;

        if (!offer.vehicles) return;

        // Iterate Vehicles (Individual Sales)
        Object.entries(offer.vehicles).forEach(([vehicleId, vehicle]) => {
          let vin = 'N/A';
          let saleDateStr: string | undefined;

          // Handle vehicle as String (Inventory format) or Object (Sales format)
          if (typeof vehicle === 'string') {
              vin = vehicle;
          } else {
              // Cast to any to access properties safely given the union type
              const vObj = vehicle as any;
              vin = vObj.vin || 'N/A';
              saleDateStr = vObj.sale_date;
          }

          const saleDate = parseDate(saleDateStr);
          
          records.push({
            id: `${dealerId}-${modelId}-${offerId}-${vehicleId}`,
            dealerName: dealer.name,
            city: city,
            brand: brand,
            modelName: model.name,
            offerName: offer.name,
            vin: vin,
            saleDate: saleDate,
            year: saleDate.getFullYear(),
            month: saleDate.getMonth(),
            buyPrice: avgBuyPrice,
            soldPrice: avgSoldPrice,
            margin: avgSoldPrice - avgBuyPrice
          });
        });
      });
    });
  });

  return records.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU').format(value);
};

export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("Нет данных для экспорта");
        return;
    }

    // Determine headers from the first object keys
    const headers = Object.keys(data[0]);
    
    // Create CSV content with Semicolon separator for better Excel compatibility in RU/EU regions
    const csvContent = [
        headers.join(';'),
        ...data.map(row => 
            headers.map(fieldName => {
                let value = row[fieldName];
                // Handle strings that might contain separators
                if (typeof value === 'string') {
                    // Escape quotes and wrap in quotes
                    value = `"${value.replace(/"/g, '""')}"`;
                } else if (typeof value === 'number') {
                    value = value.toString();
                }
                return value;
            }).join(';')
        )
    ].join('\r\n');

    // Add Byte Order Mark (BOM) for UTF-8 to ensure Excel renders Cyrillic correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const convertCSVToRawData = (csvText: string): RawData => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV файл пуст или не содержит заголовков");

    // Helper to cleanup headers
    const cleanHeader = (h: string) => h.trim().toLowerCase().replace(/"/g, '');
    const headers = lines[0].split(';').map(cleanHeader);
    
    // Fallback to comma if semicolon didn't work (headers length 1)
    let delimiter = ';';
    if (headers.length === 1 && lines[0].includes(',')) {
        delimiter = ',';
        headers.splice(0, headers.length, ...lines[0].split(',').map(cleanHeader));
    }

    // Detect column indices based on common names
    const idxDealer = headers.findIndex(h => h.includes('дилер') || h.includes('dealer') || h.includes('partner'));
    const idxCity = headers.findIndex(h => h.includes('город') || h.includes('city') || h.includes('region'));
    const idxModel = headers.findIndex(h => h.includes('модель') || h.includes('model'));
    const idxOffer = headers.findIndex(h => h.includes('комплектация') || h.includes('offer') || h.includes('variant') || h.includes('modification'));
    const idxVin = headers.findIndex(h => h.includes('vin'));
    const idxDate = headers.findIndex(h => h.includes('дата') || h.includes('date'));
    const idxSold = headers.findIndex(h => h.includes('продаж') || h.includes('sold') || h.includes('price') || h.includes('выручка'));
    const idxBuy = headers.findIndex(h => h.includes('закуп') || h.includes('buy') || h.includes('cost') || h.includes('себестоимость'));

    if (idxDealer === -1 || idxModel === -1) {
        throw new Error("Не найдены обязательные столбцы: 'Дилер' или 'Модель'. Проверьте заголовки CSV.");
    }

    const rawData: RawData = {
        total: { count_sold: 0, total_sold_price: 0, total_buy_price: 0 },
        items: {}
    };

    let dealerIdCounter = 1;
    let modelIdCounter = 1;
    let offerIdCounter = 1;
    let vehicleIdCounter = 1;

    // Helper maps to reuse IDs
    const dealerMap = new Map<string, string>(); // Name -> ID
    const modelMap = new Map<string, string>(); // DealerID-ModelName -> ID
    const offerMap = new Map<string, string>(); // ModelID-OfferName -> ID

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple split logic. NOTE: Doesn't handle separators inside quotes.
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

        // Extract values using indices
        const dealerName = cols[idxDealer];
        const modelName = cols[idxModel];
        if (!dealerName || !modelName) continue; // Skip bad rows

        const city = idxCity > -1 ? cols[idxCity] : undefined;
        const offerName = idxOffer > -1 ? (cols[idxOffer] || 'Base') : 'Base';
        const vin = idxVin > -1 ? (cols[idxVin] || `UNKNOWN-${i}`) : `UNKNOWN-${i}`;
        const dateStr = idxDate > -1 ? cols[idxDate] : '';
        
        // Parse numbers safely
        const parseNum = (str: string) => {
            if (!str) return 0;
            // Remove spaces (thousands sep) and replace comma with dot
            return parseFloat(str.replace(/\s/g, '').replace(',', '.')) || 0;
        };

        const soldPrice = idxSold > -1 ? parseNum(cols[idxSold]) : 0;
        const buyPrice = idxBuy > -1 ? parseNum(cols[idxBuy]) : 0;

        // 1. Dealer
        let dealerId = dealerMap.get(dealerName);
        if (!dealerId) {
            dealerId = String(dealerIdCounter++);
            dealerMap.set(dealerName, dealerId);
            rawData.items[dealerId] = {
                name: dealerName,
                city: city, // Store captured city
                url: '',
                count_sold: 0,
                total_sold_price: 0,
                total_buy_price: 0,
                models: {}
            };
        }
        const dealer = rawData.items[dealerId];
        // If city wasn't set previously but found now (e.g. inconsistent rows), set it
        if (!dealer.city && city) dealer.city = city;

        dealer.count_sold = (dealer.count_sold || 0) + 1;
        dealer.total_sold_price = (dealer.total_sold_price || 0) + soldPrice;
        dealer.total_buy_price = (dealer.total_buy_price || 0) + buyPrice;

        // 2. Model
        const modelKey = `${dealerId}-${modelName}`;
        let modelId = modelMap.get(modelKey);
        if (!modelId) {
            modelId = String(modelIdCounter++);
            modelMap.set(modelKey, modelId);
            if (!dealer.models) dealer.models = {};
            dealer.models[modelId] = {
                name: modelName,
                url: '',
                offers: {}
            };
        }
        const model = dealer.models![modelId];

        // 3. Offer
        const offerKey = `${modelId}-${offerName}`;
        let offerId = offerMap.get(offerKey);
        if (!offerId) {
            offerId = String(offerIdCounter++);
            offerMap.set(offerKey, offerId);
            if (!model.offers) model.offers = {};
            model.offers[offerId] = {
                name: offerName,
                count_sold: 0,
                total_sold_price: 0,
                total_buy_price: 0,
                vehicles: {}
            };
        }
        const offer = model.offers![offerId];
        offer.count_sold = (offer.count_sold || 0) + 1;
        offer.total_sold_price = (offer.total_sold_price || 0) + soldPrice;
        offer.total_buy_price = (offer.total_buy_price || 0) + buyPrice;

        // 4. Vehicle
        const vehicleId = String(vehicleIdCounter++);
        if (!offer.vehicles) offer.vehicles = {};
        
        offer.vehicles[vehicleId] = {
            vin: vin,
            sale_date: dateStr
        };

        // Totals
        rawData.total.count_sold = (rawData.total.count_sold || 0) + 1;
        rawData.total.total_sold_price = (rawData.total.total_sold_price || 0) + soldPrice;
        rawData.total.total_buy_price = (rawData.total.total_buy_price || 0) + buyPrice;
    }

    return rawData;
};
