import { BackButton, BackButtonProps } from "./BackButton";

export const BackButtonPresets = {
  // Simple back button with default styling
  Simple: (props: Omit<BackButtonProps, "variant" | "size">) => (
    <BackButton variant="default" size="md" {...props} />
  ),

  // Minimal back button for clean interfaces
  Minimal: (props: Omit<BackButtonProps, "variant">) => (
    <BackButton variant="minimal" {...props} />
  ),

  // Outline style for secondary actions
  Outline: (props: Omit<BackButtonProps, "variant">) => (
    <BackButton variant="outline" {...props} />
  ),

  // Small size for compact layouts
  Small: (props: Omit<BackButtonProps, "size">) => (
    <BackButton size="sm" {...props} />
  ),

  // Large size for prominent placement
  Large: (props: Omit<BackButtonProps, "size">) => (
    <BackButton size="lg" {...props} />
  ),
};
