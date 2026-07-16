/** @type {import('next').NextConfig} */
const nextConfig = {
  // StrictMode отключён сознательно: раньше приложение работало без него,
  // а двойной вызов эффектов в dev менял бы поведение (дублировались бы тосты и т.п.)
  reactStrictMode: false,
};

export default nextConfig;
