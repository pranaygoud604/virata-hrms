import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const department = await prisma.department.upsert({
    where: { name: 'Site Operations' },
    create: { name: 'Site Operations' },
    update: {},
  });

  const designation = await prisma.designation.upsert({
    where: { title_departmentId: { title: 'HR Administrator', departmentId: department.id } },
    create: { title: 'HR Administrator', departmentId: department.id },
    update: {},
  });

  await prisma.shift.upsert({
    where: { name: 'General Shift' },
    create: {
      name: 'General Shift',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMinutes: 10,
    },
    update: {},
  });

  const leaveTypes = [
    { name: 'Casual Leave', defaultAnnualDays: 12, carryForwardAllowed: false, maxCarryForwardDays: 0, isPaid: true },
    { name: 'Sick Leave', defaultAnnualDays: 8, carryForwardAllowed: false, maxCarryForwardDays: 0, isPaid: true },
    { name: 'Earned Leave', defaultAnnualDays: 15, carryForwardAllowed: true, maxCarryForwardDays: 30, isPaid: true },
    { name: 'Work From Home', defaultAnnualDays: 0, carryForwardAllowed: false, maxCarryForwardDays: 0, isPaid: true },
    { name: 'Comp Off', defaultAnnualDays: 0, carryForwardAllowed: false, maxCarryForwardDays: 0, isPaid: true },
  ];
  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { name: leaveType.name },
      create: leaveType,
      update: leaveType,
    });
  }

  await prisma.geoFenceLocation.upsert({
    where: { id: 'seed-head-office' },
    create: {
      id: 'seed-head-office',
      name: 'Head Office — Banjara Hills, Hyderabad',
      latitude: 17.4126,
      longitude: 78.4482,
      radiusMeters: 200,
    },
    update: {},
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@virata-hr.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'VH-SEED-0001' },
    create: {
      employeeCode: 'VH-SEED-0001',
      firstName: 'System',
      lastName: 'Administrator',
      departmentId: department.id,
      designationId: designation.id,
      dateOfJoining: new Date(),
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.SUPER_ADMIN,
      employeeId: adminEmployee.id,
    },
    update: {},
  });

  // eslint-disable-next-line no-console
  console.log(`Seed complete. Login with ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
