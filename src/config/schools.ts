export const SCHOOLS = {
  NGP: { id: "ngp", name: "Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur" },
  JND: { id: "jnd", name: "Jawahar Navodaya Vidyalaya, Jindi" },
} as const;

export type SchoolCode = keyof typeof SCHOOLS;
