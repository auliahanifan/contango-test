import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { users, submissions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

export const ee = new EventEmitter();

const SubmitInput = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  skills: z.array(z.string()),
  experience: z.string(),
  pdfBase64: z.string(), // Base64 encoded PDF
});

export const cvRouter = createTRPCRouter({
  submit: publicProcedure
    .input(SubmitInput)
    .mutation(async ({ ctx, input }) => {
      // Create user
      const [user] = await ctx.db
        .insert(users)
        .values({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          skills: input.skills,
          experience: input.experience,
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error("Failed to create user");
      }

      // Generate submission ID
      const submissionId = uuidv4();

      // Define file path
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, `${submissionId}.pdf`);

      // Save PDF file
      const base64Data = input.pdfBase64.replace(
        /^data:application\/pdf;base64,/,
        "",
      );
      fs.writeFileSync(filePath, base64Data, "base64");

      // Create submission
      await ctx.db.insert(submissions).values({
        id: submissionId,
        userId: user.id,
        pdfPath: filePath,
        status: "PENDING",
      });

      // Trigger Mastra worker
      fetch('http://mastra_worker:8000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'cv-validate',
          payload: {
            submissionId,
            pdfPath: filePath,
            structuredData: {
              fullName: input.fullName,
              email: input.email,
              phone: input.phone,
              skills: input.skills,
              experience: input.experience,
            },
          },
        }),
      });

      return { submissionId };
    }),

  status: publicProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .subscription(({ input }) => {
      return observable<{ status: string; mismatches: any }>((emit) => {
        const onStatusChange = (data: { submissionId: string; status: string; mismatches: any }) => {
          if (data.submissionId === input.submissionId) {
            emit.next({ status: data.status, mismatches: data.mismatches });
          }
        };

        ee.on('statusChange', onStatusChange);

        return () => {
          ee.off('statusChange', onStatusChange);
        };
      });
    }),
});
