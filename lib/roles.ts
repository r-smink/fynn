/** member: eigen chats · admin: + beheer (users, agents, brands, kennis) · superadmin: + alle chats/usage */
export type Role = "member" | "admin" | "superadmin";

export const isAdminRole = (role?: string | null) => role === "admin" || role === "superadmin";
export const isSuperadmin = (role?: string | null) => role === "superadmin";
