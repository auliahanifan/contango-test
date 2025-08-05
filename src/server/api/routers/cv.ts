import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { users, submissions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

import { observable } from "@trpc/server/observable";
import { ee } from "~/server/events";
import { getPdfText, validateCv } from "~/server/api/service/ai";

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

      // Save PDF file to uploads directory
      // Use /app/uploads in Docker, ./uploads locally
      const uploadsDir =
        process.env.NODE_ENV === "production" ? "/app/uploads" : "./uploads";
      try {
        mkdirSync(uploadsDir, { recursive: true });
      } catch {
        // Directory might already exist
      }

      const pdfPath = join(uploadsDir, `${submissionId}.pdf`);
      const pdfBuffer = Buffer.from(
        input.pdfBase64.split(",")[1] ?? input.pdfBase64,
        "base64",
      );
      writeFileSync(pdfPath, pdfBuffer);

      // Create submission
      await ctx.db.insert(submissions).values({
        id: submissionId,
        userId: user.id,
        pdfPath: pdfPath,
        status: "PENDING",
      });

      // Perform inline validation
      void (async () => {
        try {
          console.log(
            "Starting validation for submission:",
            submissionId,
            "PDF path:",
            pdfPath,
          );

          const cvText = await getPdfText(pdfPath);
          console.log(
            "PDF text extracted successfully, proceeding with validation",
          );

          const validationResult = await validateCv(cvText, {
            fullName: input.fullName,
            email: input.email,
            phone: input.phone,
            skills: input.skills,
            experience: input.experience,
          });

          console.log("Validation completed:", validationResult.status);

          await ctx.db
            .update(submissions)
            .set({
              status: validationResult.status as
                | "PENDING"
                | "SUCCESS"
                | "FAILED",
              mismatches: validationResult.mismatches,
            })
            .where(eq(submissions.id, submissionId));

          ee.emit("statusChange", {
            submissionId,
            status: validationResult.status,
            mismatches: validationResult.mismatches,
          });
        } catch (error) {
          console.error(
            "Validation failed for submission:",
            submissionId,
            "Error:",
            error,
          );

          let errorMessage =
            "We encountered an issue while processing your CV. Please try again.";

          if (error instanceof Error) {
            if (
              error.message.includes("PDF") ||
              error.message.includes("file")
            ) {
              errorMessage = error.message;
            } else if (
              error.message.includes("OpenAI") ||
              error.message.includes("API")
            ) {
              errorMessage =
                "Our validation service is temporarily unavailable. Please try again in a few moments.";
            } else if (
              error.message.includes("network") ||
              error.message.includes("timeout")
            ) {
              errorMessage =
                "Network error occurred. Please check your connection and try again.";
            }
          }

          const errorDetails = { error: errorMessage };

          try {
            await ctx.db
              .update(submissions)
              .set({
                status: "FAILED",
                mismatches: errorDetails,
              })
              .where(eq(submissions.id, submissionId));

            console.log(
              "Emitting failure status for submission:",
              submissionId,
            );
            ee.emit("statusChange", {
              submissionId,
              status: "FAILED",
              mismatches: errorDetails,
            });
          } catch (dbError) {
            console.error(
              "Failed to update database with error status:",
              dbError,
            );
            // Still emit the error to frontend even if DB update fails
            ee.emit("statusChange", {
              submissionId,
              status: "FAILED",
              mismatches: errorDetails,
            });
          }
        }
      })();

      return { submissionId };
    }),

  status: publicProcedure
    .input(z.object({ submissionId: z.string().uuid() }))
    .subscription(({ input }) => {
      return observable<{ status: string; mismatches: unknown }>((emit) => {
        const onStatusChange = (data: {
          submissionId: string;
          status: string;
          mismatches: unknown;
        }) => {
          if (data.submissionId === input.submissionId) {
            emit.next({ status: data.status, mismatches: data.mismatches });
          }
        };

        ee.on("statusChange", onStatusChange);

        return () => {
          ee.off("statusChange", onStatusChange);
        };
      });
    }),
});
