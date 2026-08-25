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
    // Provisioning repair path: if the stored hash does not verify against
    // the canonical bootstrap password (e.g. hand-inserted row), re-hash it
    // with the project's standard bcrypt design. Role is enforced to ADMIN.
    console.log("Admin user already exists. Verifying provisioned credentials...");
    let dirty = false;
    const data: { passwordHash?: string; role?: "ADMIN" } = {};

    const ok = await bcrypt.compare(password, adminUser.passwordHash);
    if (!ok) {
      console.log("Stored hash does not verify — resetting admin password (bcrypt, cost 12).");
      data.passwordHash = await bcrypt.hash(password, 12);
      dirty = true;
    }
    if (adminUser.role !== "ADMIN") {
      console.log(`Role was '${adminUser.role}' — promoting to ADMIN.`);
      data.role = "ADMIN";
      dirty = true;
    }
    if (dirty) {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data,
      });
      console.log("Admin account provisioned successfully.");
    } else {
      console.log("Admin credentials verified.");
    }
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
