import { useMutation } from "@apollo/client";
import { GENERATE_UPLOAD_URL } from "../graphql/mutations/auth";
import { useAuth } from "../context/AuthContext";

interface UploadResponse {
  success: boolean;
  fileUrl?: string;
  message?: string;
}

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const useFileUpload = () => {
  const [generateUploadUrl, { loading }] = useMutation(GENERATE_UPLOAD_URL);
  const { user } = useAuth();

  const uploadFile = async (
    file: File,
    _userId: string | undefined,
    _role: string | undefined
  ): Promise<UploadResponse> => {
    // Keep the legacy call signature while deliberately ignoring caller-supplied
    // identity; the authenticated server context is authoritative.
    void _userId;
    void _role;
    if (!file) return { success: false, message: "No file selected" };
    if (!user?.id || !user.role) {
      return { success: false, message: "You must be signed in to upload files" };
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      return { success: false, message: "Files must be smaller than 10 MB" };
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type.toLowerCase())) {
      return { success: false, message: "Only PDF, JPEG, PNG, and WebP files are allowed" };
    }

    try {
      // Step 1: Get pre-signed URL from backend
      const { data } = await generateUploadUrl({
        variables: {
          userId: user.id,
          role: user.role,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        },
      });

      if (!data?.generateUploadUrl?.uploadUrl) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = data.generateUploadUrl;

      // Step 2: Upload the file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }
      return { success: true, fileUrl };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  };

  return { uploadFile, isUploading: loading };
};
