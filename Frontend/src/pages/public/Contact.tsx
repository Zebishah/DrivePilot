import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, CircularProgress, TextField } from "@mui/material";
import { useMutation } from "@apollo/client";
import { CheckCircle2, HelpCircle, Mail, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { SEND_CONTACT_EMAIL } from "../../graphql/mutations/AdminContact";
import { useAuth } from "../../context/AuthContext";
import "./contact.css";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(120, "Use 120 characters or fewer"),
  email: z.string().trim().email("Enter a valid email address"),
  description: z
    .string()
    .trim()
    .min(1, "Tell us how we can help")
    .max(5000, "Use 5,000 characters or fewer"),
});
type ContactValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { user } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [sendMessage, { loading }] = useMutation(SEND_CONTACT_EMAIL);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: user?.email || "",
      description: "",
    },
  });

  const onSubmit = async (values: ContactValues) => {
    if (loading) return;
    setError(null);
    try {
      const { data } = await sendMessage({ variables: { input: values } });
      if (data?.sendContactEmail?.success) {
        setSentTo(values.email);
        reset({ ...values, description: "" });
        window.requestAnimationFrame(() => successRef.current?.focus());
      } else {
        setError("We couldn’t send your message. Your draft is still here. Please try again.");
      }
    } catch {
      setError(
        "We couldn’t send your message. Your draft is still here. Please try again.",
      );
    }
  };

  return (
    <div className="dsp-contact dsp-public-container">
      <header className="dsp-contact__header">
        <span className="dsp-public-eyebrow">HELP & SUPPORT</span>
        <h1>How can we help?</h1>
        <p>
          Ask about your account, driving lessons, or using Drive Pilot. Send a message
          and our support team will help you with the next step.
        </p>
      </header>
      <div className="dsp-contact__layout">
        <section
          className="dsp-contact__form"
          aria-labelledby="contact-form-title"
        >
          {sentTo ? (
            <div className="dsp-contact__success">
              <CheckCircle2 size={40} aria-hidden="true" />
              <h2 id="contact-form-title" tabIndex={-1} ref={successRef}>
                Your message has been sent
              </h2>
              <p>
                Our support team has received your message. We’ll reply to{" "}
                <strong>{sentTo}</strong>.
              </p>
              <Button variant="contained" onClick={() => setSentTo(null)}>
                Send another message
              </Button>
              <Link to="/">Return home</Link>
            </div>
          ) : (
            <>
              <h2 id="contact-form-title">Send us a message</h2>
              <p>
                All fields are required. Use an email address where we can reach
                you.
              </p>
              <form
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                aria-busy={loading}
              >
                {error && <Alert severity="error">{error}</Alert>}
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Your name"
                      autoComplete="name"
                      required
                      fullWidth
                      disabled={loading}
                      error={Boolean(errors.name)}
                      helperText={errors.name?.message}
                    />
                  )}
                />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email address"
                      type="email"
                      autoComplete="email"
                      required
                      fullWidth
                      disabled={loading}
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                    />
                  )}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Your message"
                      multiline
                      minRows={5}
                      required
                      fullWidth
                      disabled={loading}
                      error={Boolean(errors.description)}
                      helperText={
                        errors.description?.message ||
                        "For booking questions, include the lesson date and instructor’s name."
                      }
                    />
                  )}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Mail size={18} />
                    )
                  }
                >
                  {loading ? "Sending message…" : "Send message"}
                </Button>
              </form>
            </>
          )}
        </section>
        <aside
          className="dsp-contact__help"
          aria-label="Other ways to get help"
        >
          <HelpCircle size={28} aria-hidden="true" />
          <h2>A helpful place to start</h2>
          <p>
            Looking for an instructor? Browse profiles, compare lesson options,
            and explore availability.
          </p>
          <Link to="/professional">
            <Search size={16} aria-hidden="true" /> Find driving lessons
          </Link>
          <h3>Can’t sign in?</h3>
          <p>Request a password reset to get back into your account.</p>
          <Link to="/auth/forgot-password">Reset your password</Link>
          <h3>New to Drive Pilot?</h3>
          <p>Create an account to book lessons or start teaching.</p>
          <Link to="/auth/signup">Create an account</Link>
        </aside>
      </div>
    </div>
  );
}
