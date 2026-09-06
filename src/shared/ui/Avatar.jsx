

function Avatar({ src, name = '', size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  if (src) return <img className="avatar" src={src} alt={name} style={{ width: size, height: size }} />;
  return <span className="avatar-ph" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}

export { Avatar };
