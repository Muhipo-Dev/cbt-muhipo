import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'SISWA') {
    redirect('/siswa');
  } else if (user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'PROKTOR') {
    redirect('/admin');
  } else if (user.role === 'GURU') {
    redirect('/guru');
  }

  redirect('/login');
}

