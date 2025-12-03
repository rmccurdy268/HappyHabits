import dotenv from "dotenv";
dotenv.config();

export const config = {
  db: {
    url: "https://dnykjjazpblguunkvwrw.supabase.co",
    publishableKey: process.env.PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SERVICE_ROLE_KEY,
  },
};
