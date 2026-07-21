import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

/**
 * Cree le bucket Storage "founders" (public en lecture), y uploade les 3
 * photos deja utilisees par techwall-site, puis seed/upsert la table Founder
 * avec les vraies bios et liens LinkedIn.
 * Usage : npm run founders:seed
 */
config();

type SupabaseClientType = any;

const BUCKET = 'founders';
const SITE_TEAM_DIR = resolve(__dirname, '../../../techwall-site/assets/team');

const FOUNDERS = [
  {
    fileName: 'aymen-sellaouti.jpg',
    name: 'Aymen Sellaouti',
    role: 'Co-fondateur — Maître assistant à l\'INSAT',
    bio: "Enseigne à l'INSAT depuis 2013, docteur en informatique (Université de Strasbourg, 2014). Formateur freelance sur Symfony, Angular et NestJs.",
    linkedin: 'https://www.linkedin.com/in/aymen-sellaouti-b0427731/',
  },
  {
    fileName: 'lilia-sfaxi.jpg',
    name: 'Lilia Sfaxi',
    role: 'Co-fondatrice — Maître assistante à l\'INSAT',
    bio: 'Docteur-ingénieur en informatique (Grenoble / Université de Tunis El Manar), spécialiste Big Data. À l\'origine des playlists Hadoop & Compagnie et Atelier Spark.',
    linkedin: 'https://www.linkedin.com/in/liliasfaxi/',
  },
  {
    fileName: 'souheib-yousfi.jpg',
    name: 'Souheib Yousfi',
    role: 'Co-fondateur — Enseignant-chercheur',
    bio: 'Enseignant-chercheur en informatique, spécialisé en sécurité (protocoles de vote électronique, blockchain). Contribue aux contenus pentest et cybersécurité de la chaîne.',
    linkedin: 'https://www.linkedin.com/in/souheib-yousfi-5b455810/',
  },
];

async function ensureBucket(supabase: SupabaseClientType) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
  console.log(`Bucket "${BUCKET}" cree.`);
}

async function uploadPhoto(supabase: SupabaseClientType, fileName: string) {
  const filePath = resolve(SITE_TEAM_DIR, fileName);
  const fileBuffer = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SECRET_KEY as string,
  );
  const prisma = new PrismaClient();

  await ensureBucket(supabase);

  for (const founder of FOUNDERS) {
    const photoUrl = await uploadPhoto(supabase, founder.fileName);
    const existing = await prisma.founder.findFirst({ where: { name: founder.name } });
    if (existing) {
      await prisma.founder.update({
        where: { id: existing.id },
        data: { role: founder.role, bio: founder.bio, linkedin: founder.linkedin, photoUrl },
      });
    } else {
      await prisma.founder.create({
        data: { name: founder.name, role: founder.role, bio: founder.bio, linkedin: founder.linkedin, photoUrl },
      });
    }
    console.log(`Founder "${founder.name}" seed OK -> ${photoUrl}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
