import { ExternalLink, AlertTriangle } from 'lucide-react';

const SOCIALS = [
  { id: 'vk',        name: 'ВКонтакте',  url: 'https://vk.com/',          color: '#0077FF', restricted: false },
  { id: 'tg',        name: 'Telegram',   url: 'https://t.me/',            color: '#26A5E4', restricted: false },
  { id: 'youtube',   name: 'YouTube',    url: 'https://youtube.com/',     color: '#FF0000', restricted: false },
  { id: 'rutube',    name: 'RuTube',     url: 'https://rutube.ru/',       color: '#000000', restricted: false },
  { id: 'dzen',      name: 'Дзен',       url: 'https://dzen.ru/',         color: '#000000', restricted: false },
  { id: 'instagram', name: 'Instagram',  url: 'https://instagram.com/',   color: '#E4405F', restricted: true  },
  { id: 'facebook',  name: 'Facebook',   url: 'https://facebook.com/',    color: '#1877F2', restricted: true  },
  { id: 'x',         name: 'X (Twitter)',url: 'https://x.com/',           color: '#000000', restricted: false },
];

export default function SocialPage() {
  return (
    <div className="px-5 md:px-10 py-8 md:py-12 max-w-4xl mx-auto">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold mb-2">
        Wealth Hub · Социальные сети
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink mb-3">
        Подписывайтесь на нас
      </h1>
      <p className="text-muted mb-8 max-w-2xl">
        Новости платформы, образовательные материалы про инвестиции,
        анонсы новых проектов и аналитика рынка МСП.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {SOCIALS.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-line hover:border-ink transition-colors p-5 flex flex-col items-center text-center gap-3 group relative"
          >
            <SocialIcon id={s.id} color={s.color} />
            <div>
              <div className="font-semibold text-ink text-sm flex items-center gap-1 justify-center">
                {s.name}
                <ExternalLink size={11} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {s.restricted && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-orange text-white">
                Meta*
              </span>
            )}
          </a>
        ))}
      </div>

      <div className="bg-orange-tint border-l-4 border-orange p-5 flex gap-3">
        <AlertTriangle size={20} className="text-orange flex-shrink-0 mt-0.5" />
        <div className="text-xs text-ink leading-relaxed">
          <div className="font-semibold mb-1">Дисклеймер</div>
          <p>
            <strong>* Meta Platforms Inc.</strong> (владеет соцсетями Facebook и Instagram)
            признана экстремистской организацией и запрещена на территории Российской Федерации
            решением Тверского суда г. Москвы от 21.03.2022.
          </p>
          <p className="mt-2">
            Использование указанных сервисов на территории РФ ограничено.
            Wealth Hub предоставляет ссылки исключительно в информационных целях
            и не несёт ответственности за доступность сторонних ресурсов.
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialIcon({ id, color }) {
  const baseProps = {
    width: 40, height: 40, viewBox: '0 0 24 24',
    fill: color, xmlns: 'http://www.w3.org/2000/svg',
  };

  if (id === 'vk') {
    return (
      <svg {...baseProps}>
        <path d="M13.16 16.83h1.17s.35-.04.53-.23c.16-.18.16-.5.16-.5s-.02-1.55.7-1.78c.7-.22 1.6 1.5 2.55 2.16.72.5 1.27.39 1.27.39l2.55-.04s1.34-.08.7-1.13c-.05-.09-.37-.79-1.94-2.25-1.64-1.52-1.42-1.27.55-3.9 1.2-1.6 1.68-2.58 1.53-3-.14-.4-1.02-.3-1.02-.3l-2.92.02s-.22-.03-.38.07c-.16.1-.26.32-.26.32s-.47 1.24-1.1 2.3c-1.32 2.23-1.85 2.35-2.07 2.21-.5-.32-.38-1.3-.38-1.99 0-2.16.33-3.06-.64-3.3-.32-.07-.56-.12-1.39-.13-1.06-.01-1.96.01-2.47.26-.34.16-.6.53-.45.55.2.03.64.12.87.43.3.4.3 1.32.3 1.32s.17 2.5-.4 2.82c-.4.21-.94-.23-2.11-2.25-.6-1.04-1.06-2.18-1.06-2.18s-.09-.21-.24-.33c-.2-.13-.46-.18-.46-.18l-2.78.02s-.42.01-.57.2c-.14.16-.01.5-.01.5s2.18 5.1 4.65 7.66C7.1 17.06 9.66 16.9 9.66 16.9h.92s.28-.03.42-.18c.13-.14.13-.4.13-.4s-.02-1.24.55-1.43c.56-.18 1.28 1.21 2.05 1.74.58.4.94.32.94.32z" />
      </svg>
    );
  }

  if (id === 'tg') {
    return (
      <svg {...baseProps}>
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
      </svg>
    );
  }

  if (id === 'youtube') {
    return (
      <svg {...baseProps}>
        <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z" />
      </svg>
    );
  }

  if (id === 'rutube') {
    return (
      <svg {...baseProps}>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <path d="M10 9v6l5-3z" fill="white" />
      </svg>
    );
  }

  if (id === 'dzen') {
    return (
      <svg {...baseProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2" />
      </svg>
    );
  }

  if (id === 'instagram') {
    return (
      <svg {...baseProps}>
        <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm5.5-1a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    );
  }

  if (id === 'facebook') {
    return (
      <svg {...baseProps}>
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
      </svg>
    );
  }

  if (id === 'x') {
    return (
      <svg {...baseProps}>
        <path d="M18.244 2H21l-6.524 7.46L22 22h-6.844l-5.36-7.013L3.6 22H1l7-8L1 2h7.025l4.838 6.39L18.244 2zm-2.41 18h1.857L8.27 4H6.295l9.539 16z" />
      </svg>
    );
  }

  return <svg {...baseProps}><circle cx="12" cy="12" r="10" /></svg>;
}
