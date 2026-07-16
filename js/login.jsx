import { useState } from 'react';
import { Icon } from './icons';
import { useToast } from './ui';

// ===== Auth screen: Login · Recovery · Demo · MAX · SMS one-time code =====
// Split-screen: marketing hero (left) + auth column (right).

const LP_STYLES = `
.lp-root{height:100%;overflow:hidden;display:flex;flex-direction:column;padding:13px 13px 6px;position:relative;background:#eef0fb;color:var(--body)}
.lp-main{flex:1;min-height:0;display:flex;gap:14px;overflow:hidden}
.lp-left{flex:1;min-width:0;position:relative;overflow:hidden;margin-right:-15px;padding:22px 39px;display:flex;flex-direction:column;border-radius:18px;background:transparent}
.lp-right{width:512px;max-width:100%;flex:0 0 512px;display:flex;flex-direction:column;padding:24px 34px 14px 16px;overflow-y:auto;background:transparent}
@media(max-width:1000px){.lp-root{height:auto;min-height:100vh;overflow:visible;padding:0}.lp-main{overflow:visible;display:block}.lp-left{display:none}.lp-right{width:100%;flex-basis:100%;padding:26px 20px 24px}}

.lp-brand{display:flex;align-items:center;gap:13px}
.lp-brand-ic{width:46px;height:46px;border-radius:13px;background:linear-gradient(140deg,#2566ff,#5a5af0);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 8px 20px rgba(37,102,255,.35)}
.lp-brand-name{font-weight:800;font-size:21px;letter-spacing:-.02em;color:var(--ink);line-height:1.15}
.lp-brand-name b{color:var(--blue);font-weight:800}
.lp-brand-sub{font-size:12.5px;color:var(--muted);margin-top:2px;max-width:250px;line-height:1.4}

.lp-hero-h{font-size:30px;line-height:1.2;font-weight:800;letter-spacing:-.025em;color:var(--ink);margin:8px 0 0;max-width:410px;position:relative;z-index:2}
.lp-hero-h span{color:var(--blue);display:block}

.lp-stage{position:absolute;z-index:6;left:0;right:0;top:96px;bottom:0;display:flex;align-items:flex-start;justify-content:center;pointer-events:none}
.lp-podium{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:258px;display:flex;flex-direction:column;gap:11px;z-index:2}
.lp-glass{background:rgba(255,255,255,.85);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.95);border-radius:15px;box-shadow:0 18px 40px rgba(37,60,120,.15);padding:12px 15px}
.lp-pass{display:flex;align-items:center;gap:12px}
.lp-pass-code{font-size:18px;font-weight:800;letter-spacing:.04em;color:var(--ink);display:flex;align-items:center;gap:8px}
.lp-pass-code svg{color:var(--blue);width:18px;height:18px}
.lp-seg{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#2c3244}
.lp-seg .muted{color:#8a92a4;font-weight:600;font-size:12px}
.lp-seg svg{color:var(--blue);width:15px;height:15px}

.lp-chip{position:absolute;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.95);border-radius:14px;padding:10px 13px;box-shadow:0 12px 28px rgba(37,60,120,.13);display:flex;align-items:center;gap:9px;font-size:12.3px;font-weight:600;color:#2c3244;max-width:158px;z-index:3;line-height:1.22}
.lp-chip-ic{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:0 0 28px;color:#fff}
.lp-chip svg.big{width:16px;height:16px}
.lp-spark{position:absolute;color:#9db6ff;opacity:.75;z-index:1}

.lp-trust{margin-top:auto;background:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.9);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:0 12px 30px rgba(37,60,120,.1)}
.lp-trust-ic{width:38px;height:38px;border-radius:11px;background:var(--green-bg-2);color:var(--green);display:flex;align-items:center;justify-content:center;flex:0 0 38px}
.lp-trust-t{font-size:13.5px;font-weight:700;color:#1e2434}
.lp-trust-s{font-size:12px;color:var(--muted);margin-top:1px}
.lp-sla-row{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
.lp-sla{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid #dde5f5;border-radius:9px;padding:5px 9px;font-size:11.5px;font-weight:700;color:#3a4152;white-space:nowrap}
.lp-sla svg{width:13px;height:13px;color:var(--blue)}

.lp-card{background:rgba(255,255,255,.97);border:1px solid rgba(235,237,242,.9);border-radius:20px;padding:26px 30px 24px;box-shadow:0 16px 42px rgba(16,23,38,.055)}
.lp-h1{font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--ink);margin:0}
.lp-sub{color:var(--muted);font-size:13.5px;margin:4px 0 0;line-height:1.4}
.lp-lbl{font-size:12.5px;font-weight:600;color:#3a4152;margin-bottom:4px;display:block}
.lp-input{width:100%;height:40px;border:1.5px solid var(--field-line);border-radius:var(--r-input);padding:0 15px;font-size:14.5px;font-family:inherit;color:var(--ink);background:#fff;transition:.15s}
.lp-input::placeholder{color:#aeb5c4}
.lp-input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px rgba(37,102,255,.13)}
.lp-input.err{border-color:var(--red-strong);box-shadow:0 0 0 4px rgba(239,68,68,.1)}
.lp-input-wrap{position:relative}
.lp-eye{position:absolute;right:15px;top:50%;transform:translateY(-50%);color:#9aa2b2;cursor:pointer;width:20px;height:20px}
.lp-errtxt{color:var(--red-strong);font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:5px}
.lp-errtxt svg{width:13px;height:13px}
.lp-link{color:var(--blue);font-weight:600;font-size:13.5px;background:none;border:none;cursor:pointer;font-family:inherit;padding:0}
.lp-link:hover{text-decoration:underline}
.lp-btn{width:100%;height:42px;border-radius:var(--r-input);border:none;font-size:14.5px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:.15s}
.lp-btn-primary{background:var(--blue);color:#fff;box-shadow:0 10px 24px rgba(37,102,255,.28)}
.lp-btn-primary:hover{background:var(--blue-hover)}
.lp-btn-primary:active{background:var(--blue-press)}
.lp-btn-primary:disabled{opacity:.6;cursor:default}
.lp-btn-out{background:#fff;color:var(--ink);border:1.5px solid var(--field-line)}
.lp-btn-out:hover{border-color:#cfd5df;background:var(--hover)}
.lp-btn-ghost{background:none;border:none;color:var(--muted);font-weight:600;font-family:inherit;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px}
.lp-btn-ghost:hover{color:var(--blue)}
.lp-or{display:flex;align-items:center;gap:14px;color:#9aa2b2;font-size:13px;margin:11px 0}
.lp-or::before,.lp-or::after{content:'';flex:1;height:1px;background:var(--line)}
.lp-pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:7px;background:var(--blue-soft);color:var(--blue-soft-text);font-size:12px;font-weight:700}
.lp-max-ic{width:27px;height:27px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:0 0 27px;overflow:hidden}
.lp-max-ic img{width:100%;height:100%;display:block;object-fit:contain}
.lp-cap{text-align:center;color:#9aa2b2;font-size:12.5px;margin:8px 0 0;line-height:1.45}

.lp-demo{margin-top:10px;background:#eef0fb;border:1px solid #dde3f2;border-radius:16px;padding:18px 22px 11px;min-height:186px;position:relative;overflow:hidden}
.lp-demo-h{font-size:16px;font-weight:800;color:var(--ink);margin:0}
.lp-demo-p{color:#5b6274;font-size:13px;margin:5px 0 9px;max-width:320px;line-height:1.4}
.lp-check{display:flex;align-items:center;gap:9px;font-size:13px;color:#3a4152;margin:4px 0}
.lp-check svg{color:var(--green);width:16px;height:16px;flex:0 0 16px}
.lp-seat{position:absolute;right:-8px;bottom:-2px;width:200px;height:152px;overflow:hidden}
.lp-seat img{width:100%;height:100%;object-fit:contain;display:block}
@media(max-width:520px){.lp-seat{display:none}.lp-demo-p{max-width:none}}

.lp-hero-img{width:auto;max-width:none;height:680px;object-fit:contain;flex:0 0 auto;margin-left:110px;display:block}

.lp-foot{flex:0 0 auto;z-index:5;display:flex;align-items:center;justify-content:space-between;color:#8d96a8;font-size:12px;gap:10px;padding:8px 40px 2px}
.lp-foot-links{display:flex;align-items:center;gap:16px}
.lp-foot a{color:var(--gray-text);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.lp-foot a:hover{color:var(--blue)}

.lp-float{animation:lpFloat 6s ease-in-out infinite}
.lp-float.d1{animation-delay:.6s}.lp-float.d2{animation-delay:1.2s}.lp-float.d3{animation-delay:1.8s}
@keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.lp-spin{animation:lpSpin 1s linear infinite}
@keyframes lpSpin{to{transform:rotate(360deg)}}
@media(max-height:1000px) and (min-width:1001px){.lp-root{padding-bottom:6px}.lp-right{padding-top:16px}.lp-card{padding-top:24px;padding-bottom:24px}.lp-demo{min-height:190px;padding-top:15px;padding-bottom:12px}}
@media(max-height:820px) and (min-width:1001px){.lp-root{padding-bottom:6px}.lp-card{padding-top:20px;padding-bottom:20px}.lp-demo{min-height:170px}}
`;

function LoginScreen({ onLogin }) {
  const toast = useToast();
  // login | forgot | sent | demo | demoSent | max | sms | smsCode
  const [view, setView] = useState('login');
  const [ident, setIdent] = useState('');       // email или телефон
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [recover, setRecover] = useState('');    // e-mail/телефон для восстановления
  const [phone, setPhone] = useState('');        // телефон для SMS-входа
  const [code, setCode] = useState('');          // одноразовый код
  const [demo, setDemo] = useState({ name: '', company: '', email: '', phone: '' });
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);

  const go = (v) => { setErrs({}); setLoading(false); setView(v); };
  const setD = (k, v) => setDemo((d) => ({ ...d, [k]: v }));

  // --- handlers ---
  const submitLogin = (e) => {
    e.preventDefault();
    const er = {};
    if (!ident.trim()) er.ident = 'Введите email или телефон';
    if (!pass) er.pass = 'Введите пароль';
    else if (pass.length < 4) er.pass = 'Минимум 4 символа';
    setErrs(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setTimeout(() => { toast('Добро пожаловать, Айсулуу!', 'ok'); onLogin(); }, 1000);
  };
  const submitForgot = (e) => {
    e.preventDefault();
    if (!recover.trim()) { setErrs({ recover: 'Введите email или телефон' }); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setView('sent'); }, 800);
  };
  const startMax = () => {
    setView('max');
    setTimeout(() => { toast('Вход подтверждён в мессенджере MAX', 'ok'); onLogin(); }, 2600);
  };
  const sendSms = (e) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) { setErrs({ phone: 'Введите номер телефона' }); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setErrs({}); setCode(''); setView('smsCode'); toast('Код отправлен по SMS', 'ok'); }, 800);
  };
  const submitSms = (e) => {
    e.preventDefault();
    if (code.replace(/\D/g, '').length < 4) { setErrs({ code: 'Введите код из SMS' }); return; }
    setLoading(true);
    setTimeout(() => { toast('Вход выполнен', 'ok'); onLogin(); }, 800);
  };
  const submitDemo = (e) => {
    e.preventDefault();
    const er = {};
    if (!demo.name.trim()) er.name = 'Укажите имя';
    if (!demo.company.trim()) er.company = 'Укажите компанию';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(demo.email)) er.email = 'Некорректный e-mail';
    setErrs(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setView('demoSent'); }, 900);
  };

  return (
    <div className="lp-root">
      <style dangerouslySetInnerHTML={{ __html: LP_STYLES }} />

      <div className="lp-main">

      {/* ================= LEFT · marketing hero ================= */}
      <div className="lp-left">
        <div className="lp-brand">
          <div className="lp-brand-ic"><Icon name="briefcase" style={{ width: 24, height: 24 }} /></div>
          <div>
            <div className="lp-brand-name">ПСЦ <b>TRAVEL HUB</b></div>
            <div className="lp-brand-sub">CRM для управления поездками и командировками</div>
          </div>
        </div>

        <h1 className="lp-hero-h">Управляйте поездками<br />вашей компании <span>легко и эффективно</span></h1>

        <div className="lp-stage">
          <img className="lp-hero-img" src="assets/hero2.png" alt="Управление поездками: авиабилеты, отели, документы и маршруты" />
        </div>
      </div>

      {/* ================= RIGHT · auth column ================= */}
      <div className="lp-right">
        <div style={{ width: '100%', flex: '0 0 auto' }}>

          {/* ---- LOGIN ---- */}
          {view === 'login' && (
            <div className="fade-in">
              <div className="lp-card">
                <h2 className="lp-h1">Вход в систему</h2>
                <p className="lp-sub">Добро пожаловать! Войдите в свой аккаунт.</p>
                <form onSubmit={submitLogin} style={{ marginTop: 22 }}>
                  <label className="lp-lbl">Email или телефон</label>
                  <input className={'lp-input' + (errs.ident ? ' err' : '')} placeholder="Введите email или телефон"
                    value={ident} onChange={(e) => setIdent(e.target.value)} />
                  {errs.ident && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.ident}</div>}

                  <label className="lp-lbl" style={{ marginTop: 14 }}>Пароль</label>
                  <div className="lp-input-wrap">
                    <input className={'lp-input' + (errs.pass ? ' err' : '')} type={showPass ? 'text' : 'password'}
                      placeholder="Введите пароль" style={{ paddingRight: 44 }}
                      value={pass} onChange={(e) => setPass(e.target.value)} />
                    <Icon name={showPass ? 'eyeOff' : 'eye'} className="lp-eye" style={{ width: 20, height: 20 }} onClick={() => setShowPass((s) => !s)} />
                  </div>
                  {errs.pass && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.pass}</div>}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', margin: '10px 0 16px' }}>
                    <button type="button" className="lp-link" onClick={() => go('forgot')}>Забыли пароль?</button>
                  </div>

                  <button type="submit" className="lp-btn lp-btn-primary" disabled={loading}>
                    {loading ? <><Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Вход…</> : 'Войти'}
                  </button>
                </form>

                <div className="lp-or">или</div>

                <button type="button" className="lp-btn lp-btn-out" onClick={startMax}>
                  <span className="lp-max-ic"><img src="assets/max-logo.png" alt="MAX" /></span>
                  Войти через MAX
                  <span className="lp-pill" style={{ marginLeft: 4 }}>Рекомендуем</span>
                </button>
                <p className="lp-cap">Быстрый и безопасный вход через мессенджер MAX</p>
              </div>

              {/* demo promo */}
              <div className="lp-demo">
                <h3 className="lp-demo-h">Попробуйте Travel Hub бесплатно</h3>
                <p className="lp-demo-p">Полный доступ ко всем возможностям системы на 14 дней без ограничений</p>
                {['Все функции без ограничений', 'Без привязки карты', 'Настройка и помощь на старте', 'Демо-данные для тестирования'].map((t) => (
                  <div className="lp-check" key={t}><Icon name="check" strokeWidth={3} />{t}</div>
                ))}
                <button className="lp-btn lp-btn-primary" style={{ marginTop: 10, maxWidth: 225 }} onClick={() => go('demo')}>
                  Получить демо-доступ <Icon name="arrowRight" style={{ width: 18, height: 18 }} />
                </button>
                <div className="lp-seat"><img src="assets/login-seat.png" alt="Комфортное кресло" /></div>
              </div>
            </div>
          )}

          {/* ---- FORGOT ---- */}
          {view === 'forgot' && (
            <div className="fade-in lp-card">
              <button type="button" className="lp-btn-ghost" onClick={() => go('login')} style={{ marginBottom: 14 }}><Icon name="chevLeft" style={{ width: 16, height: 16 }} />Ко входу</button>
              <h2 className="lp-h1">Восстановление пароля</h2>
              <p className="lp-sub">Укажите email или телефон — отправим инструкцию для сброса пароля.</p>
              <form onSubmit={submitForgot} style={{ marginTop: 22 }}>
                <label className="lp-lbl">Email или телефон</label>
                <input className={'lp-input' + (errs.recover ? ' err' : '')} placeholder="Введите email или телефон"
                  value={recover} onChange={(e) => setRecover(e.target.value)} />
                {errs.recover && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.recover}</div>}
                <button type="submit" className="lp-btn lp-btn-primary" style={{ marginTop: 20 }} disabled={loading}>
                  {loading ? <><Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Отправка…</> : 'Отправить инструкцию'}
                </button>
              </form>
            </div>
          )}

          {/* ---- SENT (recovery) ---- */}
          {view === 'sent' && (
            <div className="fade-in lp-card" style={{ textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#e4f7ec', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon name="mail" style={{ width: 32, height: 32, color: '#1f9d57' }} />
              </div>
              <h2 className="lp-h1" style={{ fontSize: 22 }}>Инструкция отправлена</h2>
              <p className="lp-sub" style={{ marginBottom: 22 }}>Мы отправили ссылку для сброса пароля на <b style={{ color: '#141a2c' }}>{recover}</b>. Проверьте почту или SMS.</p>
              <button className="lp-btn lp-btn-out" onClick={() => go('login')}>Вернуться ко входу</button>
            </div>
          )}

          {/* ---- MAX ---- */}
          {view === 'max' && (
            <div className="fade-in lp-card" style={{ textAlign: 'center' }}>
              <div style={{ width: 74, height: 74, borderRadius: 20, background: '#2aa5ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: '#fff', boxShadow: '0 14px 30px rgba(42,165,255,.35)' }}>
                <Icon name="chat" style={{ width: 34, height: 34 }} />
              </div>
              <h2 className="lp-h1" style={{ fontSize: 22 }}>Подтвердите вход в MAX</h2>
              <p className="lp-sub" style={{ marginBottom: 20 }}>Мы отправили запрос в мессенджер MAX. Откройте приложение и подтвердите вход.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--blue)', fontWeight: 600, fontSize: 14, marginBottom: 22 }}>
                <Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Ожидаем подтверждения…
              </div>
              <button className="lp-btn lp-btn-out" onClick={() => go('login')}>Отмена</button>
            </div>
          )}

          {/* ---- SMS: phone ---- */}
          {view === 'sms' && (
            <div className="fade-in lp-card">
              <button type="button" className="lp-btn-ghost" onClick={() => go('login')} style={{ marginBottom: 14 }}><Icon name="chevLeft" style={{ width: 16, height: 16 }} />Ко входу</button>
              <h2 className="lp-h1">Вход по SMS-коду</h2>
              <p className="lp-sub">Введите номер телефона — отправим одноразовый код для входа.</p>
              <form onSubmit={sendSms} style={{ marginTop: 22 }}>
                <label className="lp-lbl">Телефон</label>
                <div className="lp-input-wrap">
                  <input className={'lp-input' + (errs.phone ? ' err' : '')} type="tel" placeholder="+7 (___) ___-__-__"
                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                {errs.phone && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.phone}</div>}
                <button type="submit" className="lp-btn lp-btn-primary" style={{ marginTop: 20 }} disabled={loading}>
                  {loading ? <><Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Отправка…</> : 'Получить код'}
                </button>
              </form>
            </div>
          )}

          {/* ---- SMS: code ---- */}
          {view === 'smsCode' && (
            <div className="fade-in lp-card">
              <button type="button" className="lp-btn-ghost" onClick={() => go('sms')} style={{ marginBottom: 14 }}><Icon name="chevLeft" style={{ width: 16, height: 16 }} />Изменить номер</button>
              <h2 className="lp-h1">Введите код</h2>
              <p className="lp-sub">Мы отправили код на <b style={{ color: '#141a2c' }}>{phone}</b>.</p>
              <form onSubmit={submitSms} style={{ marginTop: 22 }}>
                <label className="lp-lbl">Код из SMS</label>
                <input className={'lp-input' + (errs.code ? ' err' : '')} inputMode="numeric" placeholder="• • • •  • •"
                  style={{ letterSpacing: '.35em', fontWeight: 700, fontSize: 18, textAlign: 'center' }}
                  value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
                {errs.code && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.code}</div>}
                <button type="submit" className="lp-btn lp-btn-primary" style={{ marginTop: 20 }} disabled={loading}>
                  {loading ? <><Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Проверка…</> : 'Войти'}
                </button>
                <p className="lp-cap" style={{ marginTop: 14 }}>
                  Не пришёл код? <button type="button" className="lp-link" onClick={() => toast('Код отправлен повторно', 'ok')}>Отправить ещё раз</button>
                </p>
              </form>
            </div>
          )}

          {/* ---- DEMO form ---- */}
          {view === 'demo' && (
            <div className="fade-in lp-card">
              <button type="button" className="lp-btn-ghost" onClick={() => go('login')} style={{ marginBottom: 14 }}><Icon name="chevLeft" style={{ width: 16, height: 16 }} />Ко входу</button>
              <h2 className="lp-h1">Демо-доступ на 14 дней</h2>
              <p className="lp-sub">Оставьте контакты — активируем демо-стенд с тестовыми данными и поможем на старте.</p>
              <form onSubmit={submitDemo} style={{ marginTop: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="lp-lbl">Имя</label>
                    <input className={'lp-input' + (errs.name ? ' err' : '')} placeholder="Ваше имя" value={demo.name} onChange={(e) => setD('name', e.target.value)} />
                    {errs.name && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.name}</div>}
                  </div>
                  <div>
                    <label className="lp-lbl">Компания</label>
                    <input className={'lp-input' + (errs.company ? ' err' : '')} placeholder="Название" value={demo.company} onChange={(e) => setD('company', e.target.value)} />
                    {errs.company && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.company}</div>}
                  </div>
                </div>
                <label className="lp-lbl" style={{ marginTop: 14 }}>Рабочий e-mail</label>
                <input className={'lp-input' + (errs.email ? ' err' : '')} type="email" placeholder="you@company.ru" value={demo.email} onChange={(e) => setD('email', e.target.value)} />
                {errs.email && <div className="lp-errtxt"><Icon name="alertCircle" />{errs.email}</div>}
                <label className="lp-lbl" style={{ marginTop: 14 }}>Телефон <span style={{ color: '#aeb5c4', fontWeight: 500 }}>· необязательно</span></label>
                <input className="lp-input" type="tel" placeholder="+7 (___) ___-__-__" value={demo.phone} onChange={(e) => setD('phone', e.target.value)} />
                <button type="submit" className="lp-btn lp-btn-primary" style={{ marginTop: 22 }} disabled={loading}>
                  {loading ? <><Icon name="loader" className="lp-spin" style={{ width: 18, height: 18 }} />Отправка…</> : <>Получить демо-доступ <Icon name="arrowRight" style={{ width: 18, height: 18 }} /></>}
                </button>
              </form>
            </div>
          )}

          {/* ---- DEMO sent ---- */}
          {view === 'demoSent' && (
            <div className="fade-in lp-card" style={{ textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--blue-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon name="sparkles" style={{ width: 32, height: 32, color: 'var(--blue)' }} />
              </div>
              <h2 className="lp-h1" style={{ fontSize: 22 }}>Заявка принята!</h2>
              <p className="lp-sub" style={{ marginBottom: 22 }}>Мы отправили доступ к демо-стенду на <b style={{ color: '#141a2c' }}>{demo.email}</b>. Менеджер свяжется с вами в ближайшее время.</p>
              <button className="lp-btn lp-btn-out" onClick={() => go('login')}>Вернуться ко входу</button>
            </div>
          )}

        </div>
      </div>

      </div>{/* /lp-main */}

      <div className="lp-foot">
        <span>© 2024 ПСЦ Travel Hub. Все права защищены.</span>
        <div className="lp-foot-links">
          <a onClick={() => toast('Политика конфиденциальности')}>Политика конфиденциальности</a>
          <span>·</span>
          <a onClick={() => toast('Техподдержка: support@travelhub.ru')}><Icon name="headphones" style={{ width: 14, height: 14 }} />Техподдержка</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });



export { LP_STYLES, LoginScreen };
