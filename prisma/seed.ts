/* eslint-disable no-console */
import { PrismaClient, Role, ServiceArea, StaffLevel, SpaceKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@igms.me";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-on-first-login";

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { hashedPassword, name, role: Role.ADMIN, isActive: true },
    create: {
      email,
      name,
      hashedPassword,
      role: Role.ADMIN,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  // Give admin a Lead membership in every area for convenience
  const areas = Object.values(ServiceArea);
  for (const area of areas) {
    await prisma.staffMembership.upsert({
      where: { userId_area: { userId: admin.id, area } },
      update: { level: StaffLevel.LEAD },
      create: { userId: admin.id, area, level: StaffLevel.LEAD },
    });
  }

  // Bootstrap a couple of internal spaces if none exist
  const spaces = [
    { name: "General", slug: "general", description: "Company-wide internal docs" },
    { name: "SOPs", slug: "sops", description: "Standard operating procedures" },
    { name: "Onboarding", slug: "onboarding", description: "Staff onboarding handbook" },
  ];
  for (const s of spaces) {
    await prisma.space.upsert({
      where: { slug: s.slug },
      update: {},
      create: { ...s, kind: SpaceKind.INTERNAL },
    });
  }

  console.log(`✓ Seeded admin user: ${admin.email}`);
  console.log(`✓ Seeded ${areas.length} area memberships`);
  console.log(`✓ Seeded ${spaces.length} internal spaces`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
