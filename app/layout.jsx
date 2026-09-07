import './globals.css';
import '../src/styles/modules/receipt-ui-fixes.css';
import '../src/styles/modules/receipt-workflow.css';
import '../src/styles/components/location-autocomplete.css';
import '../src/styles/components/compact-steppers.css';

export const metadata = {
  title: 'ПСЦ — Travel Hub · CRM',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
