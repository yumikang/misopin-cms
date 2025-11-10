import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant, duration }: ToastOptions) => {
    const message = title || description || "";
    const desc = title && description ? description : undefined;

    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: desc,
        duration: duration || 4000,
      });
    } else {
      sonnerToast.success(message, {
        description: desc,
        duration: duration || 3000,
      });
    }
  };

  return { toast };
}
