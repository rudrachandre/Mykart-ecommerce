import { redirect } from 'next/navigation';

export default function TopLevelOrdersPage() {
  redirect('/account/orders');
}
