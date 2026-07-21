import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

/**
 * Cree (ou reutilise) le compte admin Aymen dans Supabase Auth via l'Admin API.
 * Usage : ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
 */
config();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis (en variables d\'environnement)');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SECRET_KEY as string,
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      console.log(`Compte admin ${email} existe deja, rien a faire.`);
      return;
    }
    throw error;
  }

  console.log(`Compte admin cree : ${data.user?.email} (id ${data.user?.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
