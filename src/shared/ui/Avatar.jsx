

import { useEffect, useState } from 'react';

function Avatar({ src, name = '', size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  // Файл аватара может быть недоступен (удалён, нет прав): вместо «битой»
  // картинки показываем инициалы.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (src && !failed) {
    return <img className="avatar" src={src} alt={name} onError={() => setFailed(true)} style={{ width: size, height: size }} />;
  }
  return <span className="avatar-ph" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

export { Avatar };
