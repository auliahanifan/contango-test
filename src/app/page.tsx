"use client";

import { useRef, useState } from "react";
import { api as trpcApi } from "~/trpc/react";

export default function Home() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<Record<string, unknown> | null>(
    null,
  );
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: submitCv } = trpcApi.cv.submit.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setSubmissionId(data.submissionId);
      setStatus("PROCESSING");
      setProcessingStartTime(Date.now());
      // Reset form
      setSkills([]);
      setSkillInput("");
      setFileName(null);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      console.error("CV submission failed:", error);
      setIsSubmitting(false);
      setStatus("FAILED");
      setMismatches({
        error:
          "Failed to upload your CV. Please check your internet connection and try again.",
      });
    },
  });

  trpcApi.cv.status.useSubscription(
    { submissionId: submissionId! },
    {
      enabled: !!submissionId,
      onData(data) {
        setStatus(data.status);
        setMismatches(data.mismatches as Record<string, unknown> | null);
        if (data.status !== "PROCESSING") {
          setProcessingStartTime(null);
        }
      },
    },
  );

  function handleAddSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  }

  function handleRemoveSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function formatUserFriendlyError(
    mismatches: Record<string, unknown> | null,
  ): string {
    if (!mismatches) return "";

    // Handle simple error messages
    if (mismatches.error && typeof mismatches.error === "string") {
      return mismatches.error;
    }

    // Handle validation mismatches
    const errors: string[] = [];

    if (mismatches.fullName) {
      errors.push(`• Your name doesn't appear to match what's in your CV`);
    }

    if (mismatches.skills) {
      errors.push(`• Some skills you listed don't appear in your CV`);
    }

    if (mismatches.email) {
      errors.push(`• Your email doesn't match what's in your CV`);
    }

    if (mismatches.phone) {
      errors.push(`• Your phone number doesn't match what's in your CV`);
    }

    if (mismatches.experience) {
      errors.push(
        `• Your experience description doesn't match your CV content`,
      );
    }

    if (errors.length > 0) {
      return `We found some differences between your form and CV:\n\n${errors.join("\n")}\n\nPlease check your CV and form entries match exactly.`;
    }

    return "There was an issue validating your CV. Please try again or contact support if the problem persists.";
  }

  function getProcessingMessage(): string {
    if (!processingStartTime) return "Processing your CV...";

    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);

    if (elapsed < 10) {
      return "Analyzing your CV...";
    } else if (elapsed < 30) {
      return "Comparing your details with CV content...";
    } else if (elapsed < 60) {
      return "Almost done! Finalizing validation...";
    } else {
      return "This is taking longer than usual. Please wait a moment...";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Clear any previous status when selecting a new file
      if (status) {
        setStatus(null);
        setMismatches(null);
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);

      // Immediate validation feedback
      if (!selectedFile.type.includes("pdf")) {
        setStatus("FAILED");
        setMismatches({ error: "Please select a PDF file only." });
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
        setStatus("FAILED");
        setMismatches({ error: `File size (${sizeMB}MB) exceeds 5MB limit.` });
        return;
      }
    } else {
      setFile(null);
      setFileName(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setStatus("FAILED");
      setMismatches({ error: "Please select a PDF file before submitting." });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setStatus("FAILED");
      setMismatches({
        error: `File size (${sizeMB}MB) exceeds the 5MB limit. Please choose a smaller PDF file.`,
      });
      return;
    }

    // Check file type
    if (!file.type.includes("pdf")) {
      setStatus("FAILED");
      setMismatches({
        error:
          "Please upload a PDF file only. Other file types are not supported.",
      });
      return;
    }

    // Capture form element before async operation
    const formElement = e.currentTarget;

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      // Debug logging
      console.log("Form element:", formElement);
      console.log("Form element type:", typeof formElement);
      console.log(
        "Is HTMLFormElement:",
        formElement instanceof HTMLFormElement,
      );

      // Validate form element before creating FormData
      if (!formElement || !(formElement instanceof HTMLFormElement)) {
        console.error("Invalid form element for FormData construction");
        setIsSubmitting(false);
        setStatus("FAILED");
        setMismatches({ error: "Form validation error. Please try again." });
        return;
      }

      // Get form data
      const formData = new FormData(formElement);
      const fullName = formData.get("fullName") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const experience = formData.get("experience") as string;

      setIsSubmitting(true);
      setSubmissionId(null);
      setStatus(null);
      setMismatches(null);

      submitCv({
        fullName,
        email,
        phone,
        skills,
        experience,
        pdfBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-center text-4xl font-extrabold tracking-tight">
          CV Verifier by Aulia Hanifan
        </h1>

        {status && (
          <div
            className={`mt-4 w-full max-w-md rounded-lg p-6 ${
              status === "SUCCESS"
                ? "border border-green-500/30 bg-green-500/20"
                : status === "FAILED"
                  ? "border border-red-500/30 bg-red-500/20"
                  : "border border-blue-500/30 bg-blue-500/20"
            }`}
          >
            {status === "PROCESSING" && (
              <div className="text-center text-blue-200">
                <div className="mb-3 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-transparent"></div>
                </div>
                <p className="mb-2 text-lg font-semibold">Processing Your CV</p>
                <p className="text-sm opacity-90">{getProcessingMessage()}</p>
                <p className="mt-3 text-xs opacity-75">
                  This usually takes 30-60 seconds
                </p>
              </div>
            )}

            {status === "SUCCESS" && (
              <div className="text-center text-green-200">
                <div className="mb-3 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="mb-2 text-lg font-bold">
                  ✅ CV Successfully Verified!
                </p>
                <p className="text-sm opacity-90">
                  Your CV matches all the information you provided. Great job!
                </p>
                <button
                  onClick={() => {
                    setStatus(null);
                    setSubmissionId(null);
                    setMismatches(null);
                  }}
                  className="mt-4 rounded-full bg-green-600/30 px-4 py-2 text-sm font-medium transition hover:bg-green-600/40"
                >
                  Submit Another CV
                </button>
              </div>
            )}

            {status === "FAILED" && (
              <div className="text-red-200">
                <div className="mb-3 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="mb-3 text-center text-lg font-bold">
                  ❌ Validation Failed
                </p>
                <div className="text-sm">
                  <p className="leading-relaxed whitespace-pre-line">
                    {formatUserFriendlyError(mismatches)}
                  </p>
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setStatus(null);
                      setSubmissionId(null);
                      setMismatches(null);
                    }}
                    className="rounded-full bg-red-600/30 px-4 py-2 text-sm font-medium transition hover:bg-red-600/40"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <form
          className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white/10 p-6"
          onSubmit={handleSubmit}
        >
          <label className="flex flex-col gap-1">
            Full Name
            <input
              type="text"
              name="fullName"
              required
              className="rounded bg-white/20 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded bg-white/20 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            Phone
            <input
              type="tel"
              name="phone"
              required
              className="rounded bg-white/20 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            Skills
            <div className="mb-1 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1"
                >
                  {skill}
                  <button
                    type="button"
                    className="ml-1 text-xs text-red-300 hover:text-red-500"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              placeholder="Type a skill and press Enter"
              className="rounded bg-white/20 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            Experience
            <textarea
              name="experience"
              required
              rows={4}
              className="rounded bg-white/20 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            CV PDF (max 5MB)
            <input
              type="file"
              accept="application/pdf"
              required
              ref={fileInputRef}
              onChange={handleFileChange}
              className="rounded bg-white/20 px-3 py-2 text-white file:mr-2 file:rounded file:border-0 file:bg-white/20 file:text-white"
            />
            {fileName && (
              <span className="mt-1 flex items-center gap-1 text-xs text-green-200">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Selected: {fileName}
              </span>
            )}
            <span className="text-xs text-white/60">
              Upload a PDF file containing your CV (maximum 5MB)
            </span>
          </label>
          <button
            type="submit"
            disabled={isSubmitting || status === "PROCESSING"}
            className={`flex items-center justify-center gap-2 rounded-full px-10 py-3 font-semibold transition ${
              isSubmitting || status === "PROCESSING"
                ? "cursor-not-allowed bg-white/5 text-white/50"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {(isSubmitting || status === "PROCESSING") && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"></div>
            )}
            {isSubmitting
              ? "Uploading..."
              : status === "PROCESSING"
                ? "Processing..."
                : "Verify My CV"}
          </button>

          {(isSubmitting || status === "PROCESSING") && (
            <p className="mt-2 text-center text-sm text-white/70">
              {isSubmitting
                ? "Uploading your CV..."
                : "Please wait while we validate your CV"}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
