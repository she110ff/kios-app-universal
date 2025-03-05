export function truncateString(str, num = 10) {
  if (str.length > num) {
    return str.slice(0, num) + '...';
  } else {
    return str;
  }
}
export function truncateMiddleString(str, num = 10) {
  if (!str) str = '';
  if (str.length > num) {
    return str.slice(0, num / 2 + 2) + ' ... ' + str.slice(-num / 2);
  } else {
    return str;
  }
}
export function toFix(str, dec = 2) {
  const index = str.indexOf('.');
  return str.slice(0, index + (dec + 1));
}

export function convertProperValue(str, type, dec = 2, trunc = 10) {
  if (type === 0) dec = -1;
  return numberWithCommas(truncateString(toFix(str, dec), trunc));
}

export function convertShopProperValue(
  str,
  currency = process.env.EXPO_PUBLIC_CURRENCY,
  dec = 2,
  trunc = 10,
) {
  if (currency.toLowerCase() === process.env.EXPO_PUBLIC_CURRENCY) dec = -1;
  return numberWithCommas(truncateString(toFix(str, dec), trunc));
}

export function numberWithCommas(x) {
  let parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function timePadding(t) {
  return ('0' + t).slice(-2);
}

export function isEmpty(obj) {
  if (
    obj === null ||
    obj === '' ||
    (obj && Object.keys(obj).length === 0 && obj.constructor === Object)
  ) {
    return true;
  }
  return false;
}

export function getUnixTime() {
  return Math.floor(new Date().getTime() / 1000);
}

export function checkValidPeriod(timestamp, timeout) {
  const validTime = timestamp + timeout;
  const now = getUnixTime();
  if (validTime > now) {
    return true;
  } else return false;
}

const names = {
  en: {
    appName: { kios: 'KIOS Point', pnb: 'PNB', acc: 'ACCcoin' },
    tokenName: { kios: 'KIOS', pnb: 'PNB', acc: 'ACC' },
  },
  other: {
    appName: { kios: '키오스 포인트', pnb: 'PNB', acc: 'ACCcoin' },
    tokenName: { kios: 'KIOS', pnb: 'PNB', acc: 'ACC' },
  },
};

export function getName(lang, type, key) {
  return names[lang === 'en' ? 'en' : 'other'][type][key] || '';
}

export function validateNumberWithDecimal(numberString) {
  // 정규 표현식을 사용하여 주어진 문자열이 유효한 소수점을 포함한 숫자인지 확인
  const regex = /^-?\d*\.?\d+$/;
  return regex.test(numberString);
}

export function validateNumber(numberString) {
  // 정규 표현식을 사용하여 주어진 문자열이 유효한 소수점을 포함한 숫자인지 확인
  const regex = /^-?\d+$/;
  return regex.test(numberString);
}

export function greaterFloatTexts(floatText1, floatText2) {
  const float1 = parseFloat(floatText1);
  const float2 = parseFloat(floatText2);

  if (isNaN(float1) || isNaN(float2)) {
    return false;
  }

  return float1 > float2;
}

export function greaterAndEqualFloatTexts(floatText1, floatText2) {
  const float1 = parseFloat(floatText1);
  const float2 = parseFloat(floatText2);

  if (isNaN(float1) || isNaN(float2)) {
    return false;
  }

  return float1 >= float2;
}

export function subFloatTexts(floatText1, floatText2) {
  const float1 = parseFloat(floatText1);
  const float2 = parseFloat(floatText2);

  if (isNaN(float1) || isNaN(float2)) {
    return '0';
  }

  return (float1 - float2).toFixed(2);
}
