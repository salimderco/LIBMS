import { pgTable, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loanPolicyTable = pgTable("loan_policy", {
  id: serial("id").primaryKey(),
  studentLoanDays: integer("student_loan_days").notNull().default(14),
  facultyLoanDays: integer("faculty_loan_days").notNull().default(30),
  studentQuota: integer("student_quota").notNull().default(5),
  facultyQuota: integer("faculty_quota").notNull().default(10),
  maxRenewals: integer("max_renewals").notNull().default(2),
  fineRatePerDay: real("fine_rate_per_day").notNull().default(0.50),
  updatedBy: integer("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LoanPolicy = typeof loanPolicyTable.$inferSelect;
