import { ServiceArea } from "@prisma/client";

export const SERVICE_AREAS: ServiceArea[] = [
  "CRM",
  "CUSTOMER_SUPPORT",
  "DESIGN",
  "AFFILIATION",
  "MARKETING",
  "PAYMENTS_FRAUD",
];

export const SERVICE_AREA_LABEL: Record<ServiceArea, string> = {
  CRM: "CRM",
  CUSTOMER_SUPPORT: "Customer Support",
  DESIGN: "Design",
  AFFILIATION: "Affiliation",
  MARKETING: "Marketing",
  PAYMENTS_FRAUD: "Payments & Fraud",
};

export const SERVICE_AREA_SHORT: Record<ServiceArea, string> = {
  CRM: "CRM",
  CUSTOMER_SUPPORT: "CS",
  DESIGN: "DSGN",
  AFFILIATION: "AFF",
  MARKETING: "MKT",
  PAYMENTS_FRAUD: "P&F",
};

export function serviceAreaLabel(a: ServiceArea): string {
  return SERVICE_AREA_LABEL[a];
}
