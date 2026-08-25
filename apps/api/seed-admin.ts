import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No DATABASE_URL");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const email = "admin@example.com";
  const password = "password123";
  
  let adminUser = await prisma.user.findUnique({ where: { email } });
  
  if (!adminUser) {
    console.log("No admin user found. Creating admin@example.com...");
    const passwordHash = await bcrypt.hash(password, 12);
    adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Admin User",
        role: "ADMIN"
      }
    });
    console.log("Created Admin User successfully.");
  } else {
    console.log("Admin user already exists.");
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
