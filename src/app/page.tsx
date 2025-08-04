"use client";

import { useRef, useState, useEffect } from "react";
import { api as trpcApi } from "~/trpc/react";

export default function Home() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: submitCv } = trpcApi.cv.submit.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setSubmissionId(data.submissionId);
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
      setIsSubmitting(false);
      setStatus("FAILED");
      setMismatches({ error: error.message });
    },
  });

  trpcApi.cv.status.useSubscription(
    { submissionId: submissionId! },
    {
      enabled: !!submissionId,
      onData(data) {
        setStatus(data.status);
        setMismatches(data.mismatches);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    } else {
      setFile(null);
      setFileName(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setStatus("FAILED");
      setMismatches({ error: "Please select a PDF file." });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setStatus("FAILED");
      setMismatches({ error: "File size exceeds 5MB limit." });
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      // Get form data
      const formData = new FormData(e.currentTarget);
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
          CV Verifier
        </h1>
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
              className="rounded bg-white/20 px-3 py-2 text-white file:bg-white/20 file:text-white"
            />
            {fileName && (
              <span className="mt-1 text-xs text-green-200">
                Selected: {fileName}
              </span>
            )}
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        {status && (
          <div
            className={`mt-4 w-full max-w-md rounded p-4 text-center ${
              status === "SUCCESS"
                ? "bg-green-500/20 text-green-200"
                : status === "FAILED"
                ? "bg-red-500/20 text-red-200"
                : "bg-blue-500/20 text-blue-200"
            }`}
          >
            <p className="font-bold">Status: {status}</p>
            {status === "PROCESSING" && (
              <p className="animate-pulse">Your CV is being processed...</p>
            )}
            {status === "SUCCESS" && (
              <p>Your CV has been successfully verified!</p>
            )}
            {status === "FAILED" && mismatches && (
              <div className="mt-2 text-left">
                <p className="font-semibold">Details:</p>
                <pre className="mt-1 whitespace-pre-wrap rounded bg-black/20 p-2 text-sm">
                  {JSON.stringify(mismatches, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
