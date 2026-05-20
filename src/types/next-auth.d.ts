import { Role, ServiceArea, StaffLevel } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      clientId: string | null;
      memberships: { area: ServiceArea; level: StaffLevel }[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    clientId: string | null;
    memberships: { area: ServiceArea; level: StaffLevel }[];
  }
}
