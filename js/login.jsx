// ===== Login + Forgot password =====

function LoginScreen({ onLogin }) {
  const toast = useToast();
  const [view, setView] = useState('login'); // login | forgot | sent
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState('');
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!login.trim()) er.login = 'Введите логин';
    if (!pass) er.pass = 'Введите пароль';
    else if (pass.length < 4) er.pass = 'Минимум 4 символа';
    setErrs(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); toast('Добро пожаловать, Айсулуу!', 'ok'); onLogin(); }, 1100);
  };
  const submitForgot = (e) => {
    e.preventDefault();
    const er = {};
    if (!email.trim()) er.email = 'Введите e-mail';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setView('sent'); }, 900);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 392 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 30 }}>
          <BrandMark size={108} />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', marginTop: 18 }}>
            ПСЦ - Travel Hub
          </div>
        </div>

        {view === 'login' && (
          <form onSubmit={submit} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field error={errs.login}>
              <Input leadIcon="user" placeholder="Логин" value={login}
                onChange={(e) => setLogin(e.target.value)} error={errs.login} />
            </Field>
            <Field error={errs.pass}>
              <Input leadIcon="lock" type={showPass ? 'text' : 'password'} placeholder="Пароль"
                value={pass} onChange={(e) => setPass(e.target.value)} error={errs.pass}
                trailIcon={showPass ? 'eyeOff' : 'eye'} onTrail={() => setShowPass((s) => !s)} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 2px 8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 14.5, color: 'var(--body)' }}>
                <Checkbox on={remember} onChange={setRemember} /> Запомнить меня
              </label>
            </div>
            <Button type="submit" variant="primary" size="lg" className="btn-block" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
            <button type="button" onClick={() => { setErrs({}); setView('forgot'); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: 14.5, marginTop: 6, fontFamily: 'inherit' }}>
              Восстановить пароль
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={submitForgot} className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14.5, margin: '0 0 4px' }}>
              Укажите e-mail — отправим ссылку для восстановления пароля.
            </p>
            <Field error={errs.email}>
              <Input leadIcon="mail" type="email" placeholder="E-mail" value={email}
                onChange={(e) => setEmail(e.target.value)} error={errs.email} />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="btn-block" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </Button>
            <button type="button" onClick={() => { setErrs({}); setView('login'); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: 14.5, marginTop: 6, fontFamily: 'inherit' }}>
              Вернуться ко входу
            </button>
          </form>
        )}

        {view === 'sent' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--green-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Icon name="mail" style={{ width: 32, height: 32, color: 'var(--green)' }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Письмо отправлено</div>
            <p style={{ color: 'var(--muted)', fontSize: 14.5, marginBottom: 22 }}>
              Мы отправили ссылку на <b style={{ color: 'var(--ink)' }}>{email}</b>. Проверьте почту.
            </p>
            <Button variant="secondary" className="btn-block" onClick={() => setView('login')}>Вернуться ко входу</Button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });
