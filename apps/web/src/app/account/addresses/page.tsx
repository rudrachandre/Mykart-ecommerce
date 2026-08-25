import { cookies } from 'next/headers';
import { getAddresses } from '@/lib/api/users';
import { redirect } from 'next/navigation';
import AddressesClient from './AddressesClient';

export const metadata = {
  title: 'Saved Addresses | MyKart',
};

export default async function AddressesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) redirect('/login');

  const addresses = await getAddresses(token);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Saved Addresses</h1>
      <p className="text-muted-foreground mb-8">Manage your shipping and billing addresses.</p>
      
      <AddressesClient initialAddresses={addresses} token={token} />
    </div>
  );
}
