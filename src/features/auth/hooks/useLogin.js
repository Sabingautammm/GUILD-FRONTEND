import { useState } from "react";
import { googleLogin } from "../services/authApi";
import { ApiError } from "../../../services/api/client";
import { useToast } from "../../../components/toast/ToastProvider";
import { useAuth } from "../context/AuthContext";

export function useLogin(onSuccess) {
  const toast = useToast();
  const { refresh } = useAuth();
  // Leaders sign in with Guild UID + password, not email
  const [values, setValues] = useState({ guildUid: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!/^\d+$/.test(values.guildUid.trim())) {
      errors.guildUid = "Guild UID must be numeric.";
    }
    if (!values.password) {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await toast.promise(googleLogin({ guildUid: values.guildUid.trim(), password: values.password }), {
        loading: "Signing in…",
        loadingDescription: "Verifying credentials",
        success: "Signed in",
        successDescription: "Welcome back, Leader!",
        error: (err) => (err instanceof ApiError ? err.message : "Something went wrong. Please try again."),
      });
      await refresh();
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { values, fieldErrors, isSubmitting, setField, handleSubmit };
}