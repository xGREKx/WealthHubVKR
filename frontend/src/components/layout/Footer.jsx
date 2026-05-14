export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-ink text-white mt-12 border-t border-white/10">
      <div className="px-5 md:px-10 py-10 grid grid-cols-1 sm:grid-cols-4 gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
            Инструменты
          </div>
          <div className="space-y-2">
            <FooterLink onClick={() => onNavigate('settings')}>API</FooterLink>
            <a href="https://workspace.google.com/" target="_blank" rel="noopener noreferrer"
               className="block text-sm text-white/80 hover:text-orange transition-colors">
              Google Workspace
            </a>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
            Справка
          </div>
          <div className="space-y-2">
            <FooterLink onClick={() => onNavigate('support')}>Поддержка</FooterLink>
            <FooterLink onClick={() => onNavigate('faq')}>FAQ</FooterLink>
            <FooterLink onClick={() => onNavigate('social')}>Соцсети</FooterLink>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
            Документы
          </div>
          <div className="space-y-2">
            <FooterLink onClick={() => onNavigate('faq')}>Условия использования</FooterLink>
            <FooterLink onClick={() => onNavigate('faq')}>Политика конфиденциальности</FooterLink>
            <FooterLink onClick={() => onNavigate('faq')}>Раскрытие рисков</FooterLink>
          </div>
        </div>

        <div className="sm:text-right">
          <div className="font-display font-bold text-lg tracking-wider">WEALTH HUB</div>
          <div className="text-sm text-white/60 mt-1">ООО «ВЕЛФ ХАБ»</div>
          <div className="text-xs text-white/40 mt-3 font-mono">© 2026 · ИНН 7700000000</div>
          <div className="text-[11px] text-white/40 mt-2 leading-relaxed">
            ВКР · Финансовый университет<br />при Правительстве РФ · 2026<br />
            Верховский Г. А., ИТвСФТ24-1м
          </div>
        </div>
      </div>

      <div className="px-5 md:px-10 py-3 border-t border-white/10 text-center text-[11px] text-white/40">
        Платформа соответствует требованиям ФЗ-152, ФЗ-259, ФЗ-115. Инвестирование сопряжено с риском.
      </div>
    </footer>
  );
}

function FooterLink({ onClick, href, children }) {
  if (href) {
    return (
      <a href={href} className="block text-sm text-white/80 hover:text-orange transition-colors">
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className="block text-sm text-white/80 hover:text-orange transition-colors text-left">
      {children}
    </button>
  );
}
