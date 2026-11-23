import { PublicProposal } from '../../../src/modules/proposals/ui/PublicProposal.jsx';
export const metadata = { title: 'Ваше предложение · ПСЦ', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function OfferPage({ params }) {
  const { token } = await params;
  return <PublicProposal token={token} />;
}
