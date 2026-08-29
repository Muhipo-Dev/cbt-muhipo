import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'SISWA') {
    redirect('/siswa');
  } else if (user.role === 'PROKTOR') {
    redirect('/proktor');
  } else if (user.role === 'GURU') {
    redirect('/guru');
  } else if (user.role === 'ADMIN') {
    redirect('/admin');
  }

  redirect('/login');
}
