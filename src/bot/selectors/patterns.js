'use strict';

const PATTERNS = {
  CONNECT_ARIA: /connect|invite|دعوت|اتصال/i,
  PENDING: /pending|در\s+انتظار/i,
  ADD_NOTE: /add\s+a\s+note|افزودن\s+یادداشت/i,
  SEND_WITHOUT_NOTE: /send\s+without\s+a\s+note|ارسال\s+بدون\s+یادداشت/i,
  SEND_INVITATION: /send(\s+invitation)?|ارسال/i,
  DISMISS: /dismiss|close|بستن/i,
  CANCEL: /cancel|انصراف/i,
  NEXT_PAGE: /^next$|صفحه\s+بعد/i,
  PERSONALIZED_REMAINING: /(\d+)\s+personalized\s+invitations?\s+remaining/i,
  WEEKLY_LIMIT: /weekly\s+limit|محدودیت\s+هفتگی|limit\s+reached/i,
  RESTRICTION: /temporary\s+restriction|verify\s+your\s+identity|محدودیت\s+موقت/i,
  LOGIN_PAGE: /linkedin\.com\/(login|checkpoint|authwall)/i,
  PEOPLE_SEARCH: /\/search\/results\/people/i,
  FEED_PAGE: /\/feed\/?$/i
};

const NOT_PENDING = ':not([aria-label*="Pending" i], [aria-label*="در انتظار"])';

const CONNECT_SELECTORS = [
  {
    id: 'aria-connect',
    selector: [
      `button[aria-label*="Connect" i]${NOT_PENDING}`,
      `button[aria-label*="Invite" i]${NOT_PENDING}`,
      `button[aria-label*="دعوت"]${NOT_PENDING}`,
      `button[aria-label*="اتصال"]${NOT_PENDING}`,
      `a[aria-label*="Connect" i][role="button"]${NOT_PENDING}`,
      `a[aria-label*="Invite" i][role="button"]${NOT_PENDING}`
    ].join(', '),
    weight: 10,
    desc: 'aria-label on button/role=button (excludes Pending)'
  },
  {
    id: 'componentkey',
    selector: `[componentkey*="ConnectButton"]${NOT_PENDING}`,
    weight: 8,
    desc: 'componentkey contains ConnectButton (excludes Pending)'
  },
  {
    id: 'href-invite',
    selector: `a[href*="search-custom-invite"]${NOT_PENDING}`,
    weight: 6,
    desc: 'href contains search-custom-invite (excludes Pending)'
  },
  {
    id: 'aria-invite',
    selector: [
      `a[aria-label*="Invite" i]${NOT_PENDING}`,
      `a[aria-label*="دعوت"]${NOT_PENDING}`
    ].join(', '),
    weight: 5,
    desc: 'aria-label on <a> (excludes Pending)'
  }
];

module.exports = { PATTERNS, CONNECT_SELECTORS };
